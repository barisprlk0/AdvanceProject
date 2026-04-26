package com.advanceproject.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class OrderRequest {
    private Integer storeId;
    private String paymentMethod;
    private List<OrderItemRequest> items;

    @Data
    public static class OrderItemRequest {
        private Integer productId;
        private Integer quantity;
    }
}
