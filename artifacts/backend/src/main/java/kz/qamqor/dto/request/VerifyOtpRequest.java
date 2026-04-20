package kz.qamqor.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VerifyOtpRequest(
    @NotBlank @Email String email,
    @NotBlank @Size(min = 4, max = 4) String code,
    String password,
    String firstName,
    String lastName,
    String phone,
    String role,
    String birthDate,
    String city
) {}
