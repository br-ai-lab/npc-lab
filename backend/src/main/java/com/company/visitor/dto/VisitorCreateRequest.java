package com.company.visitor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/**
 * Registration payload. Field set follows docs/visitor-management-policy.md,
 * appendix A: name, phone, company, hostName, purpose, entryTime are all required.
 */
public record VisitorCreateRequest(

        @NotBlank(message = "姓名不能为空")
        @Size(max = 50, message = "姓名长度不能超过 50 个字符")
        String name,

        @NotBlank(message = "联系电话不能为空")
        @Pattern(regexp = "^[0-9+\\-\\s]{6,20}$", message = "联系电话格式不正确")
        String phone,

        @NotBlank(message = "所属单位不能为空")
        @Size(max = 100, message = "所属单位长度不能超过 100 个字符")
        String company,

        @NotBlank(message = "被访人不能为空")
        @Size(max = 50, message = "被访人长度不能超过 50 个字符")
        String hostName,

        @NotBlank(message = "来访事由不能为空")
        @Size(max = 200, message = "来访事由长度不能超过 200 个字符")
        String purpose,

        @NotNull(message = "进入时间不能为空")
        LocalDateTime entryTime
) {
}
