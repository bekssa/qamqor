package kz.qamqor.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kz.qamqor.dto.request.CreateReviewDto;
import kz.qamqor.dto.response.ReviewDto;
import kz.qamqor.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Reviews", description = "Отзывы о волонтёрах и пользователях")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @Operation(
        summary = "Получить отзывы о пользователе",
        description = "Возвращает все отзывы, оставленные о пользователе с указанным `userId`.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Список отзывов"),
            @ApiResponse(responseCode = "404", description = "Пользователь не найден",
                content = @Content(schema = @Schema(hidden = true)))
        }
    )
    @GetMapping("/api/v1/users/{userId}/reviews")
    public ResponseEntity<List<ReviewDto>> getByUser(@PathVariable String userId) {
        return ResponseEntity.ok(reviewService.getByTargetId(userId));
    }

    @Operation(
        summary = "Оставить отзыв",
        description = "Создаёт отзыв. Поле `rating` — от 1 до 5.",
        responses = {
            @ApiResponse(responseCode = "201", description = "Отзыв создан",
                content = @Content(schema = @Schema(implementation = ReviewDto.class))),
            @ApiResponse(responseCode = "400", description = "Ошибка валидации",
                content = @Content(schema = @Schema(hidden = true))),
            @ApiResponse(responseCode = "404", description = "Автор или цель не найдены",
                content = @Content(schema = @Schema(hidden = true)))
        }
    )
    @PostMapping("/api/v1/reviews")
    public ResponseEntity<ReviewDto> create(@Valid @RequestBody CreateReviewDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.create(dto));
    }
}
