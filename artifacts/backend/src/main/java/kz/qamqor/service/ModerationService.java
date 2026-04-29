package kz.qamqor.service;

import kz.qamqor.dto.response.ModerationReportDto;
import kz.qamqor.entity.ModerationReport;
import kz.qamqor.entity.User;
import kz.qamqor.exception.AppException;
import kz.qamqor.repository.ModerationReportRepository;
import kz.qamqor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ModerationService {

    private final ModerationReportRepository reportRepository;
    private final UserRepository userRepository;
    private final ChatService chatService;

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
            .map(ModerationReportDto::from).toList();
    }

    public List<ModerationReportDto> getPendingReports() {
        return reportRepository.findAllByStatusOrderByCreatedAtDesc(ModerationReport.Status.PENDING)
            .stream().map(ModerationReportDto::from).toList();
    }

    @Transactional
    public ModerationReportDto markReviewed(String reportId) {
        ModerationReport r = find(reportId);
        r.setStatus(ModerationReport.Status.REVIEWED);
        return ModerationReportDto.from(reportRepository.save(r));
    }

    @Transactional
    public ModerationReportDto dismiss(String reportId) {
        ModerationReport r = find(reportId);
        r.setStatus(ModerationReport.Status.DISMISSED);
        return ModerationReportDto.from(reportRepository.save(r));
    }

    /** Открыть/найти чат между admin и нарушителем */
    @Transactional
    public ModerationReportDto openAdminChat(String reportId, String adminId) {
        ModerationReport r = find(reportId);
        if (r.getAdminChatId() != null) {
            // Already exists
            return ModerationReportDto.from(r);
        }
        var chat = chatService.findOrCreateChat(adminId, r.getSenderId());
        r.setAdminChatId(chat.id());
        r.setStatus(ModerationReport.Status.REVIEWED);
        return ModerationReportDto.from(reportRepository.save(r));
    }

    private ModerationReport find(String id) {
        return reportRepository.findById(id)
            .orElseThrow(() -> new AppException("Report not found", HttpStatus.NOT_FOUND));
    }
}
