package kz.qamqor.dto.response;

import kz.qamqor.entity.ServiceRequest;

import java.time.Instant;

public record ServiceRequestDto(
    String id,
    String title,
    String description,
    String authorId,
    String executorId,
    String status,
    String category,
    String location,
    Instant createdAt
) {
    public static ServiceRequestDto from(ServiceRequest r) {
        return new ServiceRequestDto(
            r.getId(),
            r.getTitle(),
            r.getDescription(),
            r.getAuthor().getId(),
            r.getExecutor() != null ? r.getExecutor().getId() : null,
            r.getStatus().name().toLowerCase(),
            r.getCategory(),
            r.getLocation(),
            r.getCreatedAt()
        );
    }
}
