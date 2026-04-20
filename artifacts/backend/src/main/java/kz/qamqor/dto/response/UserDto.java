package kz.qamqor.dto.response;

import kz.qamqor.entity.User;

import java.time.Instant;
import java.util.List;

public record UserDto(
    String id,
    String email,
    String name,
    String firstName,
    String lastName,
    String phone,
    String avatarUrl,
    String role,
    String birthDate,
    String city,
    List<String> categories,
    Double rating,
    Instant createdAt
) {
    public static UserDto from(User user, Double rating) {
        List<String> cats = user.getCategories() == null ? List.of()
            : user.getCategories().stream().map(c -> c.getKey()).toList();
        return new UserDto(
            user.getId(),
            user.getEmail(),
            user.getName(),
            user.getFirstName(),
            user.getLastName(),
            user.getPhone(),
            user.getAvatarUrl(),
            user.getRole().name().toLowerCase(),
            user.getBirthDate(),
            user.getCity(),
            cats,
            rating,
            user.getCreatedAt()
        );
    }
}
