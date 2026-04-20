package kz.qamqor.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "categories")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Category {

    @Id
    private String key;

    @Column(nullable = false)
    private String label;

    private String description;
}
