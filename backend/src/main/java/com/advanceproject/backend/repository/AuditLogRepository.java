package com.advanceproject.backend.repository;

import com.advanceproject.backend.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Integer> {
    boolean existsByUser_IdAndActionAndDetails(Integer userId, String action, String details);

    Page<AuditLog> findByActionContainingIgnoreCase(String action, Pageable pageable);

    Page<AuditLog> findByUser_Id(Integer userId, Pageable pageable);

    Page<AuditLog> findByUser_IdAndActionContainingIgnoreCase(Integer userId, String action, Pageable pageable);
}
