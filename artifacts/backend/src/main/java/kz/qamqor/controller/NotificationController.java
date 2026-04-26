package kz.qamqor.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import kz.qamqor.dto.response.NotificationResponseDto;
import kz.qamqor.entity.User;
import kz.qamqor.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Notifications")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "Получить уведомления текущего пользователя")
    @GetMapping
    public ResponseEntity<List<NotificationResponseDto>> getMyNotifications(
        @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(notificationService.getForUser(currentUser.getId()));
    }
}
