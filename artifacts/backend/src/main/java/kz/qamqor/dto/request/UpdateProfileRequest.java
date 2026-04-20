package kz.qamqor.dto.request;

public record UpdateProfileRequest(
    String firstName,
    String lastName,
    String phone,
    String city,
    String role
) {}
