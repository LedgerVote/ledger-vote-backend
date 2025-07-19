package com.example.votingbackend.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.votingbackend.model.VotingSession;
import com.example.votingbackend.service.VotingSessionService;

@RestController
@RequestMapping("/api/session")
public class VotingSessionController {

    @Autowired
    private VotingSessionService sessionService;

    @PostMapping
    public ResponseEntity<VotingSession> createSession(@RequestBody VotingSession session) {
        return ResponseEntity.ok(sessionService.createSession(session));
    }

    @GetMapping
    public ResponseEntity<List<VotingSession>> getAllSessions() {
        return ResponseEntity.ok(sessionService.getAllSessions());
    }

    @GetMapping("/{id}/results")
    public ResponseEntity<?> getSessionResults(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.getSessionResults(id));
    }
}

