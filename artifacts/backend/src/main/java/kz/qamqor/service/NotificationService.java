package kz.qamqor.service;

import kz.qamqor.dto.response.NotificationResponseDto;
import kz.qamqor.entity.Notification;
import kz.qamqor.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public void save(String userId, String type, String requestId, String requestTitle, String actorName) {
        save(userId, type, requestId, requestTitle, actorName, null);
    }

    public void save(String userId, String type, String requestId, String requestTitle, String actorName, String responseId) {
        notificationRepository.save(Notification.builder()
            .userId(userId)
            .type(type)
            .requestId(requestId)
            .requestTitle(requestTitle)
            .actorName(actorName)
            .responseId(responseId)
            .build());
    }

    public List<NotificationResponseDto> getForUser(String userId) {
        return notificationRepository.findAllByUserIdOrderByCreatedAtDesc(userId)
            .stream().map(NotificationResponseDto::from).toList();
    }
}
