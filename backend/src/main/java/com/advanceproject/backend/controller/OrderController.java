package com.advanceproject.backend.controller;

import com.advanceproject.backend.entity.Order;
import com.advanceproject.backend.entity.Shipment;
import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.service.OrderService;
import com.advanceproject.backend.service.ShipmentService;
import com.advanceproject.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;
    private final UserService userService;
    private final ShipmentService shipmentService;

    @Autowired
    public OrderController(OrderService orderService, UserService userService, ShipmentService shipmentService) {
        this.orderService = orderService;
        this.userService = userService;
        this.shipmentService = shipmentService;
    }

    @PostMapping
    public ResponseEntity<Order> createOrder(@RequestBody com.advanceproject.backend.dto.OrderRequest request, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(orderService.createOrder(user, request));
    }

    @GetMapping
    public ResponseEntity<Page<Order>> getAllOrders(Pageable pageable, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if ("ADMIN".equalsIgnoreCase(user.getRoleType())) {
            return ResponseEntity.ok(orderService.getAllOrders(pageable));
        } else if ("CORPORATE".equalsIgnoreCase(user.getRoleType())) {
            // Corporate users see orders coming to their stores
            return ResponseEntity.ok(orderService.getOrdersByStoreOwnerId(user.getId(), pageable));
        } else {
            // Individual users see their own purchases
            return ResponseEntity.ok(orderService.getOrdersByUserId(user.getId(), pageable));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrderById(@PathVariable Integer id, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Order order = orderService.getOrderById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!canAccessOrder(user, order)) {
            return ResponseEntity.status(403).build();
        }
        
        return ResponseEntity.ok(order);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Order> updateOrder(@PathVariable Integer id, @RequestBody Order order, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Order existingOrder = orderService.getOrderById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!canManageOrder(user, existingOrder)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(orderService.updateOrder(id, order));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Order> patchOrder(@PathVariable Integer id, @RequestBody Order partialOrder, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Order existingOrder = orderService.getOrderById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!canManageOrder(user, existingOrder)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(orderService.patchOrder(id, partialOrder));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Integer id, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Order existingOrder = orderService.getOrderById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!canManageOrder(user, existingOrder)) {
            return ResponseEntity.status(403).build();
        }

        orderService.deleteOrder(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/ship")
    public ResponseEntity<Order> shipOrder(@PathVariable Integer id, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Order order = orderService.getOrderById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        // Only store owner or ADMIN can ship
        if (!"ADMIN".equalsIgnoreCase(user.getRoleType()) && !order.getStore().getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        // Update status
        order.setStatus("Shipped");
        Order updatedOrder = orderService.updateOrder(id, order);

        // Auto-create shipment
        Shipment shipment = new Shipment();
        shipment.setOrder(updatedOrder);
        shipment.setStatus("In Transit");
        shipment.setMode("Express");
        shipment.setWarehouse("Main Store");
        shipmentService.createShipment(shipment);

        return ResponseEntity.ok(updatedOrder);
    }

    private boolean canAccessOrder(User user, Order order) {
        if ("ADMIN".equalsIgnoreCase(user.getRoleType())) {
            return true;
        }
        if ("CORPORATE".equalsIgnoreCase(user.getRoleType())) {
            return order.getStore() != null
                    && order.getStore().getOwner() != null
                    && order.getStore().getOwner().getId().equals(user.getId());
        }
        return order.getUser() != null && order.getUser().getId().equals(user.getId());
    }

    private boolean canManageOrder(User user, Order order) {
        return "ADMIN".equalsIgnoreCase(user.getRoleType())
                || ("CORPORATE".equalsIgnoreCase(user.getRoleType())
                && order.getStore() != null
                && order.getStore().getOwner() != null
                && order.getStore().getOwner().getId().equals(user.getId()));
    }
}
