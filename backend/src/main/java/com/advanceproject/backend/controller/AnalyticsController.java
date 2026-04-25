package com.advanceproject.backend.controller;

import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.service.AnalyticsService;
import com.advanceproject.backend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final UserService userService;

    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("pong");
    }

    public AnalyticsController(AnalyticsService analyticsService, UserService userService) {
        this.analyticsService = analyticsService;
        this.userService = userService;
    }

    @GetMapping("/admin")
    public ResponseEntity<Map<String, Object>> getAdminAnalytics(Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!"ADMIN".equalsIgnoreCase(user.getRoleType())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(analyticsService.getAdminAnalytics());
    }

    @GetMapping("/corporate")
    public ResponseEntity<Map<String, Object>> getCorporateAnalytics(Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!"CORPORATE".equalsIgnoreCase(user.getRoleType()) && !"ADMIN".equalsIgnoreCase(user.getRoleType())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(analyticsService.getCorporateAnalytics(user.getId()));
    }

    @GetMapping("/individual")
    public ResponseEntity<?> getIndividualAnalytics(Authentication authentication) {
        try {
            if (authentication == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Authentication is null"));
            }
            User user = userService.getUserByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found: " + authentication.getName()));

            return ResponseEntity.ok(analyticsService.getIndividualAnalytics(user.getId()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                "error", "Failed to load individual analytics",
                "message", e.getMessage(),
                "type", e.getClass().getName()
            ));
        }
    }
}
