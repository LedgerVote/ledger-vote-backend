package com.example.votingbackend.controller;


import com.example.votingbackend.model.Voter;
import com.example.votingbackend.service.VoterService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/voter")
public class VoterController {

    @Autowired
    private VoterService voterService;

    @PostMapping
    public ResponseEntity<Voter> createVoter(@RequestBody Voter voter) {
        return ResponseEntity.ok(voterService.createVoter(voter));
    }

    @GetMapping("/session/{sessionId}")
    public ResponseEntity<List<Voter>> getVotersBySession(@PathVariable Long sessionId) {
        return ResponseEntity.ok(voterService.getVotersBySession(sessionId));
    }

    @GetMapping
    public ResponseEntity<List<Voter>> getAllVoters() {
        return ResponseEntity.ok(voterService.getAllVoters());
    }

    @GetMapping("/{voterId}")
    public ResponseEntity<Voter> getByVoterId(@PathVariable String voterId) {
        return ResponseEntity.ok(voterService.getByVoterId(voterId));
    }
}

