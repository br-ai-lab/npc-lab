package com.company.visitor.dto;

import jakarta.validation.constraints.NotNull;

public record CheckoutRequest(
        @NotNull(message = "badgeReturned 不能为空")
        Boolean badgeReturned) {
}
