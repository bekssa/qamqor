package kz.qamqor.service;

import kz.qamqor.dto.request.SendMessageDto;
import kz.qamqor.dto.response.ChatDto;
import kz.qamqor.dto.response.MessageDto;
import kz.qamqor.entity.Chat;
import kz.qamqor.entity.Message;
import kz.qamqor.entity.User;
import kz.qamqor.exception.AppException;
import kz.qamqor.repository.ChatRepository;
import kz.qamqor.repository.MessageRepository;
import kz.qamqor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatRepository chatRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public List<ChatDto> getChatsForUser(String userId) {
        return chatRepository.findAllByParticipantId(userId).stream()
            .map(ChatDto::from)
            .toList();
    }

    public List<MessageDto> getMessages(String chatId) {
        return messageRepository.findAllByChatIdOrderByCreatedAtAsc(chatId).stream()
            .map(MessageDto::from)
            .toList();
    }

    @Transactional
    public MessageDto sendMessage(String chatId, SendMessageDto dto) {
        Chat chat = chatRepository.findById(chatId)
            .orElseThrow(() -> new AppException("Chat not found", HttpStatus.NOT_FOUND));

        User sender = userRepository.findById(dto.senderId())
            .orElseThrow(() -> new AppException("Sender not found", HttpStatus.NOT_FOUND));

        Message message = Message.builder()
            .chat(chat)
            .sender(sender)
            .text(dto.text())
            .build();

        MessageDto saved = MessageDto.from(messageRepository.save(message));

        // Push to WebSocket subscribers
        messagingTemplate.convertAndSend("/topic/chat/" + chatId, saved);

        return saved;
    }
}
