package com.company.visitor.dto;

import java.util.Map;

/**
 * Unified error body. {@code fieldErrors} is present for validation failures
 * and null for other errors.
 */
public record ErrorResponse(
        String timestamp,
        int status,
        String error,
        String message,
        Map<String, String> fieldErrors
) {
}
