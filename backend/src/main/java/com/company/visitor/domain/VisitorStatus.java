package com.company.visitor.domain;

/**
 * Visitor lifecycle:
 * PENDING -> APPROVED / REJECTED
 * APPROVED -> LEFT
 */
public enum VisitorStatus {
    PENDING,
    APPROVED,
    REJECTED,
    LEFT
}
