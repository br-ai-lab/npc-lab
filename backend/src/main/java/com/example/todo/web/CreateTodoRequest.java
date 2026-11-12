package com.example.todo.web;

import jakarta.validation.constraints.NotBlank;

public record CreateTodoRequest(
        @NotBlank(message = "title must not be blank")
        String title
) {
}
