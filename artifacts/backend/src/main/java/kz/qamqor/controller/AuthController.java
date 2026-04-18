package kz.qamqor.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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
        authService.sendOtp(request);
        return ResponseEntity.ok(Map.of("message", "OTP sent to " + request.email()));
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
}
