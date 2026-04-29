package kz.qamqor.repository;

import kz.qamqor.entity.UserDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserDocumentRepository extends JpaRepository<UserDocument, String> {

    List<UserDocument> findAllByUserId(String userId);

    List<UserDocument> findAllByStatus(UserDocument.Status status);

    Optional<UserDocument> findByUserIdAndDocumentType(String userId, String documentType);
}
