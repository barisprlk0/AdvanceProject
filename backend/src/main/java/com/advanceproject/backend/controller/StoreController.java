package com.advanceproject.backend.controller;

import com.advanceproject.backend.entity.Store;
import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.service.StoreService;
import com.advanceproject.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stores")
public class StoreController {

    private final StoreService storeService;
    private final UserService userService;

    @Autowired
    public StoreController(StoreService storeService, UserService userService) {
        this.storeService = storeService;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<Store> createStore(@RequestBody Store store, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // If corporate, force the owner to be themselves
        if (!"ADMIN".equalsIgnoreCase(user.getRoleType())) {
            store.setOwner(user);
        } else if (store.getOwner() == null) {
            store.setOwner(user); // Admin defaults to self if no owner provided
        }

        return ResponseEntity.ok(storeService.createStore(store, store.getOwner()));
    }

    @GetMapping
    public ResponseEntity<List<Store>> getAllStores(Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if ("ADMIN".equalsIgnoreCase(user.getRoleType())) {
            return ResponseEntity.ok(storeService.getAllStores());
        } else {
            return ResponseEntity.ok(storeService.getStoresByOwnerId(user.getId()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Store> getStoreById(@PathVariable Integer id, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Store store = storeService.getStoreById(id)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!canAccessStore(user, store)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(store);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Store> updateStore(@PathVariable Integer id, @RequestBody Store store, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Store existingStore = storeService.getStoreById(id)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!canAccessStore(user, existingStore)) {
            return ResponseEntity.status(403).build();
        }
        if (!"ADMIN".equalsIgnoreCase(user.getRoleType())) {
            store.setOwner(existingStore.getOwner());
        }

        return ResponseEntity.ok(storeService.updateStore(id, store));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Store> patchStore(@PathVariable Integer id, @RequestBody Store store, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Store existingStore = storeService.getStoreById(id)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!canAccessStore(user, existingStore)) {
            return ResponseEntity.status(403).build();
        }

        if (!"ADMIN".equalsIgnoreCase(user.getRoleType())) {
            store.setOwner(existingStore.getOwner());
        }

        return ResponseEntity.ok(storeService.patchStore(id, store));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStore(@PathVariable Integer id, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Store existingStore = storeService.getStoreById(id)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!canAccessStore(user, existingStore)) {
            return ResponseEntity.status(403).build();
        }

        storeService.deleteStore(id);
        return ResponseEntity.noContent().build();
    }

    private boolean canAccessStore(User user, Store store) {
        return "ADMIN".equalsIgnoreCase(user.getRoleType())
                || (store.getOwner() != null && store.getOwner().getId().equals(user.getId()));
    }
}
