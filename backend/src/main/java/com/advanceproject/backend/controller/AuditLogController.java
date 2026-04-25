package com.advanceproject.backend.controller;

import com.advanceproject.backend.entity.AuditLog;
import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.repository.AuditLogRepository;
import com.advanceproject.backend.service.UserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;
    private final UserService userService;

    public AuditLogController(AuditLogRepository auditLogRepository, UserService userService) {
        this.auditLogRepository = auditLogRepository;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<Page<Map<String, Object>>> getAuditLogs(
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) String action,
            Pageable pageable
    ) {
        Page<AuditLog> logs;

        if (userId != null && action != null && !action.isBlank()) {
            logs = auditLogRepository.findByUser_IdAndActionContainingIgnoreCase(userId, action.trim(), pageable);
        } else if (userId != null) {
            logs = auditLogRepository.findByUser_Id(userId, pageable);
        } else if (action != null && !action.isBlank()) {
            logs = auditLogRepository.findByActionContainingIgnoreCase(action.trim(), pageable);
        } else {
            logs = auditLogRepository.findAll(pageable);
        }

        Page<Map<String, Object>> payload = logs.map(this::toPayload);
        return ResponseEntity.ok(payload);
    }

    private Map<String, Object> toPayload(AuditLog log) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", log.getId());
        row.put("action", log.getAction());
        row.put("details", log.getDetails());
        row.put("timestamp", log.getTimestamp());

        Integer uid = log.getUser() != null ? log.getUser().getId() : null;
        String email = null;
        if (uid != null) {
            User user = userService.getUserById(uid).orElse(null);
            if (user != null) {
                email = user.getEmail();
            }
        }
        row.put("userId", uid);
        row.put("userEmail", email);
        return row;
    }
}
