package com.company.visitor.service;

import com.company.visitor.domain.Visitor;
import com.company.visitor.domain.VisitorStatus;
import com.company.visitor.dto.StatsResponse;
import com.company.visitor.dto.VisitorCreateRequest;
import com.company.visitor.exception.ConflictException;
import com.company.visitor.exception.NotFoundException;
import com.company.visitor.repository.VisitorRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class VisitorService {

    private final VisitorRepository repository;

    public VisitorService(VisitorRepository repository) {
        this.repository = repository;
    }

    public Visitor create(VisitorCreateRequest request) {
        LocalDateTime now = LocalDateTime.now().withNano(0);
        long id = repository.insert(
                request.name().trim(),
                request.phone().trim(),
                request.company().trim(),
                request.hostName().trim(),
                request.purpose().trim(),
                request.entryTime().withNano(0),
                now);
        return require(id);
    }

    public List<Visitor> list(VisitorStatus status, String keyword, LocalDate date) {
        return repository.search(status, keyword, date);
    }

    public Visitor get(long id) {
        return require(id);
    }

    public Visitor approve(long id) {
        Visitor visitor = require(id);
        if (visitor.status() != VisitorStatus.PENDING) {
            throw new ConflictException("访客当前状态为 " + visitor.status() + "，只有待确认的访客可以确认进入");
        }
        LocalDateTime now = LocalDateTime.now().withNano(0);
        if (repository.markApproved(id, now) == 0) {
            throw new ConflictException("访客状态已变化，请刷新后重试");
        }
        return require(id);
    }

    public Visitor reject(long id, String reason) {
        Visitor visitor = require(id);
        if (visitor.status() != VisitorStatus.PENDING) {
            throw new ConflictException("访客当前状态为 " + visitor.status() + "，只有待确认的访客可以拒绝");
        }
        String trimmedReason = reason == null ? null : reason.trim();
        if (trimmedReason != null && trimmedReason.isEmpty()) {
            trimmedReason = null;
        }
        LocalDateTime now = LocalDateTime.now().withNano(0);
        if (repository.markRejected(id, trimmedReason, now) == 0) {
            throw new ConflictException("访客状态已变化，请刷新后重试");
        }
        return require(id);
    }

    public Visitor checkout(long id, Boolean badgeReturned) {
        Visitor visitor = require(id);
        if (visitor.status() != VisitorStatus.APPROVED) {
            throw new ConflictException("访客当前状态为 " + visitor.status() + "，只有在访（已确认）的访客可以登记离开");
        }
        boolean returned = badgeReturned != null && badgeReturned;
        LocalDateTime now = LocalDateTime.now().withNano(0);
        if (repository.markLeft(id, returned, now) == 0) {
            throw new ConflictException("访客状态已变化，请刷新后重试");
        }
        return require(id);
    }

    public StatsResponse stats() {
        LocalDate today = LocalDate.now();
        Map<String, Object> counts = repository.countsForDate(today);
        long total = asLong(counts.get("total"));
        long pending = asLong(counts.get("pending"));
        long approved = asLong(counts.get("approved"));
        long left = asLong(counts.get("left_count"));
        long rejected = asLong(counts.get("rejected"));
        return new StatsResponse(today.toString(), total, pending, approved, approved, left, rejected);
    }

    private Visitor require(long id) {
        return repository.findById(id)
                .orElseThrow(() -> new NotFoundException("访客不存在：" + id));
    }

    private static long asLong(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
    }
}
