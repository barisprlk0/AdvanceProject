package com.advanceproject.backend.repository;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.advanceproject.backend.entity.Shipment;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, Integer> {
    Page<Shipment> findByOrderUserId(Integer userId, Pageable pageable);
    Page<Shipment> findByOrderStoreOwnerId(Integer ownerId, Pageable pageable);
    List<Shipment> findByOrderStoreOwnerId(Integer ownerId);
}
