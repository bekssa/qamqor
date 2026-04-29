package kz.qamqor.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import kz.qamqor.dto.response.ModerationReportDto;
import kz.qamqor.entity.User;
import kz.qamqor.exception.AppException;
import kz.qamqor.service.ModerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Moderation", description = "Модерация сообщений")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/admin/moderation")
@RequiredArgsConstructor
public class ModerationController {

    private final ModerationService moderationService;

    @Operation(summary = "Все репорты")
    @GetMapping("/reports")
    public ResponseEntity<List<ModerationReportDto>> getAllReports(@AuthenticationPrincipal User currentUser) {
        requireAdmin(currentUser);
        return ResponseEntity.ok(moderationService.getAllReports());
    }

    @Operation(summary = "Только PENDING репорты")
    @GetMapping("/reports/pending")
    public ResponseEntity<List<ModerationReportDto>> getPendingReports(@AuthenticationPrincipal User currentUser) {
        requireAdmin(currentUser);
        return ResponseEntity.ok(moderationService.getPendingReports());
    }

    @Operation(summary = "Пометить как рассмотренный")
    @PostMapping("/reports/{id}/review")
    public ResponseEntity<ModerationReportDto> review(@PathVariable String id,
                                                       @AuthenticationPrincipal User currentUser) {
        requireAdmin(currentUser);
        return ResponseEntity.ok(moderationService.markReviewed(id));
    }

    @Operation(summary = "Отклонить репорт (ложное срабатывание)")
    @PostMapping("/reports/{id}/dismiss")
    public ResponseEntity<ModerationReportDto> dismiss(@PathVariable String id,
                                                        @AuthenticationPrincipal User currentUser) {
        requireAdmin(currentUser);
        return ResponseEntity.ok(moderationService.dismiss(id));
    }

    @Operation(summary = "Открыть чат с нарушителем")
    @PostMapping("/reports/{id}/open-chat")
    public ResponseEntity<ModerationReportDto> openChat(@PathVariable String id,
                                                         @AuthenticationPrincipal User currentUser) {
        requireAdmin(currentUser);
        return ResponseEntity.ok(moderationService.openAdminChat(id, currentUser.getId()));
    }

    private void requireAdmin(User user) {
        if (user == null || user.getRole() != User.Role.ADMIN) {
            throw new AppException("Forbidden", HttpStatus.FORBIDDEN);
        }
    }
}
