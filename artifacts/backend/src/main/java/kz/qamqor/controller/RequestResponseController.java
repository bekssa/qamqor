package kz.qamqor.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import kz.qamqor.entity.User;
import kz.qamqor.service.RequestResponseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Request Responses")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequiredArgsConstructor
public class RequestResponseController {

    private final RequestResponseService requestResponseService;

    @Operation(summary = "Получить свои отклики (для волонтёра)")
    @GetMapping("/api/v1/my-responses")
    public ResponseEntity<List<RequestResponseService.MyResponseDto>> getMyResponses(
        @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(requestResponseService.getMyResponses(currentUser));
    }

    @Operation(summary = "Волонтёр откликается на заявку")
    @PostMapping("/api/v1/requests/{id}/respond")
    public ResponseEntity<Void> respond(
        @PathVariable String id,
        @AuthenticationPrincipal User currentUser
    ) {
        requestResponseService.respond(id, currentUser);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Elderly принимает отклик волонтёра")
    @PostMapping("/api/v1/responses/{id}/accept")
    public ResponseEntity<Void> accept(
        @PathVariable String id,
        @AuthenticationPrincipal User currentUser
    ) {
        requestResponseService.accept(id, currentUser);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Elderly отклоняет отклик волонтёра")
    @PostMapping("/api/v1/responses/{id}/decline")
    public ResponseEntity<Void> decline(
        @PathVariable String id,
        @AuthenticationPrincipal User currentUser
    ) {
        requestResponseService.decline(id, currentUser);
        return ResponseEntity.ok().build();
    }
}
