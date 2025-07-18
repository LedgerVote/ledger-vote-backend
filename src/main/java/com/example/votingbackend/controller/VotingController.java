package com.example.votingbackend.controller;

import com.example.votingbackend.DTO.VoteRequest;
import com.example.votingbackend.service.VotingService;
import org.springframework.beans.factory.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/vote")
public class VotingController {

    @Autowired
    private VotingService votingService;

    @PostMapping
    public ResponseEntity<String> castVote(@RequestBody VoteRequest voteRequest) {
        try {
            votingService.castVote(voteRequest);
            return ResponseEntity.ok("Vote successfully cast.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Something went wrong");
        }
    }

    @GetMapping("/results")
    public ResponseEntity<Map<String, Integer>> getResults() {
        return ResponseEntity.ok(votingService.getResults());
    }
}
