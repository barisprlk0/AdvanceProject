package com.advanceproject.backend.service;

import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SystemSettingsService {
    private final ConcurrentHashMap<String, Object> settings = new ConcurrentHashMap<>();

    public SystemSettingsService() {
        settings.put("maintenanceMode", false);
        settings.put("allowCorporateStoreCreation", true);
        settings.put("maxProductsPerStore", 5000);
        settings.put("defaultCurrency", "TRY");
        settings.put("lowStockThreshold", 10);
    }

    public Map<String, Object> getAll() {
        return new LinkedHashMap<>(settings);
    }

    public Map<String, Object> update(Map<String, Object> updates) {
        if (updates == null) {
            return getAll();
        }
        updates.forEach((k, v) -> {
            if (k != null && !k.isBlank()) {
                settings.put(k, v);
            }
        });
        return getAll();
    }
}
