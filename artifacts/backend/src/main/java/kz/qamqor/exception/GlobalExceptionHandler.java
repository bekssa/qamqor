package kz.qamqor.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AppException.class)
    public ResponseEntity<Map<String, String>> handleApp(AppException ex) {
        if (ex.getStatus().is5xxServerError()) {
            log.error("[ERROR] AppException status={} message={}", ex.getStatus().value(), ex.getMessage());
        } else {
            log.warn("[WARN] AppException status={} message={}", ex.getStatus().value(), ex.getMessage());
        }
        return ResponseEntity.status(ex.getStatus())
            .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(
                FieldError::getField,
                f -> f.getDefaultMessage() != null ? f.getDefaultMessage() : "invalid"
            ));
        log.warn("[VALIDATION] Failed fields={}", errors);
        return ResponseEntity.badRequest().body(errors);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegal(IllegalArgumentException ex) {
        log.warn("[WARN] IllegalArgumentException message={}", ex.getMessage());
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleUnexpected(Exception ex) {
        log.error("[ERROR] Unexpected exception type={} message={}", ex.getClass().getSimpleName(), ex.getMessage(), ex);
        return ResponseEntity.internalServerError().body(Map.of("error", "Internal server error"));
    }
}
