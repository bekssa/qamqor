package kz.qamqor.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SendOtpRequest(
    @NotBlank @Email String email
) {}
