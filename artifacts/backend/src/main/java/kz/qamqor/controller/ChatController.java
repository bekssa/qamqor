package kz.qamqor.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kz.qamqor.dto.request.SendMessageDto;
import kz.qamqor.dto.response.ChatDto;
import kz.qamqor.dto.response.MessageDto;
import kz.qamqor.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Chats", description = "Чаты и сообщения. WebSocket: ws://host/ws (STOMP)")
@SecurityRequirement(name = "bearerAuth")
@Controller
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @Operation(
        summary = "Получить чаты пользователя",
        description = "Возвращает все диалоги, в которых участвует пользователь с указанным `userId`.",
        parameters = @Parameter(name = "userId", description = "ID пользователя", required = true, example = "uuid-here"),
        responses = {
            @ApiResponse(responseCode = "200", description = "Список чатов"),
            @ApiResponse(responseCode = "401", description = "Не авторизован",
                content = @Content(schema = @Schema(hidden = true)))
        }
    )
    @ResponseBody
    @GetMapping("/api/v1/chats")
    public ResponseEntity<List<ChatDto>> getChats(@RequestParam String userId) {
        return ResponseEntity.ok(chatService.getChatsForUser(userId));
    }

    @Operation(
        summary = "Получить историю сообщений чата",
        description = "Возвращает все сообщения чата, отсортированные по времени (старые первые).",
        responses = {
            @ApiResponse(responseCode = "200", description = "История сообщений"),
            @ApiResponse(responseCode = "404", description = "Чат не найден",
                content = @Content(schema = @Schema(hidden = true)))
        }
    )
    @ResponseBody
    @GetMapping("/api/v1/chats/{chatId}/messages")
    public ResponseEntity<List<MessageDto>> getMessages(@PathVariable String chatId) {
        return ResponseEntity.ok(chatService.getMessages(chatId));
    }

    /**
     * WebSocket (STOMP):
     *   Subscribe: /topic/chat/{chatId}
     *   Publish:   /app/chat_{chatId}
     *   Body:      { "senderId": "...", "text": "..." }
     */
    @MessageMapping("/chat_{chatId}")
    public void handleMessage(
        @DestinationVariable String chatId,
        @Valid SendMessageDto dto
    ) {
        chatService.sendMessage(chatId, dto);
    }
}
