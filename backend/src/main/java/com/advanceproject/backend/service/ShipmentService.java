package com.advanceproject.backend.service;

import com.advanceproject.backend.entity.Shipment;
import com.advanceproject.backend.repository.ShipmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
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
