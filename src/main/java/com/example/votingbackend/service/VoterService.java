package com.example.votingbackend.service;


import com.example.votingbackend.model.Voter;
import com.example.votingbackend.repository.VoterRepository;
import com.example.votingbackend.repository.VotingSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VoterService {

    @Autowired
    private VoterRepository voterRepo;

    @Autowired
    private VotingSessionRepository sessionRepo;

    public Voter createVoter(Voter voter) {
//        Long sessionId = voter.getSession().getId();
//        voter.setSession(sessionRepo.findById(sessionId)
//                .orElseThrow(() -> new IllegalArgumentException("Invalid session ID")));
        return voterRepo.save(voter);
    }

    public List<Voter> getVotersBySession(Long sessionId) {
        return voterRepo.findBySessionId(sessionId);
    }

    public List<Voter> getAllVoters() {
        return voterRepo.findAll();
    }

    public Voter getByVoterId(String voterId) {
        return voterRepo.findByVoterId(voterId)
                .orElseThrow(() -> new IllegalArgumentException("Voter not found"));
    }
}
