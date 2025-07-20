package com.example.votingbackend.service;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.votingbackend.model.User;
import com.example.votingbackend.repository.UserRepository;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    public User authenticate(String username, String password) {
        Optional<User> userOpt = userRepository.findByUsernameAndPassword(username, password);
        return userOpt.orElse(null);
    }

    public User createUser(String username, String password, String name, String role) {
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username already exists");
        }

        User user = new User(username, password, name, role);
        return userRepository.save(user);
    }

    public User findByUsername(String username) {
        return userRepository.findByUsername(username).orElse(null);
    }
}
