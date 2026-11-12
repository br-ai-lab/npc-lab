package com.company.visitor.model;

import java.util.Locale;

public enum VisitorStatus {
    PENDING,
    CONFIRMED,
    REJECTED,
    LEFT,
    FORCED_OUT;

    public static VisitorStatus parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "无效的状态值: " + raw + "，可选值: PENDING, CONFIRMED, REJECTED, LEFT, FORCED_OUT");
        }
    }

    public boolean isFinished() {
        return this == REJECTED || this == LEFT || this == FORCED_OUT;
    }
}
