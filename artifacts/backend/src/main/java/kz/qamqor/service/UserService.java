package kz.qamqor.service;

import kz.qamqor.dto.request.UpdateProfileRequest;
import kz.qamqor.dto.response.UserDto;
import kz.qamqor.entity.User;
import kz.qamqor.exception.AppException;
import kz.qamqor.repository.CategoryRepository;
import kz.qamqor.repository.ChatRepository;
import kz.qamqor.repository.MessageRepository;
import kz.qamqor.repository.OtpCodeRepository;
import kz.qamqor.repository.ReviewRepository;
import kz.qamqor.repository.ServiceRequestRepository;
import kz.qamqor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final CategoryRepository categoryRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final MessageRepository messageRepository;
    private final ChatRepository chatRepository;
    private final OtpCodeRepository otpCodeRepository;
    private final MinioService minioService;

    public UserDto getById(String id) {
        log.debug("[USER] getById id={}", id);
        User user = userRepository.findById(id)
            .orElseThrow(() -> {
                log.warn("[USER] Not found id={}", id);
                return new AppException("User not found", HttpStatus.NOT_FOUND);
            });
        Double rating = reviewRepository.findAverageRatingByTargetId(id).orElse(null);
        log.debug("[USER] Found id={} email={} role={} rating={}", id, user.getEmail(), user.getRole(), rating);
        return UserDto.from(user, rating);
    }

    public UserDto deleteAvatar(User principal) {
        User user = userRepository.findById(principal.getId())
            .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));
        user.setAvatarUrl(null);
        userRepository.save(user);
        log.info("[USER] Avatar deleted userId={}", user.getId());
        Double rating = reviewRepository.findAverageRatingByTargetId(user.getId()).orElse(null);
        return UserDto.from(user, rating);
    }

    public UserDto updateAvatar(User principal, MultipartFile file) {
        log.debug("[USER] updateAvatar userId={}", principal.getId());
        User user = userRepository.findById(principal.getId())
            .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));
        String url = minioService.uploadAvatar(user.getId(), file);
        user.setAvatarUrl(url);
        userRepository.save(user);
        log.info("[USER] Avatar updated userId={} url={}", user.getId(), url);
        Double rating = reviewRepository.findAverageRatingByTargetId(user.getId()).orElse(null);
        return UserDto.from(user, rating);
    }

    public UserDto updateCategories(User principal, List<String> keys) {
        User user = userRepository.findById(principal.getId())
            .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));
        user.setCategories(categoryRepository.findAllByKeyIn(keys));
        userRepository.save(user);
        log.info("[USER] Categories updated userId={} keys={}", user.getId(), keys);
        Double rating = reviewRepository.findAverageRatingByTargetId(user.getId()).orElse(null);
        return UserDto.from(user, rating);
    }

    public UserDto updateMe(User principal, UpdateProfileRequest req) {
        log.debug("[USER] updateMe userId={}", principal.getId());
        User user = userRepository.findById(principal.getId())
            .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        if (req.firstName() != null) user.setFirstName(req.firstName());
        if (req.lastName() != null)  user.setLastName(req.lastName());
        if (req.firstName() != null || req.lastName() != null) {
            String fn = req.firstName() != null ? req.firstName() : (user.getFirstName() != null ? user.getFirstName() : "");
            String ln = req.lastName()  != null ? req.lastName()  : (user.getLastName()  != null ? user.getLastName()  : "");
            user.setName((!ln.isBlank() && !fn.isBlank()) ? ln + " " + fn : (!ln.isBlank() ? ln : fn));
        }
        if (req.phone() != null) user.setPhone(req.phone());
        if (req.city()  != null) user.setCity(req.city());
        if (req.role()  != null) {
            user.setRole("offer-help".equals(req.role()) ? User.Role.VOLUNTEER : User.Role.ELDERLY);
        }
        if (req.aboutMe() != null) {
            String trimmed = req.aboutMe().trim();
            long wordCount = trimmed.isEmpty() ? 0 : trimmed.split("\\s+").length;
            if (wordCount > 100) throw new kz.qamqor.exception.AppException("aboutMe must not exceed 100 words", org.springframework.http.HttpStatus.BAD_REQUEST);
            user.setAboutMe(trimmed.isEmpty() ? null : trimmed);
        }

        userRepository.save(user);
        log.info("[USER] updateMe userId={} updated", user.getId());
        Double rating = reviewRepository.findAverageRatingByTargetId(user.getId()).orElse(null);
        return UserDto.from(user, rating);
    }

    @Transactional
    public void deleteMe(User principal) {
        String userId = principal.getId();
        String email  = principal.getEmail();
        log.info("[USER] deleteMe started userId={} email={}", userId, email);

        // 1. OTP codes
        otpCodeRepository.deleteAllByEmailOrExpiresAtBefore(email, java.time.Instant.MAX);

        // 2. Messages sent by the user
        messageRepository.deleteAllBySenderId(userId);

        // 3. Remove user from chat_participants join table, then delete empty chats
        chatRepository.removeUserFromAllChats(userId);
        chatRepository.findAllByParticipantId(userId).forEach(c -> chatRepository.delete(c)); // shouldn't find any now

        // 4. Reviews where this user is author or target
        reviewRepository.deleteAllByAuthorIdOrTargetId(userId, userId);

        // 5. Service requests: nullify executor refs, then delete authored requests
        serviceRequestRepository.clearExecutorByUserId(userId);
        serviceRequestRepository.deleteAllByAuthorId(userId);

        // 6. Delete user
        userRepository.deleteById(userId);
        log.info("[USER] deleteMe completed userId={}", userId);
    }

    public List<UserDto> getByRole(String role) {
        log.debug("[USER] getByRole role={}", role);
        User.Role userRole;
        try {
            userRole = User.Role.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("[USER] Unknown role requested: {}", role);
            throw new AppException("Unknown role: " + role, HttpStatus.BAD_REQUEST);
        }
        List<UserDto> result = userRepository.findAllByRole(userRole).stream()
            .map(u -> UserDto.from(u, reviewRepository.findAverageRatingByTargetId(u.getId()).orElse(null)))
            .toList();
        log.info("[USER] getByRole role={} count={}", role, result.size());
        return result;
    }
}
