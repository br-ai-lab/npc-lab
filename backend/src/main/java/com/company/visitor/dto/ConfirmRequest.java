package com.company.visitor.dto;

import jakarta.validation.constraints.Size;

public record ConfirmRequest(
        @Size(max = 100, message = "陪同员工长度不能超过 100 个字符")
        String companion) {
}
