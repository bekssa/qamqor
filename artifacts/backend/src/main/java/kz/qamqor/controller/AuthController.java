package kz.qamqor.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kz.qamqor.dto.request.LoginRequest;
import kz.qamqor.dto.request.SendOtpRequest;
import kz.qamqor.dto.request.VerifyOtpRequest;
import kz.qamqor.dto.response.AuthResponse;
import kz.qamqor.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "Auth", description = "Аутентификация через OTP-код на email")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(
        summary = "Отправить OTP-код на email",
        description = "Генерирует 4-значный код и отправляет его на указанный email. " +
                      "Код действителен 5 минут. Предыдущие коды инвалидируются.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Код отправлен",
                content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    examples = @ExampleObject(value = """
                        { "message": "OTP sent to user@example.com" }
                        """))),
            @ApiResponse(responseCode = "400", description = "Невалидный email",
                content = @Content(schema = @Schema(hidden = true)))
        }
    )
    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, String>> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        String code = authService.sendOtp(request);
        // DEV ONLY: code returned in response so auth works without a working mail server.
        // Remove "dev_code" field before going to production.
        return ResponseEntity.ok(Map.of(
            "message", "OTP sent to " + request.email(),
            "dev_code", code
        ));
    }

    @Operation(
        summary = "Подтвердить OTP-код",
        description = "Проверяет код. При успехе создаёт пользователя (если новый) " +
                      "или авторизует существующего. Возвращает JWT-токен.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Авторизация успешна",
                content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = AuthResponse.class))),
            @ApiResponse(responseCode = "400", description = "Неверный или просроченный код",
                content = @Content(schema = @Schema(hidden = true)))
        }
    )
    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        return ResponseEntity.ok(authService.verifyOtp(request));
    }

    @Operation(
        summary = "Войти по паролю",
        description = "Вход по email и паролю. Пароль задаётся при первой регистрации через OTP.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Авторизация успешна",
                content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = AuthResponse.class))),
            @ApiResponse(responseCode = "401", description = "Неверный email или пароль",
                content = @Content(schema = @Schema(hidden = true)))
        }
    )
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}
