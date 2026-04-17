package kz.qamqor.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateServiceRequestDto(
    @NotBlank String title,
    String description,
    @NotBlank String authorId,
    String category,
    String location
) {}
