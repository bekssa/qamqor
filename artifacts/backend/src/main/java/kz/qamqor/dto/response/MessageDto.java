package kz.qamqor.dto.response;

import kz.qamqor.entity.Message;

import java.time.Instant;

public record MessageDto(
    Long id,
    String chatId,
    String senderId,
    String text,
    Instant timestamp,
    boolean flagged
) {
    public static MessageDto from(Message m) {
        return new MessageDto(
            m.getId(),
            m.getChat().getId(),
            m.getSender().getId(),
            m.getText(),
            m.getCreatedAt(),
            Boolean.TRUE.equals(m.getFlagged())
        );
    }
}
