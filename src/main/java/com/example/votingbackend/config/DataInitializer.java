package com.example.votingbackend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.example.votingbackend.service.AuthService;
import com.example.votingbackend.model.*;
import com.example.votingbackend.repository.*;

import java.time.LocalDateTime;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private AuthService authService;
    
    @Autowired
    private VoterRepository voterRepo;
    
    @Autowired
    private CandidateRepository candidateRepo;
    
    @Autowired
    private VotingSessionRepository sessionRepo;

    @Override
    public void run(String... args) throws Exception {
        // Create default admin user
        try {
            if (authService.findByUsername("admin") == null) {
                authService.createUser("admin", "admin123", "System Administrator", "admin");
                System.out.println("✅ Default admin user created: admin/admin123");
            }
        } catch (Exception e) {
            System.out.println("Admin user already exists");
        }

        // Create default regular user
        try {
            if (authService.findByUsername("voter1") == null) {
                authService.createUser("voter1", "voter123", "John Doe", "user");
                System.out.println("✅ Default voter user created: voter1/voter123");
            }
        } catch (Exception e) {
            System.out.println("Voter user already exists");
        }

        // Create more test users
        try {
            if (authService.findByUsername("voter2") == null) {
                authService.createUser("voter2", "voter123", "Jane Smith", "user");
                System.out.println("✅ Test voter 2 created: voter2/voter123");
            }
        } catch (Exception e) {
            System.out.println("Voter2 user already exists");
        }

        try {
            if (authService.findByUsername("manager") == null) {
                authService.createUser("manager", "manager123", "Election Manager", "admin");
                System.out.println("✅ Manager admin created: manager/manager123");
            }
        } catch (Exception e) {
            System.out.println("Manager user already exists");
        }

        // Initialize voting data
        initializeVotingData();

        System.out.println("\n🔐 Available Login Credentials:");
        System.out.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        System.out.println("👤 ADMIN ACCOUNTS:");
        System.out.println("   Username: admin     | Password: admin123");
        System.out.println("   Username: manager   | Password: manager123");
        System.out.println("\n👥 VOTER ACCOUNTS:");
        System.out.println("   Username: voter1    | Password: voter123");
        System.out.println("   Username: voter2    | Password: voter123");
        System.out.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }

    private void initializeVotingData() {
        System.out.println("\n🗳️ Initializing voting data...");
        
        // Create test voters if none exist
        if (voterRepo.count() == 0) {
            System.out.println("📝 Creating test voters...");
            
            // Create voters with proper constructor
            Voter voter1 = new Voter();
            voter1.setVoterId("VOTER001");
            voterRepo.save(voter1);
            
            Voter voter2 = new Voter();
            voter2.setVoterId("VOTER002");
            voterRepo.save(voter2);
            
            Voter voter3 = new Voter();
            voter3.setVoterId("VOTER003");
            voterRepo.save(voter3);
            
            Voter voter4 = new Voter();
            voter4.setVoterId("VOTER004");
            voterRepo.save(voter4);
            
            Voter voter5 = new Voter();
            voter5.setVoterId("VOTER005");
            voterRepo.save(voter5);
            
            System.out.println("✅ Created " + voterRepo.count() + " test voters");
        } else {
            System.out.println("📝 Voters already exist: " + voterRepo.count());
        }
        
        // Create test candidates if none exist
        if (candidateRepo.count() == 0) {
            System.out.println("👥 Creating test candidates...");
            
            Candidate candidate1 = new Candidate();
            candidate1.setName("Alice");
            candidateRepo.save(candidate1);
            
            Candidate candidate2 = new Candidate();
            candidate2.setName("Bob");
            candidateRepo.save(candidate2);
            
            Candidate candidate3 = new Candidate();
            candidate3.setName("Charlie");
            candidateRepo.save(candidate3);
            
            System.out.println("✅ Created " + candidateRepo.count() + " test candidates");
        } else {
            System.out.println("👥 Candidates already exist: " + candidateRepo.count());
        }
        
        // Create test session if none exist
        if (sessionRepo.count() == 0) {
            System.out.println("🗳️ Creating test voting session...");
            
            VotingSession session = new VotingSession();
            session.setTitle("Test Election 2025");
            session.setStartTime(LocalDateTime.now().minusHours(1));
            session.setEndTime(LocalDateTime.now().plusDays(1));
            sessionRepo.save(session);
            
            System.out.println("✅ Created " + sessionRepo.count() + " test voting session");
        } else {
            System.out.println("🗳️ Sessions already exist: " + sessionRepo.count());
        }
        
        System.out.println("\n📊 Voting Data Summary:");
        System.out.println("   Voters: " + voterRepo.count());
        System.out.println("   Candidates: " + candidateRepo.count());
        System.out.println("   Sessions: " + sessionRepo.count());
        
        System.out.println("\n🎯 Test Voter IDs for voting:");
        System.out.println("   VOTER001, VOTER002, VOTER003, VOTER004, VOTER005");
    }
}
