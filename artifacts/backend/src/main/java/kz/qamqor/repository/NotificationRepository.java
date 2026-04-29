package kz.qamqor.repository;

import kz.qamqor.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findAllByUserIdOrderByCreatedAtDesc(String userId);
    Optional<Notification> findFirstByResponseIdAndType(String responseId, String type);
    List<Notification> findAllByRequestIdAndType(String requestId, String type);
}
