package com.company.visitor.model;

/**
 * A visitor record. Times are ISO-8601 local date-time strings (yyyy-MM-dd'T'HH:mm:ss)
 * because SQLite stores them as TEXT and the API contract exposes them as strings.
 */
public record Visitor(
        Long id,
        String name,
        String phone,
        String organization,
        String hostName,
        String purpose,
        String entryTime,
        String status,
        String leaveTime,
        String badgeNo,
        boolean badgeReturned,
        String companion,
        String note,
        String createdAt,
        String updatedAt) {
}
