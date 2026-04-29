package kz.qamqor.repository;

import kz.qamqor.entity.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, String> {
    List<ServiceRequest> findAllByStatus(ServiceRequest.Status status);
    List<ServiceRequest> findAllByAuthorId(String authorId);
    List<ServiceRequest> findAllByExecutorId(String executorId);

    @Query("SELECT r FROM ServiceRequest r WHERE r.status = 'OPEN' AND r.author.role = kz.qamqor.entity.User.Role.ELDERLY " +
           "AND r.category IN (SELECT c.key FROM User u JOIN u.categories c WHERE u.id = :userId)")
    List<ServiceRequest> findForVolunteer(@Param("userId") String userId);

    void deleteAllByAuthorId(String authorId);

    @Modifying
    @Query("UPDATE ServiceRequest r SET r.executor = null WHERE r.executor.id = :userId")
    void clearExecutorByUserId(String userId);
}
