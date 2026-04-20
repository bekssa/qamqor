package kz.qamqor.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record OpenChatRequest(
    @NotNull @Size(min = 2, max = 2) List<String> participantIds
) {}
