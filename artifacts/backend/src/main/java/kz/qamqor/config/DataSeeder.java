package kz.qamqor.config;

import kz.qamqor.entity.Category;
import kz.qamqor.entity.User;
import kz.qamqor.repository.CategoryRepository;
import kz.qamqor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        seedCategories();
        seedAdmin();
    }

    private void seedCategories() {
        List<Category> defaults = List.of(
            new Category("household", "Бытовая помощь",    "уборка, приготовление еды"),
            new Category("medical",   "Медицинская помощь", "покупка лекарств, сопровождение"),
            new Category("escort",    "Сопровождение",      "поход в больницу, прогулка"),
            new Category("homework",  "Домашние работы",    "починка, мелкий ремонт"),
            new Category("shopping",  "Покупки",            "продукты, хозяйственные товары")
        );
        for (Category c : defaults) {
            if (!categoryRepository.existsById(c.getKey())) {
                categoryRepository.save(c);
                log.info("[SEED] Category saved: {}", c.getKey());
            }
        }
    }

    private void seedAdmin() {
        String adminEmail = "adminbeks@gmail.com";
        if (!userRepository.existsByEmail(adminEmail)) {
            User admin = User.builder()
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode("admin_2026"))
                .role(User.Role.ADMIN)
                .name("Администратор")
                .firstName("Администратор")
                .lastName("")
                .verified(true)
                .build();
            userRepository.save(admin);
            log.info("[SEED] Admin user created: {}", adminEmail);
        }
    }
}
