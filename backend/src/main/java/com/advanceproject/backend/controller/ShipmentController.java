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
    public ResponseEntity<Shipment> getShipmentById(@PathVariable Integer id) {
        return shipmentService.getShipmentById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Shipment> updateShipment(@PathVariable Integer id, @RequestBody Shipment shipment) {
        return ResponseEntity.ok(shipmentService.updateShipment(id, shipment));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Shipment> patchShipment(@PathVariable Integer id, @RequestBody Shipment partialShipment) {
        return ResponseEntity.ok(shipmentService.patchShipment(id, partialShipment));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteShipment(@PathVariable Integer id) {
        shipmentService.deleteShipment(id);
        return ResponseEntity.noContent().build();
    }
}
