package kz.qamqor.service;

import kz.qamqor.dto.request.LoginRequest;
import kz.qamqor.dto.request.SendOtpRequest;
import kz.qamqor.dto.request.VerifyOtpRequest;
import kz.qamqor.dto.response.AuthResponse;
import kz.qamqor.dto.response.UserDto;
import kz.qamqor.entity.OtpCode;
import kz.qamqor.entity.User;
import kz.qamqor.exception.AppException;
import kz.qamqor.repository.OtpCodeRepository;
import kz.qamqor.repository.UserRepository;
import kz.qamqor.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final OtpCodeRepository otpCodeRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;
    private final JwtUtils jwtUtils;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.otp.expiration-minutes}")
    private int otpExpirationMinutes;

    @Value("${app.otp.length}")
    private int otpLength;

    @Value("${app.mail.from}")
    private String mailFrom;

    @Transactional
    public String sendOtp(SendOtpRequest request) {
        String email = request.email().toLowerCase().trim();
        log.info("[AUTH] send-otp requested for email={}", email);

        otpCodeRepository.deleteAllByEmailOrExpiresAtBefore(email, Instant.now());
        log.debug("[AUTH] invalidated previous OTPs for email={}", email);

        String code = generateCode();
        OtpCode otp = OtpCode.builder()
                .email(email)
                .code(code)
                .expiresAt(Instant.now().plus(otpExpirationMinutes, ChronoUnit.MINUTES))
                .build();
        otpCodeRepository.save(otp);
        log.debug("[AUTH] OTP saved, expires in {} min, email={}", otpExpirationMinutes, email);

        try {
            sendEmail(email, code);
            log.info("[AUTH] OTP email sent successfully to={}", email);
        } catch (Exception e) {
            log.warn("[AUTH] Email delivery FAILED for email={} reason={}", email, e.getMessage());
        }

        return code;
    }

    @Transactional
    public AuthResponse verifyOtp(VerifyOtpRequest request) {
        String email = request.email().toLowerCase().trim();
        log.info("[AUTH] verify-otp attempt for email={}", email);

        OtpCode otp = otpCodeRepository
                .findTopByEmailAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(email, Instant.now())
                .orElseThrow(() -> {
                    log.warn("[AUTH] OTP not found or expired for email={}", email);
                    return new AppException("OTP not found or expired", HttpStatus.BAD_REQUEST);
                });

        if (!otp.getCode().equals(request.code())) {
            log.warn("[AUTH] Invalid OTP code for email={}", email);
            throw new AppException("Invalid OTP code", HttpStatus.BAD_REQUEST);
        }

        otp.setUsed(true);
        otpCodeRepository.save(otp);

        boolean isNewUser = userRepository.findByEmail(email).isEmpty();
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            String fullName = buildFullName(request.firstName(), request.lastName());
            User.Role resolvedRole = resolveRole(request.role());
            User.UserBuilder builder = User.builder()
                    .email(email)
                    .name(fullName)
                    .firstName(request.firstName())
                    .lastName(request.lastName())
                    .phone(request.phone())
                    .birthDate(request.birthDate())
                    .city(request.city())
                    .role(resolvedRole)
                    .verified(true);
            if (request.password() != null && !request.password().isBlank()) {
                builder.passwordHash(passwordEncoder.encode(request.password()));
            }
            return userRepository.save(builder.build());
        });

        boolean needsSave = false;
        if (!user.isVerified()) {
            user.setVerified(true);
            needsSave = true;
        }
        if (request.password() != null && !request.password().isBlank()) {
            log.debug("[AUTH] setting password hash for email={}", email);
            user.setPasswordHash(passwordEncoder.encode(request.password()));
            needsSave = true;
        }
        // Fill missing profile fields if provided (e.g. user existed but had no name/phone)
        String fullName = buildFullName(request.firstName(), request.lastName());
        if (!fullName.isEmpty() && (user.getName() == null || user.getName().isBlank())) {
            user.setName(fullName);
            needsSave = true;
        }
        if (request.firstName() != null && !request.firstName().isBlank()
                && (user.getFirstName() == null || user.getFirstName().isBlank())) {
            user.setFirstName(request.firstName());
            needsSave = true;
        }
        if (request.lastName() != null && !request.lastName().isBlank()
                && (user.getLastName() == null || user.getLastName().isBlank())) {
            user.setLastName(request.lastName());
            needsSave = true;
        }
        if (request.phone() != null && !request.phone().isBlank()
                && (user.getPhone() == null || user.getPhone().isBlank())) {
            user.setPhone(request.phone());
            needsSave = true;
        }
        if (request.birthDate() != null && !request.birthDate().isBlank()
                && (user.getBirthDate() == null || user.getBirthDate().isBlank())) {
            user.setBirthDate(request.birthDate());
            needsSave = true;
        }
        if (request.city() != null && !request.city().isBlank()
                && (user.getCity() == null || user.getCity().isBlank())) {
            user.setCity(request.city());
            needsSave = true;
        }
        // Always apply role from registration form — overrides the default ELDERLY
        if (request.role() != null && !request.role().isBlank()) {
            User.Role resolvedRole = resolveRole(request.role());
            user.setRole(resolvedRole);
            needsSave = true;
        }
        if (needsSave) {
            userRepository.save(user);
        }

        String token = jwtUtils.generateToken(user.getId(), user.getEmail());
        log.info("[AUTH] {} verified successfully email={} userId={} role={}",
            isNewUser ? "New user registered and" : "User",
            email, user.getId(), user.getRole());

        return new AuthResponse(token, UserDto.from(user, null));
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.email().toLowerCase().trim();
        log.info("[AUTH] login attempt for email={}", email);

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> {
                log.warn("[AUTH] login failed: user not found email={}", email);
                return new AppException("Invalid email or password", HttpStatus.UNAUTHORIZED);
            });

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            log.warn("[AUTH] login failed: wrong password email={}", email);
            throw new AppException("Invalid email or password", HttpStatus.UNAUTHORIZED);
        }

        String token = jwtUtils.generateToken(user.getId(), user.getEmail());
        log.info("[AUTH] login successful email={} userId={} role={}", email, user.getId(), user.getRole());
        return new AuthResponse(token, UserDto.from(user, null));
    }

    @Transactional
    public void updatePassword(User user, String newPassword) {
        if (user == null) {
            throw new AppException("Not authenticated", HttpStatus.UNAUTHORIZED);
        }
        if (newPassword == null || newPassword.isBlank()) {
            throw new AppException("Password cannot be empty", HttpStatus.BAD_REQUEST);
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("[AUTH] password updated successfully for email={}", user.getEmail());
    }

    private String buildFullName(String firstName, String lastName) {
        String fn = firstName != null ? firstName.trim() : "";
        String ln = lastName != null ? lastName.trim() : "";
        if (!fn.isEmpty() && !ln.isEmpty()) return ln + " " + fn;
        if (!fn.isEmpty()) return fn;
        return ln;
    }

    private User.Role resolveRole(String role) {
        if ("offer-help".equals(role)) return User.Role.VOLUNTEER;
        return User.Role.ELDERLY;
    }

    private String generateCode() {
        SecureRandom random = new SecureRandom();
        int bound = (int) Math.pow(10, otpLength);
        int num = random.nextInt(bound);
        return String.format("%0" + otpLength + "d", num);
    }

    private void sendEmail(String to, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(to);
        message.setSubject("Код подтверждения — Qamqor");
        message.setText(
            "Здравствуйте!\n\n" +
            "Ваш код подтверждения: " + code + "\n\n" +
            "Код действителен " + otpExpirationMinutes + " минут.\n\n" +
            "Если вы не запрашивали этот код — просто проигнорируйте письмо."
        );
        mailSender.send(message);
    }
}
