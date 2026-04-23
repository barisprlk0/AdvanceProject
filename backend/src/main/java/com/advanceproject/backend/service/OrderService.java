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
import java.util.Optional;

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

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public Optional<Order> getOrderById(Integer id) {
        return orderRepository.findById(id);
    }

    public Order updateOrder(Integer id, Order updatedOrder) {
        return orderRepository.findById(id).map(order -> {
            order.setStatus(updatedOrder.getStatus());
            order.setPaymentMethod(updatedOrder.getPaymentMethod());
            order.setGrandTotal(updatedOrder.getGrandTotal());
            order.setUser(updatedOrder.getUser());
            order.setStore(updatedOrder.getStore());
            return orderRepository.save(order);
        }).orElseThrow(() -> new RuntimeException("Order not found"));
    }

    public void deleteOrder(Integer id) {
        orderRepository.deleteById(id);
    }
}
