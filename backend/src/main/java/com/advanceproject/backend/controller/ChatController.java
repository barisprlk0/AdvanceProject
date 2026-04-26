package com.advanceproject.backend.controller;

import com.advanceproject.backend.dto.ChatAskRequest;
import com.advanceproject.backend.dto.ChatAskResponse;
import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.service.UserService;
import com.advanceproject.backend.service.chat.MultiAgentChatService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
public class ChatController {
    private final MultiAgentChatService chatService;
    private final UserService userService;

    public ChatController(MultiAgentChatService chatService, UserService userService) {
        this.chatService = chatService;
        this.userService = userService;
    }

    @PostMapping("/ask")
    public ResponseEntity<ChatAskResponse> ask(@Valid @RequestBody ChatAskRequest request, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(chatService.ask(request, user));
    }
}
