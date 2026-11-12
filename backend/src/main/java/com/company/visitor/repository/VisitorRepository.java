package com.company.visitor.repository;

import com.company.visitor.model.Visitor;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class VisitorRepository {

    private static final String COLUMNS = "id, name, phone, organization, host_name, purpose, "
            + "entry_time, status, leave_time, badge_no, badge_returned, companion, note, "
            + "created_at, updated_at";

    private static final RowMapper<Visitor> ROW_MAPPER = (rs, rowNum) -> new Visitor(
            rs.getLong("id"),
            rs.getString("name"),
            rs.getString("phone"),
            rs.getString("organization"),
            rs.getString("host_name"),
            rs.getString("purpose"),
            rs.getString("entry_time"),
            rs.getString("status"),
            rs.getString("leave_time"),
            rs.getString("badge_no"),
            rs.getInt("badge_returned") != 0,
            rs.getString("companion"),
            rs.getString("note"),
            rs.getString("created_at"),
            rs.getString("updated_at"));

    private final JdbcTemplate jdbc;

    public VisitorRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long insert(Visitor visitor) {
        String sql = "INSERT INTO visitors (name, phone, organization, host_name, purpose, "
                + "entry_time, status, badge_returned, note, created_at, updated_at) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, visitor.name());
            ps.setString(2, visitor.phone());
            ps.setString(3, visitor.organization());
            ps.setString(4, visitor.hostName());
            ps.setString(5, visitor.purpose());
            ps.setString(6, visitor.entryTime());
            ps.setString(7, visitor.status());
            ps.setInt(8, visitor.badgeReturned() ? 1 : 0);
            ps.setString(9, visitor.note());
            ps.setString(10, visitor.createdAt());
            ps.setString(11, visitor.updatedAt());
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        if (key != null) {
            return key.longValue();
        }
        Long fallback = jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
        return fallback == null ? -1L : fallback;
    }

    public Optional<Visitor> findById(long id) {
        List<Visitor> rows = jdbc.query("SELECT " + COLUMNS + " FROM visitors WHERE id = ?",
                ROW_MAPPER, id);
        return rows.stream().findFirst();
    }

    public List<Visitor> findAll(String status, String date, String keyword) {
        StringBuilder sql = new StringBuilder("SELECT " + COLUMNS + " FROM visitors WHERE 1 = 1");
        List<Object> params = new ArrayList<>();
        if (status != null) {
            sql.append(" AND status = ?");
            params.add(status);
        }
        if (date != null) {
            sql.append(" AND substr(entry_time, 1, 10) = ?");
            params.add(date);
        }
        if (keyword != null) {
            String pattern = "%" + escapeLike(keyword) + "%";
            sql.append(" AND (name LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\'")
                    .append(" OR COALESCE(organization, '') LIKE ? ESCAPE '\\'")
                    .append(" OR host_name LIKE ? ESCAPE '\\')");
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
        }
        sql.append(" ORDER BY entry_time DESC, id DESC");
        return jdbc.query(sql.toString(), ROW_MAPPER, params.toArray());
    }

    public void confirm(long id, String badgeNo, String companion, String updatedAt) {
        jdbc.update("UPDATE visitors SET status = 'CONFIRMED', badge_no = ?, companion = ?, "
                + "updated_at = ? WHERE id = ?", badgeNo, companion, updatedAt, id);
    }

    public void reject(long id, String note, String updatedAt) {
        jdbc.update("UPDATE visitors SET status = 'REJECTED', note = ?, updated_at = ? WHERE id = ?",
                note, updatedAt, id);
    }

    public void checkout(long id, String leaveTime, boolean badgeReturned, String updatedAt) {
        jdbc.update("UPDATE visitors SET status = 'LEFT', leave_time = ?, badge_returned = ?, "
                + "updated_at = ? WHERE id = ?", leaveTime, badgeReturned ? 1 : 0, updatedAt, id);
    }

    public void forceLeave(long id, String leaveTime, String note, String updatedAt) {
        jdbc.update("UPDATE visitors SET status = 'FORCED_OUT', leave_time = ?, note = ?, "
                + "updated_at = ? WHERE id = ?", leaveTime, note, updatedAt, id);
    }

    public long nextBadgeSequence(String badgePrefix) {
        Long max = jdbc.queryForObject(
                "SELECT COALESCE(MAX(CAST(SUBSTR(badge_no, ?) AS INTEGER)), 0) FROM visitors "
                        + "WHERE badge_no LIKE ? ESCAPE '\\'",
                Long.class, badgePrefix.length() + 1, escapeLike(badgePrefix) + "%");
        return max == null ? 0L : max;
    }

    public Map<String, Long> countByStatusForDate(String date) {
        return jdbc.query(
                "SELECT status, COUNT(*) AS total FROM visitors "
                        + "WHERE substr(entry_time, 1, 10) = ? GROUP BY status",
                rs -> {
                    Map<String, Long> counts = new HashMap<>();
                    while (rs.next()) {
                        counts.put(rs.getString("status"), rs.getLong("total"));
                    }
                    return counts;
                },
                date);
    }

    public long countOnSite() {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM visitors WHERE status = 'CONFIRMED'", Long.class);
        return count == null ? 0L : count;
    }

    public long countBadgeOutstanding() {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM visitors WHERE badge_no IS NOT NULL AND badge_returned = 0",
                Long.class);
        return count == null ? 0L : count;
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
