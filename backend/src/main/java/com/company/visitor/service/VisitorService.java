package com.company.visitor.service;

import com.company.visitor.dto.CreateVisitorRequest;
import com.company.visitor.dto.StatsResponse;
import com.company.visitor.error.ApiException;
import com.company.visitor.model.Visitor;
import com.company.visitor.model.VisitorStatus;
import com.company.visitor.repository.VisitorRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VisitorService {

    /** Storage/response format: ISO-8601 local date-time with second precision. */
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final DateTimeFormatter BADGE_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ISO_LOCAL_DATE;

    private final VisitorRepository repository;

    public VisitorService(VisitorRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public Visitor create(CreateVisitorRequest request) {
        LocalDateTime now = LocalDateTime.now().withNano(0);
        String entryTime = request.entryTime() == null
                ? format(now)
                : format(request.entryTime().withNano(0));
        Visitor visitor = new Visitor(
                null,
                trimToNull(request.name()),
                trimToNull(request.phone()),
                trimToNull(request.organization()),
                trimToNull(request.hostName()),
                trimToNull(request.purpose()),
                entryTime,
                VisitorStatus.PENDING.name(),
                null,
                null,
                false,
                null,
                trimToNull(request.note()),
                format(now),
                format(now));
        long id = repository.insert(visitor);
        return getById(id);
    }

    @Transactional(readOnly = true)
    public Visitor getById(long id) {
        return repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("访客记录不存在: " + id));
    }

    @Transactional(readOnly = true)
    public List<Visitor> list(String statusRaw, String dateRaw, String keywordRaw) {
        VisitorStatus status;
        try {
            status = VisitorStatus.parse(statusRaw);
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest(e.getMessage());
        }
        String date = trimToNull(dateRaw);
        if (date != null) {
            try {
                LocalDate.parse(date, DATE);
            } catch (DateTimeParseException e) {
                throw ApiException.badRequest("date 参数格式应为 YYYY-MM-DD");
            }
        }
        String keyword = trimToNull(keywordRaw);
        return repository.findAll(status == null ? null : status.name(), date, keyword);
    }

    @Transactional
    public synchronized Visitor confirm(long id, String companion) {
        Visitor visitor = getById(id);
        requireStatus(visitor, VisitorStatus.PENDING, "只有待确认（PENDING）状态的访客可以确认");
        String now = formatNow();
        String badgeNo = nextBadgeNo();
        repository.confirm(id, badgeNo, trimToNull(companion), now);
        return getById(id);
    }

    @Transactional
    public Visitor reject(long id, String reason) {
        Visitor visitor = getById(id);
        requireStatus(visitor, VisitorStatus.PENDING, "只有待确认（PENDING）状态的访客可以拒绝");
        repository.reject(id, trimToNull(reason), formatNow());
        return getById(id);
    }

    @Transactional
    public Visitor checkout(long id, boolean badgeReturned) {
        Visitor visitor = getById(id);
        requireStatus(visitor, VisitorStatus.CONFIRMED, "只有在访（CONFIRMED）状态的访客可以登记离场");
        String now = formatNow();
        repository.checkout(id, now, badgeReturned, now);
        return getById(id);
    }

    @Transactional
    public Visitor forceLeave(long id, String reason) {
        Visitor visitor = getById(id);
        requireStatus(visitor, VisitorStatus.CONFIRMED, "只有在访（CONFIRMED）状态的访客可以强制离场");
        String now = formatNow();
        repository.forceLeave(id, now, trimToNull(reason), now);
        return getById(id);
    }

    @Transactional(readOnly = true)
    public StatsResponse todayStats() {
        String date = LocalDate.now().format(DATE);
        Map<String, Long> counts = repository.countByStatusForDate(date);
        long pending = counts.getOrDefault(VisitorStatus.PENDING.name(), 0L);
        long confirmed = counts.getOrDefault(VisitorStatus.CONFIRMED.name(), 0L);
        long left = counts.getOrDefault(VisitorStatus.LEFT.name(), 0L);
        long rejected = counts.getOrDefault(VisitorStatus.REJECTED.name(), 0L);
        long forcedOut = counts.getOrDefault(VisitorStatus.FORCED_OUT.name(), 0L);
        long total = counts.values().stream().mapToLong(Long::longValue).sum();
        return new StatsResponse(
                date,
                total,
                pending,
                confirmed,
                repository.countOnSite(),
                left,
                rejected,
                forcedOut,
                repository.countBadgeOutstanding());
    }

    private String nextBadgeNo() {
        String prefix = "V" + LocalDate.now().format(BADGE_DATE) + "-";
        long sequence = repository.nextBadgeSequence(prefix) + 1;
        return prefix + String.format(Locale.ROOT, "%03d", sequence);
    }

    private static void requireStatus(Visitor visitor, VisitorStatus expected, String message) {
        if (!expected.name().equals(visitor.status())) {
            throw ApiException.conflict(message + "，当前状态: " + visitor.status());
        }
    }

    private static String formatNow() {
        return format(LocalDateTime.now().withNano(0));
    }

    private static String format(LocalDateTime value) {
        return DATE_TIME.format(value);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
