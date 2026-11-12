package com.example.todo.service;

import com.example.todo.model.Todo;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

/**
 * In-memory TODO storage. Stage 1 deliberately avoids a database.
 */
@Service
public class TodoService {

    private final AtomicLong idGenerator = new AtomicLong(0);
    private final List<Todo> todos = new ArrayList<>();

    public synchronized Todo create(String title) {
        Todo todo = new Todo(idGenerator.incrementAndGet(), title.trim(), false, Instant.now());
        todos.add(todo);
        return todo;
    }

    public synchronized List<Todo> findAll() {
        return List.copyOf(todos);
    }
}
