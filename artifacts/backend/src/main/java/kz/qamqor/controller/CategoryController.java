package kz.qamqor.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import kz.qamqor.dto.response.UserDto;
import kz.qamqor.entity.Category;
import kz.qamqor.entity.User;
import kz.qamqor.repository.CategoryRepository;
import kz.qamqor.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Categories")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryRepository categoryRepository;
    private final UserService userService;

    @Operation(summary = "Получить все категории")
    @GetMapping("/categories")
    public ResponseEntity<List<Category>> getAll() {
        return ResponseEntity.ok(categoryRepository.findAll());
    }

    @Operation(summary = "Обновить категории текущего пользователя")
    @PutMapping("/users/me/categories")
    public ResponseEntity<UserDto> updateMyCategories(
            @AuthenticationPrincipal User currentUser,
            @RequestBody List<String> categoryKeys) {
        return ResponseEntity.ok(userService.updateCategories(currentUser, categoryKeys));
    }
}
