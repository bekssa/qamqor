package kz.qamqor.dto.response;

public record AuthResponse(
    String token,
    UserDto user
) {}
