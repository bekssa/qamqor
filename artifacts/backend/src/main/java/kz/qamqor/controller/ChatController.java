package kz.qamqor.controller;

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

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    // REST: GET /api/v1/chats?userId=...
    @ResponseBody
    @GetMapping("/api/v1/chats")
    public ResponseEntity<List<ChatDto>> getChats(@RequestParam String userId) {
        return ResponseEntity.ok(chatService.getChatsForUser(userId));
    }

    // REST: GET /api/v1/chats/{chatId}/messages
    @ResponseBody
    @GetMapping("/api/v1/chats/{chatId}/messages")
    public ResponseEntity<List<MessageDto>> getMessages(@PathVariable String chatId) {
        return ResponseEntity.ok(chatService.getMessages(chatId));
    }

    // WebSocket: /app/chat_{chatId}  ->  broadcast to /topic/chat/{chatId}
    @MessageMapping("/chat_{chatId}")
    public void handleMessage(
        @DestinationVariable String chatId,
        @Valid SendMessageDto dto
    ) {
        chatService.sendMessage(chatId, dto);
    }
}
