package com.advanceproject.backend.service;

import com.advanceproject.backend.entity.User;
import com.advanceproject.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User registerUser(User user) {
        return userRepository.save(user);
    }

    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Page<User> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable);
    }

    public Optional<User> getUserById(Integer id) {
        return userRepository.findById(id);
    }

    public User updateUser(Integer id, User updatedUser) {
        return userRepository.findById(id).map(user -> {
            user.setEmail(updatedUser.getEmail());
            if (updatedUser.getPasswordHash() != null && !updatedUser.getPasswordHash().isBlank()) {
                user.setPasswordHash(updatedUser.getPasswordHash());
            }
            if (updatedUser.getRoleType() != null && !updatedUser.getRoleType().isBlank()) {
                user.setRoleType(updatedUser.getRoleType());
            }
            user.setGender(updatedUser.getGender());
            return userRepository.save(user);
        }).orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User patchUser(Integer id, User partialUser) {
        return userRepository.findById(id).map(user -> {
            if (partialUser.getEmail() != null && !partialUser.getEmail().isBlank()) {
                user.setEmail(partialUser.getEmail());
            }
            if (partialUser.getPasswordHash() != null && !partialUser.getPasswordHash().isBlank()) {
                user.setPasswordHash(partialUser.getPasswordHash());
            }
            if (partialUser.getRoleType() != null && !partialUser.getRoleType().isBlank()) {
                user.setRoleType(partialUser.getRoleType());
            }
            if (partialUser.getGender() != null) {
                user.setGender(partialUser.getGender());
            }
            return userRepository.save(user);
        }).orElseThrow(() -> new RuntimeException("User not found"));
    }

    public void deleteUser(Integer id) {
        userRepository.deleteById(id);
    }

    public void changePassword(Integer userId, String currentPassword, String newPassword, PasswordEncoder passwordEncoder) {
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new RuntimeException("Yeni sifre en az 6 karakter olmalidir.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new RuntimeException("Mevcut sifre hatali.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword.trim()));
        userRepository.save(user);
    }
}
