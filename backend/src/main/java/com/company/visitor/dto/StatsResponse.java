package com.company.visitor.dto;

/**
 * Today's overview.
 *
 * <p>{@code total/pending/confirmed/left/rejected/forcedOut} count visitors whose entry date is
 * today, grouped by their current status. {@code onSite} is everyone currently CONFIRMED (any
 * entry date) and {@code badgeOutstanding} is every badge that has been issued but not returned.
 */
public record StatsResponse(
        String date,
        long total,
        long pending,
        long confirmed,
        long onSite,
        long left,
        long rejected,
        long forcedOut,
        long badgeOutstanding) {
}
