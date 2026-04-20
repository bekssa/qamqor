package kz.qamqor.repository;

import kz.qamqor.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, String> {
    List<Review> findAllByTargetId(String targetId);

    void deleteAllByAuthorIdOrTargetId(String authorId, String targetId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.target.id = :targetId")
    Optional<Double> findAverageRatingByTargetId(String targetId);
}
