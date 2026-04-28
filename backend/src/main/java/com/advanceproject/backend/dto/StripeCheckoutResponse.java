package com.advanceproject.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class StripeCheckoutResponse {
    private String sessionId;
    private String checkoutUrl;
}
