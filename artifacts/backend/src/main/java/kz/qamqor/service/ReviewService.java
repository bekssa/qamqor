package kz.qamqor.service;

import kz.qamqor.dto.request.CreateReviewDto;
import kz.qamqor.dto.response.ReviewDto;
import kz.qamqor.entity.Review;
import kz.qamqor.entity.User;
import kz.qamqor.exception.AppException;
import kz.qamqor.repository.ReviewRepository;
import kz.qamqor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;

    public List<ReviewDto> getByTargetId(String targetId) {
        return reviewRepository.findAllByTargetId(targetId).stream()
            .map(ReviewDto::from)
            .toList();
    }

    @Transactional
    public ReviewDto create(CreateReviewDto dto) {
        User author = findUser(dto.authorId());
        User target = findUser(dto.targetId());

        Review review = Review.builder()
            .author(author)
            .target(target)
            .rating(dto.rating())
            .comment(dto.comment())
            .build();

        return ReviewDto.from(reviewRepository.save(review));
    }

    private User findUser(String id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new AppException("User not found: " + id, HttpStatus.NOT_FOUND));
    }
}
