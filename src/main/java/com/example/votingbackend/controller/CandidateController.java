package com.example.votingbackend.controller;

import com.example.votingbackend.model.Candidate;
import com.example.votingbackend.service.CandidateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/candidate")
public class CandidateController {

    @Autowired
    private CandidateService candidateService;

    @PostMapping
    public ResponseEntity<Candidate> createCandidate(@RequestBody Candidate candidate) {
        return ResponseEntity.ok(candidateService.createCandidate(candidate));
    }

    @GetMapping("/session/{sessionId}")
    public ResponseEntity<List<Candidate>> getCandidatesBySession(@PathVariable Long sessionId) {
        return ResponseEntity.ok(candidateService.getCandidatesBySession(sessionId));
    }

    @GetMapping
    public ResponseEntity<List<Candidate>> getAllCandidates() {
        return ResponseEntity.ok(candidateService.getAllCandidates());
    }
}

