package kz.qamqor.dto.response;

import kz.qamqor.entity.Chat;

import java.time.Instant;
import java.util.List;

public record ChatDto(
    String id,
    List<ParticipantInfo> participants,
    Instant createdAt,
    LastMessageInfo lastMessage
) {
    public record ParticipantInfo(String id, String name, String avatarUrl) {}
    public record LastMessageInfo(String text, String senderId, Instant timestamp) {}

    public static ChatDto from(Chat c) {
        return new ChatDto(
            c.getId(),
            c.getParticipants().stream().map(u -> {
                String fn = u.getFirstName();
                String ln = u.getLastName();
                String name = ((fn != null ? fn : "") + " " + (ln != null ? ln : "")).trim();
                if (name.isEmpty()) name = u.getName() != null ? u.getName() : "";
                return new ParticipantInfo(u.getId(), name, u.getAvatarUrl());
            }).toList(),
            c.getCreatedAt(),
            null
        );
    }

    public static ChatDto from(Chat c, LastMessageInfo lastMsg) {
        return new ChatDto(
            c.getId(),
            c.getParticipants().stream().map(u -> {
                String fn = u.getFirstName();
                String ln = u.getLastName();
                String name = ((fn != null ? fn : "") + " " + (ln != null ? ln : "")).trim();
                if (name.isEmpty()) name = u.getName() != null ? u.getName() : "";
                return new ParticipantInfo(u.getId(), name, u.getAvatarUrl());
            }).toList(),
            c.getCreatedAt(),
            lastMsg
        );
    }
}
