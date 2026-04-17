package kz.qamqor.dto.response;

import kz.qamqor.entity.User;

import java.time.Instant;

public record UserDto(
    String id,
    String email,
    String name,
    String phone,
    String avatarUrl,
    String role,
    Double rating,
    Instant createdAt
) {
    public static UserDto from(User user, Double rating) {
        return new UserDto(
            user.getId(),
            user.getEmail(),
            user.getName(),
            user.getPhone(),
            user.getAvatarUrl(),
            user.getRole().name().toLowerCase(),
            rating,
            user.getCreatedAt()
        );
    }
}
