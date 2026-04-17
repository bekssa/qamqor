package kz.qamqor.dto.response;

import kz.qamqor.entity.Chat;

import java.time.Instant;
import java.util.List;

public record ChatDto(
    String id,
    List<String> participantIds,
    Instant createdAt
) {
    public static ChatDto from(Chat c) {
        return new ChatDto(
            c.getId(),
            c.getParticipants().stream().map(u -> u.getId()).toList(),
            c.getCreatedAt()
        );
    }
}
