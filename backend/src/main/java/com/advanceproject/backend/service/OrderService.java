package com.advanceproject.backend.service;

import com.advanceproject.backend.entity.Order;
import com.advanceproject.backend.entity.OrderItem;
import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.entity.Store;
import com.advanceproject.backend.repository.OrderRepository;
import com.advanceproject.backend.repository.OrderItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;

    @Autowired
    public OrderService(OrderRepository orderRepository, OrderItemRepository orderItemRepository) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
    }

    // Yeni Sipariş Oluşturma (İş Kuralları burada işliyor)
    public Order createOrder(User user, Store store, List<OrderItem> items, String paymentMethod) {
        Order newOrder = new Order();
        newOrder.setUser(user);
        newOrder.setStore(store);
        newOrder.setOrderDate(LocalDateTime.now());
        newOrder.setStatus("pending"); // Yeni sipariş her zaman beklemededir
        newOrder.setPaymentMethod(paymentMethod);

        // Toplam tutarı hesaplama mantığı (Business Logic)
        BigDecimal grandTotal = BigDecimal.ZERO;
        if (items != null) {
            for (OrderItem item : items) {
                // Fiyat ile miktarı çarpıyoruz: price * quantity
                BigDecimal itemTotal = item.getPrice().multiply(new BigDecimal(item.getQuantity()));
                grandTotal = grandTotal.add(itemTotal);
            }
        }
        newOrder.setGrandTotal(grandTotal);

        // Önce siparişi veritabanına kaydediyoruz
        Order savedOrder = orderRepository.save(newOrder);

        // Sonra siparişin içindeki ürünleri (order_items) veritabanına kaydediyoruz
        if (items != null) {
            for (OrderItem item : items) {
                item.setOrder(savedOrder);
                orderItemRepository.save(item);
            }
        }

        return savedOrder;
    }

    // Tüm siparişleri listeleme
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }
}
