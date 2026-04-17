package kz.qamqor.repository;

import kz.qamqor.entity.OtpCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface OtpCodeRepository extends JpaRepository<OtpCode, Long> {

    Optional<OtpCode> findTopByEmailAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
        String email, Instant now
    );

    void deleteAllByEmailOrExpiresAtBefore(String email, Instant threshold);
}
