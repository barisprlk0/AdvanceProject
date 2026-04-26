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
    private final com.advanceproject.backend.repository.ProductRepository productRepository;
    private final com.advanceproject.backend.repository.StoreRepository storeRepository;
    private final com.advanceproject.backend.repository.AuditLogRepository auditLogRepository;

    @Autowired
    public OrderService(OrderRepository orderRepository, 
                        OrderItemRepository orderItemRepository,
                        com.advanceproject.backend.repository.ProductRepository productRepository,
                        com.advanceproject.backend.repository.StoreRepository storeRepository,
                        com.advanceproject.backend.repository.AuditLogRepository auditLogRepository) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
        this.storeRepository = storeRepository;
        this.auditLogRepository = auditLogRepository;
    }

    public Order createOrder(User user, com.advanceproject.backend.dto.OrderRequest request) {
        Store store = storeRepository.findById(request.getStoreId())
                .orElseThrow(() -> new RuntimeException("Store not found"));

        Order order = new Order();
        order.setUser(user);
        order.setStore(store);
        order.setOrderDate(LocalDateTime.now());
        order.setStatus("Pending");
        order.setPaymentMethod(request.getPaymentMethod());

        BigDecimal total = BigDecimal.ZERO;
        java.util.List<OrderItem> items = new java.util.ArrayList<>();

        for (com.advanceproject.backend.dto.OrderRequest.OrderItemRequest itemReq : request.getItems()) {
            com.advanceproject.backend.entity.Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + itemReq.getProductId()));

            // Check stock
            if (product.getStockQuantity() != null && product.getStockQuantity() < itemReq.getQuantity()) {
                throw new RuntimeException("Insufficient stock for product: " + product.getName());
            }

            // Reduce stock
            if (product.getStockQuantity() != null) {
                product.setStockQuantity(product.getStockQuantity() - itemReq.getQuantity());
                productRepository.save(product);
            }

            OrderItem item = new OrderItem();
            item.setProduct(product);
            item.setQuantity(itemReq.getQuantity());
            item.setPrice(product.getUnitPrice()); // Use DB price, not request price
            item.setOrder(order);
            items.add(item);

            BigDecimal itemTotal = product.getUnitPrice().multiply(new BigDecimal(itemReq.getQuantity()));
            total = total.add(itemTotal);
        }

        order.setGrandTotal(total);
        order.setItems(items);

        Order savedOrder = orderRepository.save(order);
        
        // Audit Log
        com.advanceproject.backend.entity.AuditLog log = new com.advanceproject.backend.entity.AuditLog();
        log.setUser(user);
        log.setAction("ORDER_CREATED");
        log.setDetails("Order ID: " + savedOrder.getId() + ", Total: " + total);
        log.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(log);

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
