package kz.qamqor.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "notifications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String type;

    private String requestId;
    private String requestTitle;
    private String actorName;
    private String actorId;
    private String responseId;

    /** Финальный статус действия: ACCEPTED, DECLINED, REVIEWED — null пока не обработано */
    private String status;

    @CreationTimestamp
    private Instant createdAt;
}
