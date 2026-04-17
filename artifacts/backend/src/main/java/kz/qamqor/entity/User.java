package kz.qamqor.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String email;

    private String name;
    private String phone;
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.ELDERLY;

    @Column(nullable = false)
    private boolean verified = false;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    @OneToMany(mappedBy = "author", fetch = FetchType.LAZY)
    private List<Review> writtenReviews;

    @OneToMany(mappedBy = "target", fetch = FetchType.LAZY)
    private List<Review> receivedReviews;

    public enum Role {
        VOLUNTEER, ELDERLY, ADMIN
    }
}