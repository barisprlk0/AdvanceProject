package com.advanceproject.backend.service.chat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class GeminiChatClient {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String apiKey;
    private final String model;

    public GeminiChatClient(
            @Value("${ai.gemini.api-key:}") String apiKey,
            @Value("${ai.gemini.model:gemini-flash-latest}") String model
    ) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = normalizeModelName(model);
    }

    public boolean isEnabled() {
        return !apiKey.isBlank();
    }

    public String complete(String systemPrompt, String userPrompt) {
        if (!isEnabled()) {
            return null;
        }

        try {
            RestClient restClient = RestClient.builder()
                    .baseUrl("https://generativelanguage.googleapis.com/v1beta/models")
                    .defaultHeader("X-goog-api-key", apiKey)
                    .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .build();

            Map<String, Object> payload = Map.of(
                    "systemInstruction", Map.of(
                            "parts", List.of(Map.of("text", systemPrompt))
                    ),
                    "contents", List.of(Map.of(
                            "role", "user",
                            "parts", List.of(Map.of("text", userPrompt))
                    )),
                    "generationConfig", Map.of("temperature", 0.1)
            );

            String response = restClient.post()
                    .uri("/" + model + ":generateContent")
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            if (response == null || response.isBlank()) {
                return null;
            }

            String text = extractText(response);
            if (text == null || text.isBlank()) {
                return null;
            }

            return text.trim();
        } catch (Exception ignored) {
            return null;
        }
    }

    private String normalizeModelName(String rawModel) {
        String value = rawModel == null || rawModel.isBlank() ? "gemini-flash-latest" : rawModel.trim();
        if (value.startsWith("models/")) {
            return value.substring("models/".length());
        }
        return value;
    }

    private String extractText(String response) throws Exception {
        JsonNode parts = objectMapper.readTree(response)
                .path("candidates")
                .path(0)
                .path("content")
                .path("parts");
        if (!parts.isArray()) {
            return null;
        }

        StringBuilder text = new StringBuilder();
        for (JsonNode part : parts) {
            JsonNode value = part.path("text");
            if (value.isTextual()) {
                text.append(value.asText());
            }
        }
        return text.toString();
    }
}
