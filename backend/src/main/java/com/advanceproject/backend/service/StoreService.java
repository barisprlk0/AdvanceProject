package com.advanceproject.backend.service;

import com.advanceproject.backend.entity.Store;
import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.repository.StoreRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class StoreService {

    private final StoreRepository storeRepository;

    @Autowired
    public StoreService(StoreRepository storeRepository) {
        this.storeRepository = storeRepository;
    }

    // Sisteme yeni bir mağaza ekleme kuralı
    public Store createStore(Store store, User owner) {
        store.setOwner(owner);
        // Yeni bir mağaza kurulduğunda durumu varsayılan olarak "active" olsun
        if (store.getStatus() == null || store.getStatus().isEmpty()) {
            store.setStatus("active");
        }
        return storeRepository.save(store);
    }

    // ID'ye göre belirli bir mağazayı bulma
    public Optional<Store> getStoreById(Integer id) {
        return storeRepository.findById(id);
    }

    // Tüm mağazaları listeleme
    public List<Store> getAllStores() {
        return storeRepository.findAll();
    }

    public List<Store> getStoresByOwnerId(Integer ownerId) {
        return storeRepository.findByOwnerId(ownerId);
    }

    public Store updateStore(Integer id, Store updatedStore) {
        return storeRepository.findById(id).map(store -> {
            store.setName(updatedStore.getName());
            store.setStatus(updatedStore.getStatus());
            if (updatedStore.getOwner() != null) {
                store.setOwner(updatedStore.getOwner());
            }
            return storeRepository.save(store);
        }).orElseThrow(() -> new RuntimeException("Store not found"));
    }

    public Store patchStore(Integer id, Store partialStore) {
        return storeRepository.findById(id).map(store -> {
            if (partialStore.getName() != null) store.setName(partialStore.getName());
            if (partialStore.getStatus() != null) store.setStatus(partialStore.getStatus());
            if (partialStore.getOwner() != null) store.setOwner(partialStore.getOwner());
            return storeRepository.save(store);
        }).orElseThrow(() -> new RuntimeException("Store not found"));
    }

    public void deleteStore(Integer id) {
        storeRepository.deleteById(id);
    }
}
