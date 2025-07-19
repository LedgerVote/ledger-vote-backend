package com.example.votingbackend.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.votingbackend.DTO.VoteRequest;
import com.example.votingbackend.model.Candidate;
import com.example.votingbackend.model.Vote;
import com.example.votingbackend.model.Voter;
import com.example.votingbackend.model.VotingSession;
import com.example.votingbackend.repository.CandidateRepository;
import com.example.votingbackend.repository.VoteRepository;
import com.example.votingbackend.repository.VoterRepository;
import com.example.votingbackend.repository.VotingSessionRepository;

@Service
public class VotingService {

    @Autowired
    private VoterRepository voterRepo;
    @Autowired
    private CandidateRepository candidateRepo;
    @Autowired
    private VoteRepository voteRepo;
    @Autowired
    private VotingSessionRepository sessionRepo;



    public void castVote(VoteRequest req) throws Exception {
        System.out.println("🗳️ Processing vote request:");
        System.out.println("  Voter ID: " + req.getVoterId());
        System.out.println("  Candidate: " + req.getCandidateName());
        System.out.println("  Session ID: " + req.getSessionId());
        System.out.println("  Wallet Address: " + req.getWalletAddress());

        // Validate voter exists
        Voter voter = voterRepo.findByVoterId(req.getVoterId())
                .orElseThrow(() -> {
                    System.err.println("❌ Voter not found: " + req.getVoterId());
                    return new IllegalArgumentException("Voter not found: " + req.getVoterId() + ". Please register as a voter first.");
                });
        
        if (voter.isHasVoted()) {
            System.err.println("❌ Voter has already voted: " + req.getVoterId());
            throw new IllegalArgumentException("Voter " + req.getVoterId() + " has already voted");
        }

        // Validate candidate exists
        Candidate candidate = candidateRepo.findByName(req.getCandidateName())
                .orElseThrow(() -> {
                    System.err.println("❌ Candidate not found: " + req.getCandidateName());
                    return new IllegalArgumentException("Candidate not found: " + req.getCandidateName() + ". Please check available candidates.");
                });

        // Validate session exists
        VotingSession session = sessionRepo.findById(req.getSessionId())
                .orElseThrow(() -> {
                    System.err.println("❌ Session not found: " + req.getSessionId());
                    return new IllegalArgumentException("Voting session not found: " + req.getSessionId() + ". Please check active sessions.");
                });

        // Check if wallet address has already been used to vote in this session
        if (req.getWalletAddress() != null && voteRepo.existsByWalletAddressAndSession(req.getWalletAddress(), session)) {
            System.err.println("❌ Wallet already voted: " + req.getWalletAddress());
            throw new IllegalArgumentException("This wallet address has already been used to vote in this session");
        }

        // Save vote in DB
        Vote vote = new Vote();
        vote.setVoter(voter);
        vote.setCandidate(candidate);
        vote.setSession(session);
        vote.setWalletAddress(req.getWalletAddress()); // Store wallet address
        vote.setTimestamp(LocalDateTime.now());
        
        try {
            if(vote.getTransactionHash()==null){
                throw new Exception("Transaction hash is null");
            }
            voteRepo.save(vote);
            System.out.println("✅ Vote saved to database");
        } catch (Exception e) {
            System.err.println("❌ Failed to save vote: " + e.getMessage());
            throw new RuntimeException("Failed to save vote to database: " + e.getMessage());
        }

        // Update voter status
        try {
            voter.setHasVoted(true);
            voterRepo.save(voter);
            System.out.println("✅ Voter status updated");
        } catch (Exception e) {
            System.err.println("❌ Failed to update voter status: " + e.getMessage());
            throw new RuntimeException("Failed to update voter status: " + e.getMessage());
        }

        System.out.println("✅ Vote recorded for wallet: " + req.getWalletAddress());
    }

    public Map<String, Integer> getResults() {
        Map<String, Integer> result = new HashMap<>();
        candidateRepo.findAll().forEach(c -> {
            int count = voteRepo.countByCandidate(c);
            result.put(c.getName(), count);
        });
        return result;
    }
}

