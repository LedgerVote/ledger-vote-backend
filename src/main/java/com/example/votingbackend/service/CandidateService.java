package com.example.votingbackend.service;

import com.example.votingbackend.model.Candidate;
import com.example.votingbackend.repository.CandidateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CandidateService {

    @Autowired
    private CandidateRepository candidateRepo;

    public Candidate createCandidate(Candidate candidate) {
        return candidateRepo.save(candidate);
    }

    public List<Candidate> getCandidatesBySession(Long sessionId) {
        return candidateRepo.findBySessionId(sessionId);
    }

    public List<Candidate> getAllCandidates() {
        return candidateRepo.findAll();
    }
}

