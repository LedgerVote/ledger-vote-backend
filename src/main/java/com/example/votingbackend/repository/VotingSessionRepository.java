package com.example.votingbackend.repository;

import com.example.votingbackend.model.VotingSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VotingSessionRepository extends JpaRepository<VotingSession, Long> {

}

