package com.advanceproject.backend.service;

import com.advanceproject.backend.entity.Product;
import com.advanceproject.backend.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    @Autowired
    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public Product createProduct(Product product) {
        return productRepository.save(product);
    }

    public Optional<Product> getProductById(Integer id) {
        return productRepository.findById(id);
    }

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Page<Product> getAllProducts(Pageable pageable) {
        return productRepository.findAll(pageable);
    }

    public Page<Product> getProductsByOwnerId(Integer ownerId, Pageable pageable) {
        return productRepository.findByStoreOwnerId(ownerId, pageable);
    }

    public Page<Product> searchProducts(String search, String category, Integer ownerId, Pageable pageable) {
        String normalizedSearch = normalizeFilter(search);
        String normalizedCategory = normalizeFilter(category);

        if (normalizedSearch == null && normalizedCategory == null) {
            return ownerId == null
                    ? productRepository.findAll(pageable)
                    : productRepository.findByStoreOwnerId(ownerId, pageable);
        }

        if (normalizedSearch == null) {
            return ownerId == null
                    ? productRepository.findByCategoryNameIgnoreCase(normalizedCategory, pageable)
                    : productRepository.findByStoreOwnerIdAndCategoryNameIgnoreCase(ownerId, normalizedCategory, pageable);
        }

        return productRepository.searchProducts(normalizedSearch, normalizedCategory, ownerId, pageable);
    }

    public Product patchProduct(Integer id, Product partialProduct) {
        return productRepository.findById(id).map(product -> {
            if (partialProduct.getName() != null) product.setName(partialProduct.getName());
            if (partialProduct.getSku() != null) product.setSku(partialProduct.getSku());
            if (partialProduct.getDescription() != null) product.setDescription(partialProduct.getDescription());
            if (partialProduct.getUnitPrice() != null) product.setUnitPrice(partialProduct.getUnitPrice());
            if (partialProduct.getStockQuantity() != null) product.setStockQuantity(partialProduct.getStockQuantity());
            if (partialProduct.getCurrencyCode() != null) product.setCurrencyCode(partialProduct.getCurrencyCode());
            if (partialProduct.getExchangeRate() != null) product.setExchangeRate(partialProduct.getExchangeRate());
            if (partialProduct.getCategory() != null) product.setCategory(partialProduct.getCategory());
            if (partialProduct.getStore() != null) product.setStore(partialProduct.getStore());
            return productRepository.save(product);
        }).orElseThrow(() -> new RuntimeException("Product not found"));
    }

    public Product updateProduct(Integer id, Product updatedProduct) {
        return productRepository.findById(id).map(product -> {
            product.setName(updatedProduct.getName());
            product.setSku(updatedProduct.getSku());
            product.setDescription(updatedProduct.getDescription());
            product.setUnitPrice(updatedProduct.getUnitPrice());
            product.setStockQuantity(updatedProduct.getStockQuantity());
            product.setCurrencyCode(updatedProduct.getCurrencyCode());
            product.setExchangeRate(updatedProduct.getExchangeRate());
            product.setCategory(updatedProduct.getCategory());
            product.setStore(updatedProduct.getStore());
            return productRepository.save(product);
        }).orElseThrow(() -> new RuntimeException("Product not found"));
    }

    public void deleteProduct(Integer id) {
        productRepository.deleteById(id);
    }

    private String normalizeFilter(String value) {
        if (value == null || value.isBlank() || "all".equalsIgnoreCase(value)) {
            return null;
        }
        return value.trim().toLowerCase();
    }
}
