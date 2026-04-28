package com.advanceproject.backend.dto;

import com.advanceproject.backend.entity.Order;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class StripeCompleteResponse {
    private List<Order> orders;
}
