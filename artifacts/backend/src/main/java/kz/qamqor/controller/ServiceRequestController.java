package kz.qamqor.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kz.qamqor.dto.request.CreateServiceRequestDto;
import kz.qamqor.dto.request.UpdateStatusRequest;
import kz.qamqor.dto.response.ServiceRequestDto;
import kz.qamqor.entity.User;
import kz.qamqor.service.ServiceRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Service Requests", description = "Заявки на оказание помощи")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/requests")
@RequiredArgsConstructor
public class ServiceRequestController {

    private final ServiceRequestService service;

    @Operation(
        summary = "Получить все заявки",
        responses = @ApiResponse(responseCode = "200", description = "Список заявок")
    )
    @GetMapping
    public ResponseEntity<List<ServiceRequestDto>> list() {
        return ResponseEntity.ok(service.getAll());
    }

    @Operation(summary = "Получить мои заявки")
    @GetMapping("/my")
    public ResponseEntity<List<ServiceRequestDto>> getMyRequests(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(service.getMyRequests(currentUser));
    }

    @Operation(
        summary = "Получить заявку по ID",
        responses = {
            @ApiResponse(responseCode = "200", description = "Заявка найдена",
                content = @Content(schema = @Schema(implementation = ServiceRequestDto.class))),
            @ApiResponse(responseCode = "404", description = "Заявка не найдена",
                content = @Content(schema = @Schema(hidden = true)))
        }
    )
    @GetMapping("/{id}")
    public ResponseEntity<ServiceRequestDto> getById(@PathVariable String id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @Operation(
        summary = "Создать новую заявку",
        description = "Создаёт заявку со статусом `open`. Поле `authorId` должно быть ID существующего пользователя.",
        responses = {
            @ApiResponse(responseCode = "201", description = "Заявка создана",
                content = @Content(schema = @Schema(implementation = ServiceRequestDto.class))),
            @ApiResponse(responseCode = "400", description = "Ошибка валидации",
                content = @Content(schema = @Schema(hidden = true))),
            @ApiResponse(responseCode = "404", description = "Автор не найден",
                content = @Content(schema = @Schema(hidden = true)))
        }
    )
    @PostMapping
    public ResponseEntity<ServiceRequestDto> create(
        @Valid @RequestBody CreateServiceRequestDto dto,
        @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto, currentUser));
    }

    @Operation(
        summary = "Изменить статус заявки",
        description = "Допустимые статусы: `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Статус обновлён",
                content = @Content(schema = @Schema(implementation = ServiceRequestDto.class))),
            @ApiResponse(responseCode = "404", description = "Заявка не найдена",
                content = @Content(schema = @Schema(hidden = true)))
        }
    )
    @PatchMapping("/{id}/status")
    public ResponseEntity<ServiceRequestDto> updateStatus(
        @PathVariable String id,
        @Valid @RequestBody UpdateStatusRequest dto
    ) {
        return ResponseEntity.ok(service.updateStatus(id, dto));
    }
}
