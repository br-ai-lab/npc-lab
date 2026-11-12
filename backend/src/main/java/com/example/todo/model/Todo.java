package com.example.todo.model;

import java.time.Instant;

/**
 * A TODO item stored in memory for Stage 1.
 */
public record Todo(long id, String title, boolean done, Instant createdAt) {
}
