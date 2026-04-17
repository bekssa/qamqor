package kz.qamqor.dto.request;

import jakarta.validation.constraints.*;

public record CreateReviewDto(
    @NotBlank String authorId,
    @NotBlank String targetId,
    @Min(1) @Max(5) int rating,
    String comment
) {}
