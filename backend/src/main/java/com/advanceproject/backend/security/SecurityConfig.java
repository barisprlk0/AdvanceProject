package com.advanceproject.backend.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    @Autowired
    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(request -> {
                    CorsConfiguration config = new CorsConfiguration();
                    config.setAllowedOrigins(List.of("*"));
                    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
                    config.setAllowedHeaders(List.of("*"));
                    return config;
                }))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/analytics/individual").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                        
                        // Product restrictions
                        .requestMatchers(HttpMethod.POST, "/api/products/**").hasAnyRole("ADMIN", "CORPORATE")
                        .requestMatchers(HttpMethod.PUT, "/api/products/**").hasAnyRole("ADMIN", "CORPORATE")
                        .requestMatchers(HttpMethod.PATCH, "/api/products/**").hasAnyRole("ADMIN", "CORPORATE")
                        .requestMatchers(HttpMethod.DELETE, "/api/products/**").hasAnyRole("ADMIN", "CORPORATE")
                        
                        // User restrictions
                        .requestMatchers(HttpMethod.GET, "/api/users/profile").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/users/profile").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/users/profile").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/users/profile/change-password").authenticated()
                        .requestMatchers("/api/users/**").hasRole("ADMIN")
                        
                        // Category restrictions
                        .requestMatchers(HttpMethod.POST, "/api/categories/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/categories/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/categories/**").hasRole("ADMIN")
                        
                        // Store restrictions
                        .requestMatchers(HttpMethod.GET, "/api/stores/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/stores/**").hasAnyRole("ADMIN", "CORPORATE")
                        .requestMatchers(HttpMethod.PUT, "/api/stores/**").hasAnyRole("ADMIN", "CORPORATE")
                        .requestMatchers(HttpMethod.DELETE, "/api/stores/**").hasRole("ADMIN")
                        
                        // Review restrictions
                        .requestMatchers(HttpMethod.DELETE, "/api/reviews/**").hasRole("ADMIN")
                        
                        // Order & Shipment status updates
                        .requestMatchers(HttpMethod.PUT, "/api/orders/**").hasAnyRole("ADMIN", "CORPORATE")
                        .requestMatchers(HttpMethod.PATCH, "/api/orders/**").hasAnyRole("ADMIN", "CORPORATE")
                        .requestMatchers(HttpMethod.DELETE, "/api/orders/**").hasAnyRole("ADMIN", "CORPORATE")
                        .requestMatchers(HttpMethod.PUT, "/api/shipments/**").hasAnyRole("ADMIN", "CORPORATE")
                        .requestMatchers(HttpMethod.PATCH, "/api/shipments/**").hasAnyRole("ADMIN", "CORPORATE")
                        .requestMatchers(HttpMethod.POST, "/api/shipments/**").hasAnyRole("ADMIN", "CORPORATE")
                        .requestMatchers(HttpMethod.DELETE, "/api/shipments/**").hasAnyRole("ADMIN", "CORPORATE")

                        // Customer profile restrictions
                        .requestMatchers(HttpMethod.GET, "/api/customer-profiles/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/customer-profiles/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/customer-profiles/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/customer-profiles/**").hasRole("ADMIN")

                        // Admin operations
                        .requestMatchers("/api/audit-logs/**").hasRole("ADMIN")
                        .requestMatchers("/api/system-settings/**").hasRole("ADMIN")
                        
                        .anyRequest().authenticated()
                )
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
