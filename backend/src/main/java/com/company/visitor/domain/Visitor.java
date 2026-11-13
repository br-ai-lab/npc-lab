package com.company.visitor.domain;

import java.time.LocalDateTime;

public record Visitor(
        long id,
        String name,
        String phone,
        String company,
        String hostName,
        String purpose,
        LocalDateTime entryTime,
        VisitorStatus status,
        LocalDateTime leaveTime,
        Boolean badgeReturned,
        LocalDateTime approvedAt,
        String rejectReason,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
