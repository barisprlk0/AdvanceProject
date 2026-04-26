package com.advanceproject.backend.controller;

import com.advanceproject.backend.dto.AuthResponse;
import com.advanceproject.backend.dto.LoginRequest;
import com.advanceproject.backend.dto.RefreshTokenRequest;
import com.advanceproject.backend.dto.RegisterRequest;
import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.security.JwtUtil;
import com.advanceproject.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.Locale;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtUtil jwtUtil;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public AuthController(AuthenticationManager authenticationManager,
                          UserDetailsService userDetailsService,
                          JwtUtil jwtUtil,
                          UserService userService,
                          PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtUtil = jwtUtil;
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        String email = loginRequest.getEmail().trim().toLowerCase();
        String password = loginRequest.getPassword().trim();

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password)
        );

        final UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        final String jwt = jwtUtil.generateAccessToken(userDetails);
        final String refreshToken = jwtUtil.generateRefreshToken(userDetails);
        
        User user = userService.getUserByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found after authentication"));

        return ResponseEntity.ok(new AuthResponse(
                jwt, 
                refreshToken,
                user.getEmail(), 
                user.getId(), 
                user.getRoleType(), 
                user.getGender()
        ));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest registerRequest) {
        String email = registerRequest.getEmail().trim().toLowerCase();
        String password = registerRequest.getPassword().trim();

        if (userService.getUserByEmail(email).isPresent()) {
            throw new RuntimeException("Bu e-posta adresi zaten kayitli.");
        }

        User newUser = new User();
        newUser.setEmail(email);
        newUser.setPasswordHash(passwordEncoder.encode(password));
        newUser.setRoleType(resolveSelfRegistrationRole(registerRequest.getRoleType()));
        newUser.setGender(registerRequest.getGender());

        User savedUser = userService.registerUser(newUser);

        final UserDetails userDetails = userDetailsService.loadUserByUsername(savedUser.getEmail());
        final String jwt = jwtUtil.generateAccessToken(userDetails);
        final String refreshToken = jwtUtil.generateRefreshToken(userDetails);

        return ResponseEntity.ok(new AuthResponse(
                jwt, 
                refreshToken,
                savedUser.getEmail(), 
                savedUser.getId(), 
                savedUser.getRoleType(), 
                savedUser.getGender()
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new RuntimeException("Refresh token is required.");
        }

        String email = jwtUtil.extractUsername(refreshToken);
        final UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        if (!userDetails.isEnabled()) {
            throw new RuntimeException("User account is suspended.");
        }
        if (!jwtUtil.validateRefreshToken(refreshToken, userDetails.getUsername())) {
            throw new RuntimeException("Refresh token is invalid or expired.");
        }

        User user = userService.getUserByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        final String newAccessToken = jwtUtil.generateAccessToken(userDetails);
        final String newRefreshToken = jwtUtil.generateRefreshToken(userDetails);

        return ResponseEntity.ok(new AuthResponse(
                newAccessToken,
                newRefreshToken,
                user.getEmail(),
                user.getId(),
                user.getRoleType(),
                user.getGender()
        ));
    }

    private String resolveSelfRegistrationRole(String requestedRole) {
        if (requestedRole == null || requestedRole.isBlank()) {
            return "INDIVIDUAL";
        }

        String normalized = requestedRole.trim().toUpperCase(Locale.ROOT);
        if ("INDIVIDUAL".equals(normalized) || "CORPORATE".equals(normalized)) {
            return normalized;
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This role cannot be assigned during self-registration.");
    }
}
