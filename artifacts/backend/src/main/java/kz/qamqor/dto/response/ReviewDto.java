package kz.qamqor.dto.response;

import kz.qamqor.entity.Review;

import java.time.Instant;

public record ReviewDto(
    String id,
    String authorId,
    String targetId,
    int rating,
    String comment,
    Instant createdAt
) {
    public static ReviewDto from(Review r) {
        return new ReviewDto(
            r.getId(),
            r.getAuthor().getId(),
            r.getTarget().getId(),
            r.getRating(),
            r.getComment(),
            r.getCreatedAt()
        );
    }
}
