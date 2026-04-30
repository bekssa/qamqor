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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
public class GeminiModerationService {

    @Value("${gemini.api-key:}")
    private String apiKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    // Finds the first {...} block in arbitrary text
    private static final Pattern JSON_BLOCK = Pattern.compile("\\{[\\s\\S]*}", Pattern.DOTALL);

    public record ModerationResult(List<String> violations, String explanation) {
        public boolean isClean() { return violations.isEmpty(); }
    }

    public ModerationResult check(String text) {
        if (apiKey == null || apiKey.isBlank()) {
            log.debug("[MODERATION] Gemini key not set, skipping");
            return new ModerationResult(List.of(), "");
        }
        if (text == null || text.isBlank()) {
            return new ModerationResult(List.of(), "");
        }

        try {
            String prompt = """
                Ты — модератор чата платформы взаимопомощи пожилым людям (Казахстан).
                Проверь сообщение на нарушения. Категории (используй только эти коды):
                PROFANITY, FRAUD, THREATS, PERSONAL_DATA, SPAM, HATE_SPEECH.

                Сообщение: "%s"

                Ответь ТОЛЬКО в JSON, без лишнего текста:
                {"violations":["КОД"],"explanation":"краткое пояснение"}
                Если нарушений нет: {"violations":[],"explanation":""}
                """.formatted(text.replace("\"", "\\\"").replace("\n", " "));

            String requestBody = objectMapper.writeValueAsString(new java.util.LinkedHashMap<>() {{
                put("contents", List.of(new java.util.LinkedHashMap<>() {{
                    put("parts", List.of(new java.util.LinkedHashMap<>() {{
                        put("text", prompt);
                    }}));
                }}));
                put("generationConfig", new java.util.LinkedHashMap<>() {{
                    put("temperature", 0);
                    put("maxOutputTokens", 512);
                    put("responseMimeType", "application/json");
                }});
            }});
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + apiKey;

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .timeout(Duration.ofSeconds(25))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("[MODERATION] Gemini returned {}: {}", response.statusCode(), response.body());
                return new ModerationResult(List.of(), "");
            }

            JsonNode root = objectMapper.readTree(response.body());
            String content = root.path("candidates").get(0)
                .path("content").path("parts").get(0).path("text").asText("{}");

            String json = extractJson(content);
            log.debug("[MODERATION] raw content='{}' extracted='{}'", content, json);

            JsonNode result = objectMapper.readTree(json);
            List<String> violations = new ArrayList<>();
            result.path("violations").forEach(v -> {
                String code = v.asText().trim();
                if (!code.isEmpty()) violations.add(code);
            });
            String explanation = result.path("explanation").asText("");

            log.info("[MODERATION] text='{}...' violations={}", text.substring(0, Math.min(40, text.length())), violations);
            return new ModerationResult(violations, explanation);

        } catch (Exception e) {
            log.warn("[MODERATION] Gemini check failed: {}", e.getMessage());
            return new ModerationResult(List.of(), "");
        }
    }

    private String extractJson(String raw) {
        if (raw == null || raw.isBlank()) return "{}";

        // Strip markdown code fences first
        String s = raw.trim();
        if (s.startsWith("```")) {
            s = s.replaceAll("(?s)^```[a-z]*\\s*", "").replaceAll("```\\s*$", "").trim();
        }

        // Find first { ... } block
        Matcher m = JSON_BLOCK.matcher(s);
        if (m.find()) return m.group();

        return "{}";
    }
}
