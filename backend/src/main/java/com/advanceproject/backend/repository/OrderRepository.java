package com.advanceproject.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.advanceproject.backend.entity.Order;

@Repository
public interface OrderRepository extends JpaRepository<Order, Integer> {
    Page<Order> findByUserId(Integer userId, Pageable pageable);
    List<Order> findByUserId(Integer userId);
    Page<Order> findByStore_Owner_Id(Integer ownerId, Pageable pageable);
    List<Order> findByStore_Owner_Id(Integer ownerId);
}
