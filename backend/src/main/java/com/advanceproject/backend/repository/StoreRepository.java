package com.advanceproject.backend.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.advanceproject.backend.entity.Store;

@Repository
public interface StoreRepository extends JpaRepository<Store, Integer> {
    List<Store> findByOwnerId(Integer ownerId);
}
