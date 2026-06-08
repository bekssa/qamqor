package kz.qamqor.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
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
    private String firstName;
    private String lastName;
    private String phone;
    @Column(columnDefinition = "TEXT")
    private String avatarUrl;
    private String passwordHash;
    private String birthDate;
    private String city;

    @Column(columnDefinition = "TEXT")
    private String aboutMe;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.ELDERLY;

    @Column(nullable = false)
    private boolean verified = false;

    @Column(nullable = false, columnDefinition = "boolean not null default false")
    private boolean blocked = false;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_categories",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "category_key")
    )
    private List<Category> categories = new ArrayList<>();

    @OneToMany(mappedBy = "author", fetch = FetchType.LAZY)
    private List<Review> writtenReviews;

    @OneToMany(mappedBy = "target", fetch = FetchType.LAZY)
    private List<Review> receivedReviews;

    public enum Role {
        VOLUNTEER, ELDERLY, ADMIN
    }
}