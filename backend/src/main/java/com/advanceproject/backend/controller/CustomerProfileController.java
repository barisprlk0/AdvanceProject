package com.advanceproject.backend.controller;

import com.advanceproject.backend.entity.CustomerProfile;
import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.service.CustomerProfileService;
import com.advanceproject.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customer-profiles")
public class CustomerProfileController {

    private final CustomerProfileService customerProfileService;
    private final UserService userService;

    @Autowired
    public CustomerProfileController(CustomerProfileService customerProfileService, UserService userService) {
        this.customerProfileService = customerProfileService;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<CustomerProfile> createCustomerProfile(@RequestBody CustomerProfile customerProfile, Authentication authentication) {
        User actor = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!"ADMIN".equalsIgnoreCase(actor.getRoleType())) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(customerProfileService.createCustomerProfile(customerProfile));
    }

    @GetMapping
    public ResponseEntity<List<CustomerProfile>> getAllCustomerProfiles(Authentication authentication) {
        User actor = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if ("ADMIN".equalsIgnoreCase(actor.getRoleType())) {
            return ResponseEntity.ok(customerProfileService.getAllCustomerProfiles());
        }
        if ("CORPORATE".equalsIgnoreCase(actor.getRoleType())) {
            return ResponseEntity.ok(customerProfileService.getVisibleByStoreOwner(actor.getId()));
        }

        return customerProfileService.getByUserId(actor.getId())
                .map(profile -> ResponseEntity.ok(List.of(profile)))
                .orElse(ResponseEntity.ok(List.of()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerProfile> getCustomerProfileById(@PathVariable Integer id, Authentication authentication) {
        User actor = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        CustomerProfile profile = customerProfileService.getCustomerProfileById(id)
                .orElseThrow(() -> new RuntimeException("CustomerProfile not found"));

        if ("ADMIN".equalsIgnoreCase(actor.getRoleType())) {
            return ResponseEntity.ok(profile);
        }
        if ("CORPORATE".equalsIgnoreCase(actor.getRoleType())) {
            if (!customerProfileService.isVisibleByStoreOwner(actor.getId(), id)) {
                return ResponseEntity.status(403).build();
            }
            return ResponseEntity.ok(profile);
        }

        if (profile.getUser() == null || !actor.getId().equals(profile.getUser().getId())) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(profile);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomerProfile> updateCustomerProfile(@PathVariable Integer id, @RequestBody CustomerProfile customerProfile, Authentication authentication) {
        User actor = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!"ADMIN".equalsIgnoreCase(actor.getRoleType())) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(customerProfileService.updateCustomerProfile(id, customerProfile));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCustomerProfile(@PathVariable Integer id, Authentication authentication) {
        User actor = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!"ADMIN".equalsIgnoreCase(actor.getRoleType())) {
            return ResponseEntity.status(403).build();
        }
        customerProfileService.deleteCustomerProfile(id);
        return ResponseEntity.noContent().build();
    }
}
