package kz.qamqor.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import kz.qamqor.dto.response.UserDocumentDto;
import kz.qamqor.entity.User;
import kz.qamqor.exception.AppException;
import kz.qamqor.service.UserDocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Tag(name = "Documents", description = "Верификация документов пользователей")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequiredArgsConstructor
public class UserDocumentController {

    private final UserDocumentService userDocumentService;

    @Operation(summary = "Загрузить документ (PDF)")
    @PostMapping(value = "/api/v1/documents/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserDocumentDto> uploadDocument(
        @RequestParam("documentType") String documentType,
        @RequestParam("file") MultipartFile file,
        @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(userDocumentService.uploadDocument(currentUser.getId(), documentType, file));
    }

    @Operation(summary = "Получить мои документы")
    @GetMapping("/api/v1/documents/my")
    public ResponseEntity<List<UserDocumentDto>> getMyDocuments(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(userDocumentService.getMyDocuments(currentUser.getId()));
    }

    @Operation(summary = "Получить все документы на рассмотрении (только ADMIN)")
    @GetMapping("/api/v1/admin/documents/pending")
    public ResponseEntity<List<UserDocumentDto>> getPendingDocuments(@AuthenticationPrincipal User currentUser) {
        if (currentUser.getRole() != User.Role.ADMIN) {
            throw new AppException("Forbidden", HttpStatus.FORBIDDEN);
        }
        return ResponseEntity.ok(userDocumentService.getPendingDocuments());
    }

    @Operation(summary = "Одобрить документ (только ADMIN)")
    @PostMapping("/api/v1/admin/documents/{id}/approve")
    public ResponseEntity<UserDocumentDto> approveDocument(
        @PathVariable String id,
        @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser.getRole() != User.Role.ADMIN) {
            throw new AppException("Forbidden", HttpStatus.FORBIDDEN);
        }
        return ResponseEntity.ok(userDocumentService.reviewDocument(id, true, null, currentUser.getId()));
    }

    @Operation(summary = "Отклонить документ (только ADMIN)")
    @PostMapping("/api/v1/admin/documents/{id}/reject")
    public ResponseEntity<UserDocumentDto> rejectDocument(
        @PathVariable String id,
        @RequestBody RejectRequest body,
        @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser.getRole() != User.Role.ADMIN) {
            throw new AppException("Forbidden", HttpStatus.FORBIDDEN);
        }
        return ResponseEntity.ok(userDocumentService.reviewDocument(id, false, body.reason(), currentUser.getId()));
    }

    public record RejectRequest(String reason) {}
}
