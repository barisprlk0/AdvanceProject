package com.advanceproject.backend.controller;

import com.advanceproject.backend.entity.Shipment;
import com.advanceproject.backend.entity.User;
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
@RequestMapping("/api/shipments")
public class ShipmentController {

    private final ShipmentService shipmentService;
    private final UserService userService;

    @Autowired
    public ShipmentController(ShipmentService shipmentService, UserService userService) {
        this.shipmentService = shipmentService;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<Shipment> createShipment(@RequestBody Shipment shipment) {
        return ResponseEntity.ok(shipmentService.createShipment(shipment));
    }

    @GetMapping
    public ResponseEntity<Page<Shipment>> getAllShipments(Pageable pageable, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if ("ADMIN".equalsIgnoreCase(user.getRoleType())) {
            return ResponseEntity.ok(shipmentService.getAllShipments(pageable));
        } else if ("CORPORATE".equalsIgnoreCase(user.getRoleType())) {
            return ResponseEntity.ok(shipmentService.getShipmentsByStoreOwnerId(user.getId(), pageable));
        } else {
            return ResponseEntity.ok(shipmentService.getShipmentsByUserId(user.getId(), pageable));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Shipment> getShipmentById(@PathVariable Integer id, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Shipment shipment = shipmentService.getShipmentById(id)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));

        if (!canAccessShipment(user, shipment)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(shipment);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Shipment> updateShipment(@PathVariable Integer id, @RequestBody Shipment shipment, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Shipment existingShipment = shipmentService.getShipmentById(id)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));

        if (!canManageShipment(user, existingShipment)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(shipmentService.updateShipment(id, shipment));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Shipment> patchShipment(@PathVariable Integer id, @RequestBody Shipment partialShipment, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Shipment existingShipment = shipmentService.getShipmentById(id)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));

        if (!canManageShipment(user, existingShipment)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(shipmentService.patchShipment(id, partialShipment));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteShipment(@PathVariable Integer id, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Shipment existingShipment = shipmentService.getShipmentById(id)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));

        if (!canManageShipment(user, existingShipment)) {
            return ResponseEntity.status(403).build();
        }

        shipmentService.deleteShipment(id);
        return ResponseEntity.noContent().build();
    }

    private boolean canAccessShipment(User user, Shipment shipment) {
        if ("ADMIN".equalsIgnoreCase(user.getRoleType())) {
            return true;
        }
        if (shipment.getOrder() == null) {
            return false;
        }
        if ("CORPORATE".equalsIgnoreCase(user.getRoleType())) {
            return shipment.getOrder().getStore() != null
                    && shipment.getOrder().getStore().getOwner() != null
                    && shipment.getOrder().getStore().getOwner().getId().equals(user.getId());
        }
        return shipment.getOrder().getUser() != null
                && shipment.getOrder().getUser().getId().equals(user.getId());
    }

    private boolean canManageShipment(User user, Shipment shipment) {
        return "ADMIN".equalsIgnoreCase(user.getRoleType())
                || ("CORPORATE".equalsIgnoreCase(user.getRoleType())
                && shipment.getOrder() != null
                && shipment.getOrder().getStore() != null
                && shipment.getOrder().getStore().getOwner() != null
                && shipment.getOrder().getStore().getOwner().getId().equals(user.getId()));
    }
}
