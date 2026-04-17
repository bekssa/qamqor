package kz.qamqor.dto.request;

import jakarta.validation.constraints.NotBlank;

public record SendMessageDto(
    @NotBlank String senderId,
    @NotBlank String text
) {}
