package kz.qamqor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Проверяет текст сообщения через OpenAI Chat API на наличие:
 * - Нецензурной лексики (PROFANITY)
 * - Мошенничества / фишинга (FRAUD)
 * - Угроз и насилия (THREATS)
 * - Персональных данных (PERSONAL_DATA)
 * - Спама / рекламы (SPAM)
 * - Дискриминации / ненависти (HATE_SPEECH)
 *
 * Возвращает ModerationResult — список нарушений (пусто = чисто).
 * Если OPENAI_API_KEY не задан — пропускает проверку (graceful degradation).
 */
@Slf4j
@Service
public class OpenAiModerationService {

    @Value("${openai.api-key:}")
    private String apiKey;

    @Value("${openai.model:gpt-4o-mini}")
    private String model;

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    public record ModerationResult(List<String> violations, String explanation) {
        public boolean isClean() { return violations.isEmpty(); }
    }

    public ModerationResult check(String text) {
        if (apiKey == null || apiKey.isBlank()) {
            log.debug("[MODERATION] OpenAI key not set, skipping moderation");
            return new ModerationResult(List.of(), "");
        }
        if (text == null || text.isBlank()) {
            return new ModerationResult(List.of(), "");
        }

        try {
            String prompt = """
                Ты — модератор чата платформы взаимопомощи пожилым людям (Казахстан).
                Проверь следующее сообщение и определи, содержит ли оно нарушения.

                Категории нарушений (используй только эти коды):
                - PROFANITY: нецензурная лексика, оскорбления, маты (на любом языке)
                - FRAUD: мошенничество, фишинг, просьбы перевести деньги, подозрительные ссылки
                - THREATS: угрозы, запугивание, насилие
                - PERSONAL_DATA: публикация чужих персональных данных (номера карт, паспортов, адресов)
                - SPAM: спам, реклама, нерелевантные массовые рассылки
                - HATE_SPEECH: дискриминация, ненависть по национальности, религии, полу

                Сообщение: "%s"

                Ответь строго в JSON формате:
                {
                  "violations": ["KOD1", "KOD2"],
                  "explanation": "краткое объяснение на русском (1-2 предложения)"
                }
                Если нарушений нет — violations должен быть пустым массивом [].
                """.formatted(text.replace("\"", "\\\""));

            String requestBody = objectMapper.writeValueAsString(new java.util.LinkedHashMap<>() {{
                put("model", model);
                put("messages", List.of(
                    new java.util.LinkedHashMap<>() {{
                        put("role", "user");
                        put("content", prompt);
                    }}
                ));
                put("temperature", 0);
                put("max_tokens", 200);
            }});

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .timeout(Duration.ofSeconds(15))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("[MODERATION] OpenAI returned {}: {}", response.statusCode(), response.body());
                return new ModerationResult(List.of(), "");
            }

            JsonNode root = objectMapper.readTree(response.body());
            String content = root.path("choices").get(0).path("message").path("content").asText();

            // Extract JSON from content (may be wrapped in markdown code blocks)
            String json = content.trim();
            if (json.startsWith("```")) {
                json = json.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            }

            JsonNode result = objectMapper.readTree(json);
            List<String> violations = new ArrayList<>();
            result.path("violations").forEach(v -> violations.add(v.asText()));
            String explanation = result.path("explanation").asText("");

            log.info("[MODERATION] text='{}...' violations={}", text.substring(0, Math.min(30, text.length())), violations);
            return new ModerationResult(violations, explanation);

        } catch (Exception e) {
            log.warn("[MODERATION] Check failed: {}", e.getMessage());
            return new ModerationResult(List.of(), "");
        }
    }
}
