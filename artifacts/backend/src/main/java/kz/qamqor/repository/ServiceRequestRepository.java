package kz.qamqor.repository;

import kz.qamqor.entity.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, String> {
    List<ServiceRequest> findAllByStatus(ServiceRequest.Status status);
    List<ServiceRequest> findAllByAuthorId(String authorId);
    List<ServiceRequest> findAllByExecutorId(String executorId);

    void deleteAllByAuthorId(String authorId);

    @Modifying
    @Query("UPDATE ServiceRequest r SET r.executor = null WHERE r.executor.id = :userId")
    void clearExecutorByUserId(String userId);
}
