package kz.qamqor.dto.request;

import jakarta.validation.constraints.NotNull;
import kz.qamqor.entity.ServiceRequest;

public record UpdateStatusRequest(
    @NotNull ServiceRequest.Status status,
    Integer price
) {}
