package kz.qamqor.dto.response;

import kz.qamqor.entity.UserDocument;

import java.time.Instant;

public record UserDocumentDto(
    String id,
    String userId,
    String documentType,
    String fileName,
    String fileUrl,
    String status,
    String rejectReason,
    Instant uploadedAt,
    Instant reviewedAt
) {
    public static UserDocumentDto from(UserDocument doc) {
        return new UserDocumentDto(
            doc.getId(),
            doc.getUserId(),
            doc.getDocumentType(),
            doc.getFileName(),
            doc.getFileUrl(),
            doc.getStatus().name(),
            doc.getRejectReason(),
            doc.getUploadedAt(),
            doc.getReviewedAt()
        );
    }
}
