package com.company.visitor.dto;

/**
 * Today's counters. {@code inVisit} (在访) and {@code approved} carry the same
 * value; both keys are returned so the frontend can use either name.
 */
public record StatsResponse(
        String date,
        long total,
        long pending,
        long inVisit,
        long approved,
        long left,
        long rejected
) {
}
