package com.company.visitor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class VisitorApiTest {

    private static final Path TEST_DB_DIR = Path.of("target", "test-db");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        try {
            Files.createDirectories(TEST_DB_DIR);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create test database directory", e);
        }
        Path dbFile = TEST_DB_DIR.toAbsolutePath().resolve("visitor-test.db");
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + dbFile);
    }

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.update("DELETE FROM visitors");
    }

    @Test
    void registerConfirmCheckoutHappyPath() throws Exception {
        JsonNode created = createVisitor("张三", "13800138000", "某某科技有限公司",
                "李四", "业务洽谈", null);
        assertThat(created.get("status").asText()).isEqualTo("PENDING");
        assertThat(created.get("badgeNo").isNull()).isTrue();
        assertThat(created.get("entryTime").asText())
                .matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}");
        long id = created.get("id").asLong();

        JsonNode confirmed = postJson("/api/visitors/" + id + "/confirm",
                "{\"companion\":\"李四\"}", 200);
        assertThat(confirmed.get("status").asText()).isEqualTo("CONFIRMED");
        assertThat(confirmed.get("badgeNo").asText()).matches("V\\d{8}-\\d{3}");
        assertThat(confirmed.get("companion").asText()).isEqualTo("李四");

        JsonNode left = postJson("/api/visitors/" + id + "/checkout",
                "{\"badgeReturned\":true}", 200);
        assertThat(left.get("status").asText()).isEqualTo("LEFT");
        assertThat(left.get("leaveTime").isNull()).isFalse();
        assertThat(left.get("badgeReturned").asBoolean()).isTrue();
    }

    @Test
    void customEntryTimeIsPreserved() throws Exception {
        JsonNode created = createVisitor("王五", "021-12345678", null,
                "赵六", "设备维修", "2026-01-02T09:30:00");
        assertThat(created.get("entryTime").asText()).isEqualTo("2026-01-02T09:30:00");
        assertThat(created.get("organization").isNull()).isTrue();
    }

    @Test
    void invalidStatusTransitionsReturn409() throws Exception {
        long id = createVisitor("张三", "13800138000", "A公司", "李四", "面试", null)
                .get("id").asLong();

        postJson("/api/visitors/" + id + "/checkout", "{\"badgeReturned\":false}", 409);
        postJson("/api/visitors/" + id + "/force-leave", "{\"reason\":\"异常\"}", 409);
        postJson("/api/visitors/" + id + "/confirm", "{}", 200);
        postJson("/api/visitors/" + id + "/confirm", "{}", 409);
        postJson("/api/visitors/" + id + "/reject", "{}", 409);
        postJson("/api/visitors/" + id + "/checkout", "{\"badgeReturned\":false}", 200);
        postJson("/api/visitors/" + id + "/checkout", "{\"badgeReturned\":false}", 409);
        postJson("/api/visitors/" + id + "/force-leave", "{\"reason\":\"异常\"}", 409);
    }

    @Test
    void rejectAndForceLeaveAreRecorded() throws Exception {
        long rejectedId = createVisitor("张三", "13800138000", "A公司", "李四", "推销", null)
                .get("id").asLong();
        JsonNode rejected = postJson("/api/visitors/" + rejectedId + "/reject",
                "{\"reason\":\"无预约\"}", 200);
        assertThat(rejected.get("status").asText()).isEqualTo("REJECTED");
        assertThat(rejected.get("note").asText()).isEqualTo("无预约");

        long forcedId = createVisitor("王五", "13900139000", "B公司", "赵六", "维修", null)
                .get("id").asLong();
        postJson("/api/visitors/" + forcedId + "/confirm", "{}", 200);
        JsonNode forced = postJson("/api/visitors/" + forcedId + "/force-leave",
                "{\"reason\":\"拍摄内部资料\"}", 200);
        assertThat(forced.get("status").asText()).isEqualTo("FORCED_OUT");
        assertThat(forced.get("note").asText()).isEqualTo("拍摄内部资料");
        assertThat(forced.get("leaveTime").isNull()).isFalse();
    }

    @Test
    void validationErrorsReturn400WithFieldErrors() throws Exception {
        JsonNode error = postJson("/api/visitors", "{\"name\":\"\",\"phone\":\"abc\","
                + "\"hostName\":\"\",\"purpose\":\"\"}", 400);
        assertThat(error.get("status").asInt()).isEqualTo(400);
        assertThat(error.get("fieldErrors").get("name")).isNotNull();
        assertThat(error.get("fieldErrors").get("phone")).isNotNull();
        assertThat(error.get("fieldErrors").get("hostName")).isNotNull();
        assertThat(error.get("fieldErrors").get("purpose")).isNotNull();

        long id = createVisitor("张三", "13800138000", "A公司", "李四", "面试", null)
                .get("id").asLong();
        postJson("/api/visitors/" + id + "/checkout", "{}", 400);
        postJson("/api/visitors/" + id + "/force-leave", "{}", 400);
    }

    @Test
    void unknownVisitorReturns404() throws Exception {
        mockMvc.perform(get("/api/visitors/999999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void listFiltersAndTodayStats() throws Exception {
        long first = createVisitor("张三", "13800138000", "A公司", "李四", "业务洽谈", null)
                .get("id").asLong();
        createVisitor("王五", "13900139000", "B公司", "赵六", "设备维修", null);
        postJson("/api/visitors/" + first + "/confirm", "{}", 200);

        JsonNode confirmedList = getJson("/api/visitors?status=CONFIRMED");
        assertThat(confirmedList).hasSize(1);
        assertThat(confirmedList.get(0).get("id").asLong()).isEqualTo(first);

        MvcResult keywordResult = mockMvc.perform(get("/api/visitors").param("keyword", "王五"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode keywordList = readJson(keywordResult);
        assertThat(keywordList).hasSize(1);
        assertThat(keywordList.get(0).get("name").asText()).isEqualTo("王五");

        String today = LocalDate.now().toString();
        assertThat(getJson("/api/visitors?date=" + today)).hasSize(2);

        JsonNode stats = getJson("/api/stats/today");
        assertThat(stats.get("date").asText()).isEqualTo(today);
        assertThat(stats.get("total").asLong()).isEqualTo(2);
        assertThat(stats.get("pending").asLong()).isEqualTo(1);
        assertThat(stats.get("confirmed").asLong()).isEqualTo(1);
        assertThat(stats.get("onSite").asLong()).isEqualTo(1);
        assertThat(stats.get("badgeOutstanding").asLong()).isEqualTo(1);

        postJson("/api/visitors/" + first + "/checkout", "{\"badgeReturned\":true}", 200);
        JsonNode after = getJson("/api/stats/today");
        assertThat(after.get("left").asLong()).isEqualTo(1);
        assertThat(after.get("onSite").asLong()).isZero();
        assertThat(after.get("badgeOutstanding").asLong()).isZero();
    }

    @Test
    void invalidQueryParametersReturn400() throws Exception {
        getJson("/api/visitors?status=NOT_A_STATUS", 400);
        getJson("/api/visitors?date=2026-13-99", 400);
    }

    @Test
    void healthEndpointIsOk() throws Exception {
        JsonNode health = getJson("/api/health");
        assertThat(health.get("status").asText()).isEqualTo("ok");
    }

    private JsonNode createVisitor(String name, String phone, String organization,
            String hostName, String purpose, String entryTime) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("name", name);
        payload.put("phone", phone);
        if (organization != null) {
            payload.put("organization", organization);
        }
        payload.put("hostName", hostName);
        payload.put("purpose", purpose);
        if (entryTime != null) {
            payload.put("entryTime", entryTime);
        }
        JsonNode created = postJson("/api/visitors", objectMapper.writeValueAsString(payload), 201);
        assertThat(created.get("id").asLong()).isPositive();
        return created;
    }

    private JsonNode postJson(String url, String body, int expectedStatus) throws Exception {
        MvcResult result = mockMvc.perform(post(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().is(expectedStatus))
                .andReturn();
        return readJson(result);
    }

    private JsonNode getJson(String url) throws Exception {
        return getJson(url, 200);
    }

    private JsonNode getJson(String url, int expectedStatus) throws Exception {
        MvcResult result = mockMvc.perform(get(url))
                .andExpect(status().is(expectedStatus))
                .andReturn();
        return readJson(result);
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        String body = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readTree(body);
    }
}
