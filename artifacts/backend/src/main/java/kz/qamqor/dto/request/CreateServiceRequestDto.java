package kz.qamqor.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateServiceRequestDto(
    @NotBlank String title,
    String description,
    String category,
    String location,
    Integer price,
    String scheduledDate
) {}
