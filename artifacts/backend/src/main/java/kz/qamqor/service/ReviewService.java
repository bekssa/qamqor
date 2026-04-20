package kz.qamqor.service;

import kz.qamqor.dto.request.CreateReviewDto;
import kz.qamqor.dto.response.ReviewDto;
import kz.qamqor.entity.Review;
import kz.qamqor.entity.User;
import kz.qamqor.exception.AppException;
import kz.qamqor.repository.ReviewRepository;
import kz.qamqor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private static final Logger log = LoggerFactory.getLogger(ReviewService.class);

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;

    public List<ReviewDto> getByTargetId(String targetId) {
        List<ReviewDto> list = reviewRepository.findAllByTargetId(targetId).stream()
            .map(ReviewDto::from)
            .toList();
        log.debug("[REVIEW] getByTarget targetId={} count={}", targetId, list.size());
        return list;
    }

    @Transactional
    public ReviewDto create(CreateReviewDto dto) {
        log.info("[REVIEW] create authorId={} targetId={} rating={}", dto.authorId(), dto.targetId(), dto.rating());

        User author = findUser(dto.authorId());
        User target = findUser(dto.targetId());

        Review review = Review.builder()
            .author(author)
            .target(target)
            .rating(dto.rating())
            .comment(dto.comment())
            .build();

        ReviewDto result = ReviewDto.from(reviewRepository.save(review));
        log.info("[REVIEW] Created id={} author={} target={} rating={}", result.id(), dto.authorId(), dto.targetId(), dto.rating());
        return result;
    }

    private User findUser(String id) {
        return userRepository.findById(id)
            .orElseThrow(() -> {
                log.warn("[REVIEW] User not found id={}", id);
                return new AppException("User not found: " + id, HttpStatus.NOT_FOUND);
            });
    }
}
