package kz.qamqor.dto.response;

import kz.qamqor.entity.ServiceRequest;

import java.time.Instant;

public record ServiceRequestDto(
    String id,
    String title,
    String description,
    String authorId,
    String authorName,
    String authorAvatarUrl,
    String executorId,
    String status,
    String category,
    String location,
    Integer price,
    String scheduledDate,
    Instant createdAt
) {
    public static ServiceRequestDto from(ServiceRequest r) {
        String fn = r.getAuthor().getFirstName();
        String ln = r.getAuthor().getLastName();
        String authorName = ((fn != null ? fn : "") + " " + (ln != null ? ln : "")).trim();
        if (authorName.isEmpty()) authorName = r.getAuthor().getName() != null ? r.getAuthor().getName() : "";
        return new ServiceRequestDto(
            r.getId(),
            r.getTitle(),
            r.getDescription(),
            r.getAuthor().getId(),
            authorName,
            r.getAuthor().getAvatarUrl(),
            r.getExecutor() != null ? r.getExecutor().getId() : null,
            r.getStatus().name().toLowerCase(),
            r.getCategory(),
            r.getLocation(),
            r.getPrice(),
            r.getScheduledDate(),
            r.getCreatedAt()
        );
    }
}
