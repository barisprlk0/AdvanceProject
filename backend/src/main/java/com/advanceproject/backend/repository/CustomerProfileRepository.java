package com.advanceproject.backend.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.advanceproject.backend.entity.CustomerProfile;

@Repository
public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, Integer> {
    Optional<CustomerProfile> findByUser_Id(Integer userId);

    @Query("""
            SELECT DISTINCT cp
            FROM CustomerProfile cp
            WHERE cp.user.id IN (
                SELECT o.user.id
                FROM Order o
                WHERE o.store.owner.id = :ownerId
            )
            """)
    List<CustomerProfile> findVisibleByStoreOwner(@Param("ownerId") Integer ownerId);

    @Query("""
            SELECT COUNT(cp) > 0
            FROM CustomerProfile cp
            WHERE cp.id = :profileId
              AND cp.user.id IN (
                  SELECT o.user.id
                  FROM Order o
                  WHERE o.store.owner.id = :ownerId
              )
            """)
    boolean existsVisibleByStoreOwner(@Param("ownerId") Integer ownerId, @Param("profileId") Integer profileId);
}
