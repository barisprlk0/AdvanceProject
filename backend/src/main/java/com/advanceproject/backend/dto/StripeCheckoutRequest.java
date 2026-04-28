package com.advanceproject.backend.dto;

import lombok.Data;

import java.util.List;

@Data
public class StripeCheckoutRequest {
    private List<OrderRequest> orders;
}
