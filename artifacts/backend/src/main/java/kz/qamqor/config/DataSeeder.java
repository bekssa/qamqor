package kz.qamqor.config;

import kz.qamqor.entity.Category;
import kz.qamqor.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private final CategoryRepository categoryRepository;

    @Override
    public void run(ApplicationArguments args) {
        seedCategories();
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
}
