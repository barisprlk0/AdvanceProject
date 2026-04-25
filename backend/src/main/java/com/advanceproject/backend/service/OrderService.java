package com.advanceproject.backend.service;

import com.advanceproject.backend.entity.Order;
import com.advanceproject.backend.entity.OrderItem;
import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.entity.Store;
import com.advanceproject.backend.repository.OrderRepository;
import com.advanceproject.backend.repository.OrderItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    public Order createOrder(Order order) {
        if (order.getOrderDate() == null) {
            order.setOrderDate(LocalDateTime.now());
        }
        if (order.getStatus() == null) {
            order.setStatus("Pending");
        }
        
        // If items are provided, calculate total, otherwise keep the incoming grandTotal
        if (order.getItems() != null && !order.getItems().isEmpty()) {
            BigDecimal total = BigDecimal.ZERO;
            for (OrderItem item : order.getItems()) {
                BigDecimal itemTotal = item.getPrice().multiply(new BigDecimal(item.getQuantity()));
                total = total.add(itemTotal);
            }
            order.setGrandTotal(total);
        }

        Order savedOrder = orderRepository.save(order);

        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                item.setOrder(savedOrder);
                orderItemRepository.save(item);
            }
        }

        return savedOrder;
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public Page<Order> getAllOrders(Pageable pageable) {
        return orderRepository.findAll(pageable);
    }

    public Page<Order> getOrdersByUserId(Integer userId, Pageable pageable) {
        return orderRepository.findByUserId(userId, pageable);
    }

    public List<Order> getOrdersByUserId(Integer userId) {
        return orderRepository.findByUserId(userId);
    }

    public Page<Order> getOrdersByStoreOwnerId(Integer ownerId, Pageable pageable) {
        return orderRepository.findByStore_Owner_Id(ownerId, pageable);
    }

    public List<Order> getOrdersByStoreOwnerId(Integer ownerId) {
        return orderRepository.findByStore_Owner_Id(ownerId);
    }

    public Optional<Order> getOrderById(Integer id) {
        return orderRepository.findById(id);
    }

    public Order patchOrder(Integer id, Order partialOrder) {
        return orderRepository.findById(id).map(order -> {
            if (partialOrder.getStatus() != null) order.setStatus(partialOrder.getStatus());
            if (partialOrder.getPaymentMethod() != null) order.setPaymentMethod(partialOrder.getPaymentMethod());
            if (partialOrder.getGrandTotal() != null) order.setGrandTotal(partialOrder.getGrandTotal());
            if (partialOrder.getUser() != null) order.setUser(partialOrder.getUser());
            if (partialOrder.getStore() != null) order.setStore(partialOrder.getStore());
            return orderRepository.save(order);
        }).orElseThrow(() -> new RuntimeException("Order not found"));
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
