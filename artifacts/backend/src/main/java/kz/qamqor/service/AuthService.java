package kz.qamqor.service;

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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final OtpCodeRepository otpCodeRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;
    private final JwtUtils jwtUtils;

    @Value("${app.otp.expiration-minutes}")
    private int otpExpirationMinutes;

    @Value("${app.otp.length}")
    private int otpLength;

    @Transactional
    public void sendOtp(SendOtpRequest request) {
        String email = request.email().toLowerCase().trim();

        // Invalidate previous codes for this email
        otpCodeRepository.deleteAllByEmailOrExpiresAtBefore(email, Instant.now());

        String code = generateCode();
        OtpCode otp = OtpCode.builder()
            .email(email)
            .code(code)
            .expiresAt(Instant.now().plus(otpExpirationMinutes, ChronoUnit.MINUTES))
            .build();
        otpCodeRepository.save(otp);

        sendEmail(email, code);
    }

    @Transactional
    public AuthResponse verifyOtp(VerifyOtpRequest request) {
        String email = request.email().toLowerCase().trim();

        OtpCode otp = otpCodeRepository
            .findTopByEmailAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(email, Instant.now())
            .orElseThrow(() -> new AppException("OTP not found or expired", HttpStatus.BAD_REQUEST));

        if (!otp.getCode().equals(request.code())) {
            throw new AppException("Invalid OTP code", HttpStatus.BAD_REQUEST);
        }

        otp.setUsed(true);
        otpCodeRepository.save(otp);

        User user = userRepository.findByEmail(email).orElseGet(() ->
            userRepository.save(User.builder()
                .email(email)
                .role(User.Role.ELDERLY)
                .verified(true)
                .build())
        );

        if (!user.isVerified()) {
            user.setVerified(true);
            userRepository.save(user);
        }

        String token = jwtUtils.generateToken(user.getId(), user.getEmail());
        return new AuthResponse(token, UserDto.from(user, null));
    }

    private String generateCode() {
        SecureRandom random = new SecureRandom();
        int bound = (int) Math.pow(10, otpLength);
        int num = random.nextInt(bound);
        return String.format("%0" + otpLength + "d", num);
    }

    private void sendEmail(String to, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("Ваш код подтверждения — Qamqor");
        message.setText(
            "Здравствуйте!\n\n" +
            "Ваш код подтверждения: " + code + "\n\n" +
            "Код действителен " + otpExpirationMinutes + " минут.\n\n" +
            "Если вы не запрашивали этот код, проигнорируйте письмо."
        );
        mailSender.send(message);
    }
}
