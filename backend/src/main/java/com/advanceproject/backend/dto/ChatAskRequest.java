package com.advanceproject.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChatAskRequest {
    @NotBlank(message = "Question is required")
    private String question;

    private String sessionId;
}
