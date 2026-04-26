package kz.qamqor.repository;

import kz.qamqor.entity.RequestResponse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RequestResponseRepository extends JpaRepository<RequestResponse, String> {
    boolean existsByRequestIdAndVolunteerId(String requestId, String volunteerId);
    List<RequestResponse> findByVolunteerId(String volunteerId);
}
