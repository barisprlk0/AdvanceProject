package com.advanceproject.backend.controller;

import com.advanceproject.backend.entity.Product;
import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.service.ProductService;
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

    @Autowired
    public ProductController(ProductService productService, UserService userService) {
        this.productService = productService;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        return ResponseEntity.ok(productService.createProduct(product));
    }

    @GetMapping
    public ResponseEntity<Page<Product>> getAllProducts(Pageable pageable, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if ("CORPORATE".equalsIgnoreCase(user.getRoleType())) {
            return ResponseEntity.ok(productService.getProductsByOwnerId(user.getId(), pageable));
        }
        
        return ResponseEntity.ok(productService.getAllProducts(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable Integer id) {
        return productService.getProductById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Product> updateProduct(@PathVariable Integer id, @RequestBody Product product, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Product existingProduct = productService.getProductById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (!"ADMIN".equalsIgnoreCase(user.getRoleType())) {
            // Corporate users can only edit their own products
            if (existingProduct.getStore() == null || existingProduct.getStore().getOwner() == null || 
                !existingProduct.getStore().getOwner().getId().equals(user.getId())) {
                return ResponseEntity.status(403).build();
            }
        }
        
        return ResponseEntity.ok(productService.updateProduct(id, product));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Integer id, Authentication authentication) {
        User user = userService.getUserByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Product existingProduct = productService.getProductById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (!"ADMIN".equalsIgnoreCase(user.getRoleType())) {
            if (existingProduct.getStore() == null || existingProduct.getStore().getOwner() == null || 
                !existingProduct.getStore().getOwner().getId().equals(user.getId())) {
                return ResponseEntity.status(403).build();
            }
        }
        
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }
}
