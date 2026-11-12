package com.company.visitor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ForceLeaveRequest(
        @NotBlank(message = "强制离场原因不能为空")
        @Size(max = 500, message = "强制离场原因长度不能超过 500 个字符")
        String reason) {
}
