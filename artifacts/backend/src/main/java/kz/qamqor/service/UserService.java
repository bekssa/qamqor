package kz.qamqor.service;

import kz.qamqor.dto.response.UserDto;
import kz.qamqor.entity.User;
import kz.qamqor.exception.AppException;
import kz.qamqor.repository.ReviewRepository;
import kz.qamqor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;

    public UserDto getById(String id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));
        Double rating = reviewRepository.findAverageRatingByTargetId(id).orElse(null);
        return UserDto.from(user, rating);
    }

    public List<UserDto> getByRole(String role) {
        User.Role userRole = User.Role.valueOf(role.toUpperCase());
        return userRepository.findAllByRole(userRole).stream()
            .map(u -> UserDto.from(u, reviewRepository.findAverageRatingByTargetId(u.getId()).orElse(null)))
            .toList();
    }
}
