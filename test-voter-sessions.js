const { pool } = require("./config/database");

async function testVoterSessions() {
  try {
    console.log("🔄 Testing voter sessions endpoint logic...");

    // Test the query that would be used in getVoterSessions
    const voterId = 1; // Assuming voter ID 1 exists
    const status = "active";

    let whereClause = "WHERE sv.voter_id = ? AND u.is_verified = TRUE";
    let queryParams = [voterId];

    if (status === "active") {
      whereClause += " AND vs.is_active = TRUE AND vs.end_date > NOW()";
    } else if (status === "upcoming") {
      whereClause += " AND vs.start_date > NOW()";
    } else if (status === "completed") {
      whereClause += " AND vs.end_date <= NOW()";
    }

    // Get sessions the voter is authorized for
    const [sessions] = await pool.execute(
      `SELECT vs.*, 
              u.first_name as admin_first_name, 
              u.last_name as admin_last_name,
              sv.has_voted,
              sv.voted_at,
              COUNT(DISTINCT sv2.voter_id) as total_voters,
              COUNT(DISTINCT CASE WHEN sv2.has_voted = TRUE THEN sv2.voter_id END) as votes_cast
       FROM voting_sessions vs
       JOIN session_voters sv ON vs.id = sv.session_id
       JOIN users u ON vs.admin_id = u.id
       LEFT JOIN session_voters sv2 ON vs.id = sv2.session_id
       ${whereClause}
       GROUP BY vs.id, sv.has_voted, sv.voted_at
       ORDER BY vs.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, 10, 0]
    );

    console.log(`✅ Query executed successfully!`);
    console.log(`📊 Found ${sessions.length} sessions for voter ID ${voterId}`);

    if (sessions.length > 0) {
      console.log("\n📋 Sample session data:");
      sessions.forEach((session, index) => {
        console.log(`  ${index + 1}. ${session.title} (ID: ${session.id})`);
        console.log(
          `     Admin: ${session.admin_first_name} ${session.admin_last_name}`
        );
        console.log(
          `     Status: ${session.is_active ? "Active" : "Inactive"}`
        );
        console.log(`     Has voted: ${session.has_voted ? "Yes" : "No"}`);
        console.log(
          `     Voters: ${session.total_voters}, Votes: ${session.votes_cast}`
        );
      });
    }

    console.log("\n✅ Voter sessions endpoint logic test completed!");
  } catch (error) {
    console.error("❌ Error testing voter sessions:", error.message);
  } finally {
    process.exit(0);
  }
}

// Run the test
testVoterSessions();
