package kz.qamqor.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "moderation_reports")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ModerationReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String senderId;

    @Column(nullable = false)
    private String senderName;

    private String senderEmail;
    private String senderPhone;
    private String senderAvatarUrl;

    @Column(nullable = false)
    private String chatId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String messageText;

    /** Comma-separated violation labels, e.g. "PROFANITY,FRAUD" */
    @Column(nullable = false)
    private String violations;

    /** OpenAI explanation */
    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    /** Admin chat id with this user (lazily created) */
    private String adminChatId;

    @CreationTimestamp
    private Instant createdAt;

    public enum Status {
        PENDING, REVIEWED, DISMISSED
    }
}
