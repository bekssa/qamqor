package kz.qamqor.controller;

import jakarta.validation.Valid;
import kz.qamqor.dto.request.CreateReviewDto;
import kz.qamqor.dto.response.ReviewDto;
import kz.qamqor.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping("/api/v1/users/{userId}/reviews")
    public ResponseEntity<List<ReviewDto>> getByUser(@PathVariable String userId) {
        return ResponseEntity.ok(reviewService.getByTargetId(userId));
    }

    @PostMapping("/api/v1/reviews")
    public ResponseEntity<ReviewDto> create(@Valid @RequestBody CreateReviewDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.create(dto));
    }
}
