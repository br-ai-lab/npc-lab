package com.company.visitor.dto;

import jakarta.validation.constraints.Size;

public record RejectRequest(
        @Size(max = 200, message = "拒绝原因长度不能超过 200 个字符")
        String reason
) {
}
