package com.advanceproject.backend.controller;

import com.advanceproject.backend.entity.CustomerProfile;
import com.advanceproject.backend.service.CustomerProfileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customer-profiles")
public class CustomerProfileController {

    private final CustomerProfileService customerProfileService;

    @Autowired
    public CustomerProfileController(CustomerProfileService customerProfileService) {
        this.customerProfileService = customerProfileService;
    }

    @PostMapping
    public ResponseEntity<CustomerProfile> createCustomerProfile(@RequestBody CustomerProfile customerProfile) {
        return ResponseEntity.ok(customerProfileService.createCustomerProfile(customerProfile));
    }

    @GetMapping
    public ResponseEntity<List<CustomerProfile>> getAllCustomerProfiles() {
        return ResponseEntity.ok(customerProfileService.getAllCustomerProfiles());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerProfile> getCustomerProfileById(@PathVariable Integer id) {
        return customerProfileService.getCustomerProfileById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomerProfile> updateCustomerProfile(@PathVariable Integer id, @RequestBody CustomerProfile customerProfile) {
        return ResponseEntity.ok(customerProfileService.updateCustomerProfile(id, customerProfile));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCustomerProfile(@PathVariable Integer id) {
        customerProfileService.deleteCustomerProfile(id);
        return ResponseEntity.noContent().build();
    }
}
