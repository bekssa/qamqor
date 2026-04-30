package kz.qamqor.service;

import kz.qamqor.dto.response.ModerationReportDto;
import kz.qamqor.entity.ModerationReport;
import kz.qamqor.entity.User;
import kz.qamqor.exception.AppException;
import kz.qamqor.repository.ModerationReportRepository;
import kz.qamqor.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
public class ModerationService {

    private final ModerationReportRepository reportRepository;
    private final UserRepository userRepository;
    private final ChatService chatService;
    private final NotificationService notificationService;

    public ModerationService(ModerationReportRepository reportRepository,
                             UserRepository userRepository,
                             @Lazy ChatService chatService,
                             NotificationService notificationService) {
        this.reportRepository = reportRepository;
        this.userRepository = userRepository;
        this.chatService = chatService;
        this.notificationService = notificationService;
    }

    @Transactional
    public ModerationReport createReport(String senderId, String chatId, String messageText,
                                          List<String> violations, String explanation) {
        User sender = userRepository.findById(senderId).orElse(null);
        String name = "", email = "", phone = "", avatarUrl = "";
        if (sender != null) {
            String fn = sender.getFirstName() != null ? sender.getFirstName() : "";
            String ln = sender.getLastName() != null ? sender.getLastName() : "";
            name = (ln + " " + fn).trim();
            if (name.isEmpty()) name = sender.getName() != null ? sender.getName() : sender.getEmail();
            email = sender.getEmail();
            phone = sender.getPhone() != null ? sender.getPhone() : "";
            avatarUrl = sender.getAvatarUrl() != null ? sender.getAvatarUrl() : "";
        }

        ModerationReport report = ModerationReport.builder()
            .senderId(senderId)
            .senderName(name)
            .senderEmail(email)
            .senderPhone(phone)
            .senderAvatarUrl(avatarUrl)
            .chatId(chatId)
            .messageText(messageText)
            .violations(String.join(",", violations))
            .explanation(explanation)
            .status(ModerationReport.Status.PENDING)
            .build();

        report = reportRepository.save(report);
        log.info("[MOD] Report created id={} sender={} violations={}", report.getId(), senderId, violations);
        return report;
    }

    public List<ModerationReportDto> getAllReports() {
        return reportRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(r -> {
                boolean blocked = userRepository.findById(r.getSenderId())
                    .map(User::isBlocked).orElse(false);
                return ModerationReportDto.from(r, blocked);
            }).toList();
    }

    public List<ModerationReportDto> getPendingReports() {
        return reportRepository.findAllByStatusOrderByCreatedAtDesc(ModerationReport.Status.PENDING)
            .stream().map(r -> {
                boolean blocked = userRepository.findById(r.getSenderId())
                    .map(User::isBlocked).orElse(false);
                return ModerationReportDto.from(r, blocked);
            }).toList();
    }

    @Transactional
    public ModerationReportDto markReviewed(String reportId) {
        ModerationReport r = find(reportId);
        r.setStatus(ModerationReport.Status.REVIEWED);
        ModerationReport saved = reportRepository.save(r);
        boolean blocked = userRepository.findById(saved.getSenderId()).map(User::isBlocked).orElse(false);
        return ModerationReportDto.from(saved, blocked);
    }

    @Transactional
    public ModerationReportDto dismiss(String reportId) {
        ModerationReport r = find(reportId);
        r.setStatus(ModerationReport.Status.DISMISSED);
        ModerationReport saved = reportRepository.save(r);
        boolean blocked = userRepository.findById(saved.getSenderId()).map(User::isBlocked).orElse(false);
        return ModerationReportDto.from(saved, blocked);
    }

    @Transactional
    public ModerationReportDto openAdminChat(String reportId, String adminId) {
        ModerationReport r = find(reportId);
        if (r.getAdminChatId() != null) {
            boolean blocked = userRepository.findById(r.getSenderId()).map(User::isBlocked).orElse(false);
            return ModerationReportDto.from(r, blocked);
        }
        var chat = chatService.findOrCreateChat(adminId, r.getSenderId());
        r.setAdminChatId(chat.id());
        r.setStatus(ModerationReport.Status.REVIEWED);
        ModerationReport saved = reportRepository.save(r);
        boolean blocked = userRepository.findById(saved.getSenderId()).map(User::isBlocked).orElse(false);
        return ModerationReportDto.from(saved, blocked);
    }

    @Transactional
    public ModerationReportDto blockUser(String reportId, String adminId) {
        ModerationReport r = find(reportId);
        User user = userRepository.findById(r.getSenderId())
            .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        user.setBlocked(true);
        userRepository.save(user);

        notificationService.save(user.getId(), "USER_BLOCKED", null, null, "Администратор");

        log.info("[MOD] User {} blocked by admin {} via report {}", user.getId(), adminId, reportId);
        return ModerationReportDto.from(r, true);
    }

    private ModerationReport find(String id) {
        return reportRepository.findById(id)
            .orElseThrow(() -> new AppException("Report not found", HttpStatus.NOT_FOUND));
    }
}
