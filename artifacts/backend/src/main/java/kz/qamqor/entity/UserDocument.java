package kz.qamqor.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "user_documents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String documentType;

    @Column(nullable = false)
    private String fileName;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String fileUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    private String rejectReason;

    @CreationTimestamp
    private Instant uploadedAt;

    private Instant reviewedAt;

    public enum Status {
        PENDING, APPROVED, REJECTED
    }
}
