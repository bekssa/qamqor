package kz.qamqor.dto.response;

public record NotificationDto(
    String type,
    String requestId,
    String requestTitle,
    String volunteerName,
    String responseId,
    String actorId
) {
    public NotificationDto(String type, String requestId, String requestTitle, String volunteerName, String responseId) {
        this(type, requestId, requestTitle, volunteerName, responseId, null);
    }
}
