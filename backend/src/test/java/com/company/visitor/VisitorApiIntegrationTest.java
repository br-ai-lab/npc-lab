package com.company.visitor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class VisitorApiIntegrationTest {

    @TempDir
    static Path tempDir;

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("app.database.path", () -> tempDir.resolve("visitor-test.db").toString());
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void healthEndpointReturnsUp() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void registerApproveCheckoutFlow() throws Exception {
        JsonNode baseline = stats();

        JsonNode created = createVisitor("张三", "13800138000", "某某科技有限公司", "李四", "商务洽谈",
                LocalDateTime.now().withNano(0).toString());
        long id = created.get("id").asLong();
        assertThat(created.get("status").asText()).isEqualTo("PENDING");
        assertThat(created.get("approvedAt").isNull()).isTrue();

        assertListContains(list("/api/visitors?keyword=张三"), id);
        assertListContains(list("/api/visitors?keyword=某某科技"), id);
        assertListContains(list("/api/visitors?keyword=李四"), id);

        mockMvc.perform(post("/api/visitors/{id}/approve", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.approvedAt").isNotEmpty());

        mockMvc.perform(post("/api/visitors/{id}/approve", id))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/api/visitors/{id}/checkout", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"badgeReturned\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LEFT"))
                .andExpect(jsonPath("$.leaveTime").isNotEmpty())
                .andExpect(jsonPath("$.badgeReturned").value(true));

        mockMvc.perform(post("/api/visitors/{id}/checkout", id))
                .andExpect(status().isConflict());

        JsonNode after = stats();
        assertThat(after.get("total").asLong()).isEqualTo(baseline.get("total").asLong() + 1);
        assertThat(after.get("left").asLong()).isEqualTo(baseline.get("left").asLong() + 1);
        assertThat(after.get("inVisit").asLong()).isEqualTo(baseline.get("inVisit").asLong());
        assertThat(after.get("pending").asLong()).isEqualTo(baseline.get("pending").asLong());
    }

    @Test
    void rejectFlowStoresReasonAndBlocksFurtherTransitions() throws Exception {
        JsonNode created = createVisitor("王五", "13900139000", "供应商A", "赵六", "设备维修", "2026-03-01T09:00:00");
        long id = created.get("id").asLong();

        mockMvc.perform(post("/api/visitors/{id}/reject", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"未预约，改期再来\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectReason").value("未预约，改期再来"));

        mockMvc.perform(post("/api/visitors/{id}/approve", id))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/api/visitors/{id}/checkout", id))
                .andExpect(status().isConflict());
    }

    @Test
    void missingRequiredFieldsReturn400WithFieldErrors() throws Exception {
        mockMvc.perform(post("/api/visitors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("参数校验失败"))
                .andExpect(jsonPath("$.fieldErrors.name").isNotEmpty())
                .andExpect(jsonPath("$.fieldErrors.phone").isNotEmpty())
                .andExpect(jsonPath("$.fieldErrors.company").isNotEmpty())
                .andExpect(jsonPath("$.fieldErrors.hostName").isNotEmpty())
                .andExpect(jsonPath("$.fieldErrors.purpose").isNotEmpty())
                .andExpect(jsonPath("$.fieldErrors.entryTime").isNotEmpty());
    }

    @Test
    void invalidPhoneAndTimeReturn400() throws Exception {
        mockMvc.perform(post("/api/visitors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"张三\",\"phone\":\"abc\",\"company\":\"单位\",\"hostName\":\"李四\","
                                + "\"purpose\":\"洽谈\",\"entryTime\":\"2026-01-15T09:00:00\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.phone").isNotEmpty());

        mockMvc.perform(post("/api/visitors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"张三\",\"phone\":\"13800138000\",\"company\":\"单位\",\"hostName\":\"李四\","
                                + "\"purpose\":\"洽谈\",\"entryTime\":\"not-a-time\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void unknownVisitorReturns404() throws Exception {
        mockMvc.perform(get("/api/visitors/{id}", 999_999))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("访客不存在：999999"));
    }

    @Test
    void listFiltersByStatusAndDate() throws Exception {
        JsonNode created = createVisitor("钱七", "13700137000", "测试单位", "孙八", "面试",
                "2026-02-20T14:30:00");
        long id = created.get("id").asLong();

        assertListContains(list("/api/visitors?date=2026-02-20"), id);
        assertListContains(list("/api/visitors?date=2026-02-20&status=PENDING"), id);
        assertListDoesNotContain(list("/api/visitors?date=2026-02-20&status=REJECTED"), id);

        mockMvc.perform(get("/api/visitors").param("status", "NOT_A_STATUS"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/visitors").param("date", "2026-99-99"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void corsPreflightAllowsFrontendOrigin() throws Exception {
        mockMvc.perform(options("/api/visitors")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }

    private JsonNode createVisitor(String name, String phone, String company, String hostName,
                                   String purpose, String entryTime) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("name", name);
        payload.put("phone", phone);
        payload.put("company", company);
        payload.put("hostName", hostName);
        payload.put("purpose", purpose);
        payload.put("entryTime", entryTime);
        MvcResult result = mockMvc.perform(post("/api/visitors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private JsonNode list(String url) throws Exception {
        MvcResult result = mockMvc.perform(get(url))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private JsonNode stats() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/visitors/stats"))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private static void assertListContains(JsonNode array, long id) {
        assertThat(containsId(array, id)).as("list should contain visitor %s", id).isTrue();
    }

    private static void assertListDoesNotContain(JsonNode array, long id) {
        assertThat(containsId(array, id)).as("list should not contain visitor %s", id).isFalse();
    }

    private static boolean containsId(JsonNode array, long id) {
        for (JsonNode node : array) {
            if (node.get("id").asLong() == id) {
                return true;
            }
        }
        return false;
    }
}
