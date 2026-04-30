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
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ChatService {

    private final ChatRepository chatRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final GeminiModerationService geminiModerationService;
    private final ModerationService moderationService;

    public ChatService(ChatRepository chatRepository, MessageRepository messageRepository,
                       UserRepository userRepository, SimpMessagingTemplate messagingTemplate,
                       GeminiModerationService geminiModerationService,
                       @Lazy ModerationService moderationService) {
        this.chatRepository = chatRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
        this.geminiModerationService = geminiModerationService;
        this.moderationService = moderationService;
    }

    @Transactional(readOnly = true)
    public List<ChatDto> getChatsForUser(String userId) {
        return chatRepository.findAllByParticipantId(userId).stream()
            .map(chat -> {
                ChatDto.LastMessageInfo last = messageRepository
                    .findTopByChatIdOrderByCreatedAtDesc(chat.getId())
                    .map(m -> new ChatDto.LastMessageInfo(m.getText(), m.getSender().getId(), m.getCreatedAt()))
                    .orElse(null);
                return ChatDto.from(chat, last);
            })
            .sorted((a, b) -> {
                // Sort by last message time desc, then by chat created desc
                java.time.Instant ta = a.lastMessage() != null ? a.lastMessage().timestamp() : a.createdAt();
                java.time.Instant tb = b.lastMessage() != null ? b.lastMessage().timestamp() : b.createdAt();
                return tb.compareTo(ta);
            })
            .toList();
    }

    @Transactional(readOnly = true)
    public List<MessageDto> getMessages(String chatId) {
        return messageRepository.findAllByChatIdOrderByCreatedAtAsc(chatId).stream()
            .map(MessageDto::from)
            .toList();
    }

    @Transactional
    public ChatDto findOrCreateChat(String userId1, String userId2) {
        return chatRepository.findByTwoParticipants(userId1, userId2)
            .map(ChatDto::from)
            .orElseGet(() -> {
                User u1 = userRepository.findById(userId1)
                    .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));
                User u2 = userRepository.findById(userId2)
                    .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));
                Chat chat = Chat.builder()
                    .participants(List.of(u1, u2))
                    .build();
                return ChatDto.from(chatRepository.save(chat));
            });
    }

    @Transactional
    public MessageDto sendMessage(String chatId, SendMessageDto dto) {
        Chat chat = chatRepository.findById(chatId)
            .orElseThrow(() -> new AppException("Chat not found", HttpStatus.NOT_FOUND));

        User sender = userRepository.findById(dto.senderId())
            .orElseThrow(() -> new AppException("Sender not found", HttpStatus.NOT_FOUND));

        boolean flagged = false;
        // Skip moderation for admin messages
        if (sender.getRole() != kz.qamqor.entity.User.Role.ADMIN) {
            GeminiModerationService.ModerationResult mod = geminiModerationService.check(dto.text());
            if (!mod.isClean()) {
                flagged = true;
                try {
                    moderationService.createReport(dto.senderId(), chatId, dto.text(),
                        mod.violations(), mod.explanation());
                } catch (Exception e) {
                    // Never fail message delivery due to moderation error
                }
            }
        }

        Message message = Message.builder()
            .chat(chat)
            .sender(sender)
            .text(dto.text())
            .flagged(flagged)
            .build();

        MessageDto saved = MessageDto.from(messageRepository.save(message));

        // Flagged messages are held for admin review — do not broadcast to chat participants
        if (!flagged) {
            messagingTemplate.convertAndSend("/topic/chat/" + chatId, saved);
        }

        return saved;
    }

    /** Latest message in a chat for preview */
    public Optional<MessageDto> getLastMessage(String chatId) {
        return messageRepository.findTopByChatIdOrderByCreatedAtDesc(chatId)
            .map(MessageDto::from);
    }
}
