package com.example.votingbackend.service;

import com.example.votingbackend.model.Candidate;
import com.example.votingbackend.model.Vote;
import com.example.votingbackend.model.VotingSession;
import com.example.votingbackend.repository.CandidateRepository;
import com.example.votingbackend.repository.VoteRepository;
import com.example.votingbackend.repository.VotingSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class VotingSessionService {

    @Autowired
    private VotingSessionRepository sessionRepo;

    @Autowired
    private CandidateRepository candidateRepo;

    @Autowired
    private VoteRepository voteRepo;

    public VotingSession createSession(VotingSession session) {
        return sessionRepo.save(session);
    }

    public List<VotingSession> getAllSessions() {
        return sessionRepo.findAll();
    }

    public Map<String, Integer> getSessionResults(Long sessionId) {
        List<Candidate> candidates = candidateRepo.findBySessionId(sessionId);
        VotingSession session = sessionRepo.findById(sessionId).orElseThrow(() -> new IllegalArgumentException("Invalid session"));
        Map<String, Integer> results = new HashMap<>();
        for (Candidate candidate : candidates) {
            int count = voteRepo.countBySessionAndCandidate(session, candidate);

            results.put(candidate.getName(), count);
        }
        return results;
    }
}

