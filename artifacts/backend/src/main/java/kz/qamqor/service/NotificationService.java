package kz.qamqor.service;

import kz.qamqor.dto.response.NotificationResponseDto;
import kz.qamqor.entity.Notification;
import kz.qamqor.repository.NotificationRepository;
import kz.qamqor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public void save(String userId, String type, String requestId, String requestTitle, String actorName) {
        save(userId, type, requestId, requestTitle, actorName, null, null);
    }

    public void save(String userId, String type, String requestId, String requestTitle, String actorName, String responseId) {
        save(userId, type, requestId, requestTitle, actorName, null, responseId);
    }

    public void save(String userId, String type, String requestId, String requestTitle, String actorName, String actorId, String responseId) {
        notificationRepository.save(Notification.builder()
            .userId(userId)
            .type(type)
            .requestId(requestId)
            .requestTitle(requestTitle)
            .actorName(actorName)
            .actorId(actorId)
            .responseId(responseId)
            .build());
    }

    public List<NotificationResponseDto> getForUser(String userId) {
        return notificationRepository.findAllByUserIdOrderByCreatedAtDesc(userId)
            .stream().map(NotificationResponseDto::from).toList();
    }

    public void setStatusByResponseId(String responseId, String type, String status) {
        notificationRepository.findFirstByResponseIdAndType(responseId, type)
            .ifPresent(n -> { n.setStatus(status); notificationRepository.save(n); });
    }

    public void setStatusByRequestId(String requestId, String type, String status) {
        notificationRepository.findAllByRequestIdAndType(requestId, type)
            .forEach(n -> { n.setStatus(status); notificationRepository.save(n); });
    }

    public void saveToAdmin(UserRepository userRepository, String type, String requestId, String requestTitle, String actorName, String actorId) {
        userRepository.findByEmail("adminbeks@gmail.com").ifPresent(admin ->
            save(admin.getId(), type, requestId, requestTitle, actorName, actorId, null)
        );
    }
}
