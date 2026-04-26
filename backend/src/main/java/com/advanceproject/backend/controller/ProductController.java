package com.advanceproject.backend.controller;

import com.advanceproject.backend.entity.Product;
import com.advanceproject.backend.entity.Store;
import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.service.ProductService;
import com.advanceproject.backend.service.StoreService;
import com.advanceproject.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final UserService userService;
    private final StoreService storeService;

    @Autowired
    public ProductController(ProductService productService, UserService userService, StoreService storeService) {
        this.productService = productService;
        this.userService = userService;
        this.storeService = storeService;
    }

    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody Product product, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if ("CORPORATE".equalsIgnoreCase(user.getRoleType())) {
            if (product.getStore() == null || product.getStore().getId() == null) {
                return ResponseEntity.badRequest().build();
            }
            Store store = storeService.getStoreById(product.getStore().getId())
                    .orElseThrow(() -> new RuntimeException("Store not found"));
            if (store.getOwner() == null || !store.getOwner().getId().equals(user.getId())) {
                return ResponseEntity.status(403).build();
            }
            product.setStore(store);
        }

        return ResponseEntity.ok(productService.createProduct(product));
    }

    @GetMapping
    public ResponseEntity<Page<Product>> getAllProducts(
            Pageable pageable,
            Authentication authentication,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category
    ) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Integer ownerId = null;
        if ("CORPORATE".equalsIgnoreCase(user.getRoleType())) {
            ownerId = user.getId();
        }

        return ResponseEntity.ok(productService.searchProducts(search, category, ownerId, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable Integer id, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Product product = productService.getProductById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if ("CORPORATE".equalsIgnoreCase(user.getRoleType()) && !ownsProduct(user, product)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(product);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Product> updateProduct(@PathVariable Integer id, @RequestBody Product product, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Product existingProduct = productService.getProductById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (!"ADMIN".equalsIgnoreCase(user.getRoleType())) {
            // Corporate users can only edit their own products
            if (!ownsProduct(user, existingProduct)) {
                return ResponseEntity.status(403).build();
            }
            if (product.getStore() != null && product.getStore().getId() != null) {
                Store requestedStore = storeService.getStoreById(product.getStore().getId())
                        .orElseThrow(() -> new RuntimeException("Store not found"));
                if (requestedStore.getOwner() == null || !requestedStore.getOwner().getId().equals(user.getId())) {
                    return ResponseEntity.status(403).build();
                }
                product.setStore(requestedStore);
            } else {
                product.setStore(existingProduct.getStore());
            }
        }
        
        return ResponseEntity.ok(productService.updateProduct(id, product));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Product> patchProduct(@PathVariable Integer id, @RequestBody Product product, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Product existingProduct = productService.getProductById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (!"ADMIN".equalsIgnoreCase(user.getRoleType())) {
            if (!ownsProduct(user, existingProduct)) {
                return ResponseEntity.status(403).build();
            }
            if (product.getStore() != null && product.getStore().getId() != null) {
                Store requestedStore = storeService.getStoreById(product.getStore().getId())
                        .orElseThrow(() -> new RuntimeException("Store not found"));
                if (requestedStore.getOwner() == null || !requestedStore.getOwner().getId().equals(user.getId())) {
                    return ResponseEntity.status(403).build();
                }
                product.setStore(requestedStore);
            }
        }

        return ResponseEntity.ok(productService.patchProduct(id, product));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Integer id, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Product existingProduct = productService.getProductById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (!"ADMIN".equalsIgnoreCase(user.getRoleType())) {
            if (!ownsProduct(user, existingProduct)) {
                return ResponseEntity.status(403).build();
            }
        }
        
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    private boolean ownsProduct(User user, Product product) {
        return product.getStore() != null
                && product.getStore().getOwner() != null
                && product.getStore().getOwner().getId().equals(user.getId());
    }
}
