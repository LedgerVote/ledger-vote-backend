package com.example.votingbackend.repository;


import org.springframework.data.jpa.repository.JpaRepository;

import com.example.votingbackend.model.Candidate;
import com.example.votingbackend.model.Vote;
import com.example.votingbackend.model.VotingSession;

public interface VoteRepository extends JpaRepository<Vote, Long> {
    int countByCandidate(Candidate candidate);

    int countBySessionAndCandidate(VotingSession session, Candidate candidate);
    
    boolean existsByWalletAddress(String walletAddress);
    
    boolean existsByWalletAddressAndSession(String walletAddress, VotingSession session);

}