package kz.qamqor.repository;

import kz.qamqor.entity.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, String> {
    List<ServiceRequest> findAllByStatus(ServiceRequest.Status status);
    List<ServiceRequest> findAllByAuthorId(String authorId);
    List<ServiceRequest> findAllByExecutorId(String executorId);
}
