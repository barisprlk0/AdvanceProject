package com.advanceproject.backend.controller;

import com.advanceproject.backend.dto.StripeCheckoutRequest;
import com.advanceproject.backend.dto.StripeCheckoutResponse;
import com.advanceproject.backend.dto.StripeCompleteRequest;
import com.advanceproject.backend.dto.StripeCompleteResponse;
import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.service.StripePaymentService;
import com.advanceproject.backend.service.UserService;
import com.stripe.exception.StripeException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final StripePaymentService stripePaymentService;
    private final UserService userService;

    public PaymentController(StripePaymentService stripePaymentService, UserService userService) {
        this.stripePaymentService = stripePaymentService;
        this.userService = userService;
    }

    @PostMapping("/checkout-session")
    public ResponseEntity<StripeCheckoutResponse> createCheckoutSession(
            @RequestBody StripeCheckoutRequest request,
            Authentication authentication
    ) throws StripeException {
        User user = currentUser(authentication);
        return ResponseEntity.ok(stripePaymentService.createCheckoutSession(user, request));
    }

    @PostMapping("/complete")
    public ResponseEntity<StripeCompleteResponse> completeCheckout(
            @RequestBody StripeCompleteRequest request,
            Authentication authentication
    ) throws StripeException {
        User user = currentUser(authentication);
        return ResponseEntity.ok(stripePaymentService.completeCheckout(user, request));
    }

    private User currentUser(Authentication authentication) {
        return userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
