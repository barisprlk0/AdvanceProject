package com.advanceproject.backend.service;

import com.advanceproject.backend.entity.Shipment;
import com.advanceproject.backend.repository.ShipmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ShipmentService {

    private final ShipmentRepository shipmentRepository;

    @Autowired
    public ShipmentService(ShipmentRepository shipmentRepository) {
        this.shipmentRepository = shipmentRepository;
    }

    public Shipment createShipment(Shipment shipment) {
        return shipmentRepository.save(shipment);
    }

    public Optional<Shipment> getShipmentById(Integer id) {
        return shipmentRepository.findById(id);
    }

    public List<Shipment> getAllShipments() {
        return shipmentRepository.findAll();
    }

    public Page<Shipment> getAllShipments(Pageable pageable) {
        return shipmentRepository.findAll(pageable);
    }

    public Page<Shipment> getShipmentsByUserId(Integer userId, Pageable pageable) {
        return shipmentRepository.findByOrderUserId(userId, pageable);
    }

    public Page<Shipment> getShipmentsByStoreOwnerId(Integer ownerId, Pageable pageable) {
        return shipmentRepository.findByOrderStoreOwnerId(ownerId, pageable);
    }

    public List<Shipment> getShipmentsByStoreOwnerId(Integer ownerId) {
        return shipmentRepository.findByOrderStoreOwnerId(ownerId);
    }

    public Shipment patchShipment(Integer id, Shipment partialShipment) {
        return shipmentRepository.findById(id).map(shipment -> {
            if (partialShipment.getWarehouse() != null) shipment.setWarehouse(partialShipment.getWarehouse());
            if (partialShipment.getMode() != null) shipment.setMode(partialShipment.getMode());
            if (partialShipment.getStatus() != null) shipment.setStatus(partialShipment.getStatus());
            if (partialShipment.getOrder() != null) shipment.setOrder(partialShipment.getOrder());
            return shipmentRepository.save(shipment);
        }).orElseThrow(() -> new RuntimeException("Shipment not found"));
    }

    public Shipment updateShipment(Integer id, Shipment updatedShipment) {
        return shipmentRepository.findById(id).map(shipment -> {
            shipment.setWarehouse(updatedShipment.getWarehouse());
            shipment.setMode(updatedShipment.getMode());
            shipment.setStatus(updatedShipment.getStatus());
            shipment.setOrder(updatedShipment.getOrder());
            return shipmentRepository.save(shipment);
        }).orElseThrow(() -> new RuntimeException("Shipment not found"));
    }

    public void deleteShipment(Integer id) {
        shipmentRepository.deleteById(id);
    }
}
