package kz.qamqor.dto.response;

public record NotificationDto(
    String type,
    String requestId,
    String requestTitle,
    String volunteerName,
    String responseId
) {}
