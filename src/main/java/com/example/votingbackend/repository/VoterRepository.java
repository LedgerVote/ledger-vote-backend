package com.example.votingbackend.repository;

import com.example.votingbackend.model.Voter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VoterRepository extends JpaRepository<Voter, Long> {
    Optional<Voter> findByVoterId(String voterId);

    List<Voter> findBySessionId(Long sessionId);
}
