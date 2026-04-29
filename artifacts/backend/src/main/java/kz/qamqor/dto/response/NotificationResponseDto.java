package kz.qamqor.dto.response;

import kz.qamqor.entity.Notification;

import java.time.Instant;

public record NotificationResponseDto(
    String id,
    String type,
    String requestId,
    String requestTitle,
    String actorName,
    String actorId,
    String responseId,
    String status,
    Instant createdAt
) {
    public static NotificationResponseDto from(Notification n) {
        return new NotificationResponseDto(
            n.getId(), n.getType(), n.getRequestId(), n.getRequestTitle(),
            n.getActorName(), n.getActorId(), n.getResponseId(), n.getStatus(), n.getCreatedAt()
        );
    }
}
