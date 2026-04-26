package com.advanceproject.backend.service;

import com.advanceproject.backend.entity.CustomerProfile;
import com.advanceproject.backend.repository.CustomerProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CustomerProfileService {

    private final CustomerProfileRepository customerProfileRepository;

    @Autowired
    public CustomerProfileService(CustomerProfileRepository customerProfileRepository) {
        this.customerProfileRepository = customerProfileRepository;
    }

    public CustomerProfile createCustomerProfile(CustomerProfile customerProfile) {
        return customerProfileRepository.save(customerProfile);
    }

    public Optional<CustomerProfile> getCustomerProfileById(Integer id) {
        return customerProfileRepository.findById(id);
    }

    public List<CustomerProfile> getAllCustomerProfiles() {
        return customerProfileRepository.findAll();
    }

    public Optional<CustomerProfile> getByUserId(Integer userId) {
        return customerProfileRepository.findByUser_Id(userId);
    }

    public List<CustomerProfile> getVisibleByStoreOwner(Integer ownerId) {
        return customerProfileRepository.findVisibleByStoreOwner(ownerId);
    }

    public boolean isVisibleByStoreOwner(Integer ownerId, Integer profileId) {
        return customerProfileRepository.existsVisibleByStoreOwner(ownerId, profileId);
    }

    public CustomerProfile updateCustomerProfile(Integer id, CustomerProfile updatedCustomerProfile) {
        return customerProfileRepository.findById(id).map(customerProfile -> {
            customerProfile.setAge(updatedCustomerProfile.getAge());
            customerProfile.setCity(updatedCustomerProfile.getCity());
            customerProfile.setMembershipType(updatedCustomerProfile.getMembershipType());
            customerProfile.setUser(updatedCustomerProfile.getUser());
            return customerProfileRepository.save(customerProfile);
        }).orElseThrow(() -> new RuntimeException("CustomerProfile not found"));
    }

    public void deleteCustomerProfile(Integer id) {
        customerProfileRepository.deleteById(id);
    }
}
