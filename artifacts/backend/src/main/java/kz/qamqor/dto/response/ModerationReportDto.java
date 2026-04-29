package kz.qamqor.dto.response;

import kz.qamqor.entity.ModerationReport;

import java.time.Instant;

public record ModerationReportDto(
    String id,
    String senderId,
    String senderName,
    String senderEmail,
    String senderPhone,
    String senderAvatarUrl,
    String chatId,
    String messageText,
    String violations,
    String explanation,
    String status,
    String adminChatId,
    Instant createdAt
) {
    public static ModerationReportDto from(ModerationReport r) {
        return new ModerationReportDto(
            r.getId(), r.getSenderId(), r.getSenderName(), r.getSenderEmail(),
            r.getSenderPhone(), r.getSenderAvatarUrl(), r.getChatId(),
            r.getMessageText(), r.getViolations(), r.getExplanation(),
            r.getStatus().name(), r.getAdminChatId(), r.getCreatedAt()
        );
    }
}
