package kz.qamqor.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import kz.qamqor.dto.response.UserDto;
import kz.qamqor.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Users", description = "Управление пользователями и волонтёрами")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(
        summary = "Получить список пользователей",
        description = "Возвращает всех пользователей. Параметр `role` фильтрует по роли: " +
                      "`volunteer`, `elderly`, `admin`.",
        parameters = @Parameter(name = "role", description = "Роль пользователя",
            example = "volunteer", schema = @Schema(allowableValues = {"volunteer", "elderly", "admin"})),
        responses = {
            @ApiResponse(responseCode = "200", description = "Список пользователей"),
            @ApiResponse(responseCode = "401", description = "Не авторизован",
                content = @Content(schema = @Schema(hidden = true)))
        }
    )
    @GetMapping
    public ResponseEntity<List<UserDto>> list(@RequestParam(required = false) String role) {
        if (role != null) {
            return ResponseEntity.ok(userService.getByRole(role));
        }
        return ResponseEntity.ok(userService.getByRole("volunteer"));
    }

    @Operation(
        summary = "Получить пользователя по ID",
        responses = {
            @ApiResponse(responseCode = "200", description = "Пользователь найден",
                content = @Content(schema = @Schema(implementation = UserDto.class))),
            @ApiResponse(responseCode = "404", description = "Пользователь не найден",
                content = @Content(schema = @Schema(hidden = true))),
            @ApiResponse(responseCode = "401", description = "Не авторизован",
                content = @Content(schema = @Schema(hidden = true)))
        }
    )
    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getById(@PathVariable String id) {
        return ResponseEntity.ok(userService.getById(id));
    }
}
