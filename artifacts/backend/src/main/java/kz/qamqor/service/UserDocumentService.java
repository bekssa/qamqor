package kz.qamqor.service;

import kz.qamqor.dto.response.UserDocumentDto;
import kz.qamqor.entity.UserDocument;
import kz.qamqor.exception.AppException;
import kz.qamqor.repository.UserDocumentRepository;
import kz.qamqor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserDocumentService {

    private final UserDocumentRepository userDocumentRepository;
    private final UserRepository userRepository;
    private final MinioService minioService;
    private final NotificationService notificationService;

    @Transactional
    public UserDocumentDto uploadDocument(String userId, String documentType, MultipartFile file) {
        if (file == null || !"application/pdf".equals(file.getContentType())) {
            throw new AppException("Only PDF files are allowed", HttpStatus.BAD_REQUEST);
        }

        String fileUrl = minioService.uploadDocument(userId, documentType, file);
        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : documentType + ".pdf";

        // Find all existing docs of this type for this user (may be >1 due to past bug)
        List<UserDocument> existing = userDocumentRepository.findAllByUserId(userId).stream()
            .filter(d -> documentType.equals(d.getDocumentType()))
            .sorted(Comparator.comparing(UserDocument::getUploadedAt).reversed())
            .collect(java.util.stream.Collectors.toList());

        UserDocument doc;
        if (!existing.isEmpty()) {
            doc = existing.get(0); // reuse the most recent record
            if (existing.size() > 1) {
                userDocumentRepository.deleteAll(existing.subList(1, existing.size()));
            }
            doc.setFileName(fileName);
            doc.setFileUrl(fileUrl);
            doc.setStatus(UserDocument.Status.PENDING);
            doc.setRejectReason(null);
            doc.setReviewedAt(null);
        } else {
            doc = UserDocument.builder()
                .userId(userId)
                .documentType(documentType)
                .fileName(fileName)
                .fileUrl(fileUrl)
                .status(UserDocument.Status.PENDING)
                .build();
        }

        doc = userDocumentRepository.save(doc);
        log.info("[DOC] Uploaded document id={} userId={} type={}", doc.getId(), userId, documentType);

        notificationService.saveToAdmin(userRepository, "DOC_SUBMITTED", doc.getId(), fileName, documentType, userId);

        return UserDocumentDto.from(doc);
    }

    public List<UserDocumentDto> getMyDocuments(String userId) {
        // Return only the most recent document per type (guards against legacy duplicates)
        return userDocumentRepository.findAllByUserId(userId).stream()
            .collect(java.util.stream.Collectors.toMap(
                UserDocument::getDocumentType,
                d -> d,
                (a, b) -> a.getUploadedAt().isAfter(b.getUploadedAt()) ? a : b
            ))
            .values().stream()
            .map(UserDocumentDto::from)
            .toList();
    }

    public List<UserDocumentDto> getPendingDocuments() {
        return userDocumentRepository.findAllByStatus(UserDocument.Status.PENDING)
            .stream().map(UserDocumentDto::from).toList();
    }

    @Transactional
    public UserDocumentDto reviewDocument(String documentId, boolean approved, String rejectReason, String adminId) {
        UserDocument doc = userDocumentRepository.findById(documentId)
            .orElseThrow(() -> new AppException("Document not found", HttpStatus.NOT_FOUND));

        doc.setStatus(approved ? UserDocument.Status.APPROVED : UserDocument.Status.REJECTED);
        doc.setReviewedAt(Instant.now());
        if (!approved) {
            doc.setRejectReason(rejectReason);
        }

        doc = userDocumentRepository.save(doc);
        log.info("[DOC] Reviewed id={} approved={} adminId={}", documentId, approved, adminId);

        String actorName = approved ? "APPROVED" : rejectReason;
        notificationService.save(doc.getUserId(), "DOC_REVIEWED", doc.getId(), doc.getFileName(), actorName, adminId, null);

        return UserDocumentDto.from(doc);
    }
}
