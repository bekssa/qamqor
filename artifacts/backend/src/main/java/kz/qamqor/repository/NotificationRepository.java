package kz.qamqor.repository;

import kz.qamqor.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findAllByUserIdOrderByCreatedAtDesc(String userId);
}
