package com.example.votingbackend.repository;


import com.example.votingbackend.model.Candidate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CandidateRepository extends JpaRepository<Candidate, Long> {
    Optional<Candidate> findByName(String name);
    List<Candidate> findBySessionId(Long sessionId);
}
