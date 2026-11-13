package com.company.visitor.repository;

import com.company.visitor.domain.Visitor;
import com.company.visitor.domain.VisitorStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class VisitorRepository {

    private static final String COLUMNS = "id, name, phone, company, host_name, purpose, entry_time, "
            + "status, leave_time, badge_returned, approved_at, reject_reason, created_at, updated_at";

    private static final DateTimeFormatter DB_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final JdbcTemplate jdbcTemplate;

    public VisitorRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public long insert(String name, String phone, String company, String hostName, String purpose,
                       LocalDateTime entryTime, LocalDateTime now) {
        String sql = "INSERT INTO visitors (name, phone, company, host_name, purpose, entry_time, status, created_at, updated_at) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, name);
            ps.setString(2, phone);
            ps.setString(3, company);
            ps.setString(4, hostName);
            ps.setString(5, purpose);
            ps.setString(6, toDb(entryTime));
            ps.setString(7, VisitorStatus.PENDING.name());
            ps.setString(8, toDb(now));
            ps.setString(9, toDb(now));
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Failed to obtain generated id for visitor");
        }
        return key.longValue();
    }

    public Optional<Visitor> findById(long id) {
        List<Visitor> visitors = jdbcTemplate.query(
                "SELECT " + COLUMNS + " FROM visitors WHERE id = ?", this::mapRow, id);
        return visitors.stream().findFirst();
    }

    public List<Visitor> search(VisitorStatus status, String keyword, LocalDate date) {
        StringBuilder sql = new StringBuilder("SELECT " + COLUMNS + " FROM visitors WHERE 1 = 1");
        List<Object> args = new ArrayList<>();

        if (status != null) {
            sql.append(" AND status = ?");
            args.add(status.name());
        }
        if (keyword != null && !keyword.isBlank()) {
            String pattern = "%" + escapeLike(keyword.trim()) + "%";
            sql.append(" AND (name LIKE ? ESCAPE '\\' OR company LIKE ? ESCAPE '\\' OR host_name LIKE ? ESCAPE '\\')");
            args.add(pattern);
            args.add(pattern);
            args.add(pattern);
        }
        if (date != null) {
            sql.append(" AND substr(entry_time, 1, 10) = ?");
            args.add(date.toString());
        }
        sql.append(" ORDER BY entry_time DESC, id DESC");

        return jdbcTemplate.query(sql.toString(), this::mapRow, args.toArray());
    }

    public int markApproved(long id, LocalDateTime now) {
        return jdbcTemplate.update(
                "UPDATE visitors SET status = ?, approved_at = ?, updated_at = ? WHERE id = ? AND status = ?",
                VisitorStatus.APPROVED.name(), toDb(now), toDb(now), id, VisitorStatus.PENDING.name());
    }

    public int markRejected(long id, String reason, LocalDateTime now) {
        return jdbcTemplate.update(
                "UPDATE visitors SET status = ?, reject_reason = ?, updated_at = ? WHERE id = ? AND status = ?",
                VisitorStatus.REJECTED.name(), reason, toDb(now), id, VisitorStatus.PENDING.name());
    }

    public int markLeft(long id, boolean badgeReturned, LocalDateTime now) {
        return jdbcTemplate.update(
                "UPDATE visitors SET status = ?, leave_time = ?, badge_returned = ?, updated_at = ? "
                        + "WHERE id = ? AND status = ?",
                VisitorStatus.LEFT.name(), toDb(now), badgeReturned ? 1 : 0, toDb(now), id,
                VisitorStatus.APPROVED.name());
    }

    public Map<String, Object> countsForDate(LocalDate date) {
        return jdbcTemplate.queryForMap(
                "SELECT COUNT(*) AS total, "
                        + "COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) AS pending, "
                        + "COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END), 0) AS approved, "
                        + "COALESCE(SUM(CASE WHEN status = 'LEFT' THEN 1 ELSE 0 END), 0) AS left_count, "
                        + "COALESCE(SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END), 0) AS rejected "
                        + "FROM visitors WHERE substr(entry_time, 1, 10) = ?",
                date.toString());
    }

    private Visitor mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new Visitor(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("phone"),
                rs.getString("company"),
                rs.getString("host_name"),
                rs.getString("purpose"),
                fromDb(rs.getString("entry_time")),
                VisitorStatus.valueOf(rs.getString("status")),
                fromDb(rs.getString("leave_time")),
                toBoolean(rs.getObject("badge_returned")),
                fromDb(rs.getString("approved_at")),
                rs.getString("reject_reason"),
                fromDb(rs.getString("created_at")),
                fromDb(rs.getString("updated_at"))
        );
    }

    private static String toDb(LocalDateTime time) {
        return time == null ? null : time.format(DB_TIME);
    }

    private static LocalDateTime fromDb(String value) {
        return value == null ? null : LocalDateTime.parse(value);
    }

    private static Boolean toBoolean(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        return Boolean.valueOf(value.toString());
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
