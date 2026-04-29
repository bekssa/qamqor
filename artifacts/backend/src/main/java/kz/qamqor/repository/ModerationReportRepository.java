package kz.qamqor.repository;

import kz.qamqor.entity.ModerationReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModerationReportRepository extends JpaRepository<ModerationReport, String> {
    List<ModerationReport> findAllByOrderByCreatedAtDesc();
    List<ModerationReport> findAllByStatusOrderByCreatedAtDesc(ModerationReport.Status status);
}
