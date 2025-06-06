const mysql = require("mysql2/promise");
require("dotenv").config();

const setupDatabase = async () => {
  try {
    console.log("🔧 Setting up database...");

    // Connect to MySQL server (without database)
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

    console.log("✅ Connected to MySQL server");

    // Create database if it doesn't exist
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`
    );
    console.log(`✅ Database '${process.env.DB_NAME}' created/verified`); // Use the database
    await connection.query(`USE ${process.env.DB_NAME}`);
    console.log(`✅ Using database '${process.env.DB_NAME}'`); // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        user_type ENUM('voter', 'admin') DEFAULT 'voter',
        wallet_address VARCHAR(42) NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_user_type (user_type),
        INDEX idx_wallet_address (wallet_address)
      )
    `);
    console.log("✅ Users table created/verified"); // Create voting sessions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS voting_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        admin_id INT NOT NULL,
        start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_date DATETIME NOT NULL,
        contract_address VARCHAR(42) NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_admin_id (admin_id),
        INDEX idx_active_sessions (is_active, start_date, end_date)
      )
    `);
    console.log("✅ Voting sessions table created/verified"); // Create candidates table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS candidates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image_url VARCHAR(500) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_session_id (session_id)
      )
    `);
    console.log("✅ Candidates table created/verified"); // Create session voters table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS session_voters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        voter_id INT NOT NULL,
        has_voted BOOLEAN DEFAULT FALSE,
        voted_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_session_voter (session_id, voter_id),
        INDEX idx_session_voters (session_id, voter_id)
      )
    `);
    console.log("✅ Session voters table created/verified"); // Check if default admin exists
    const [existingAdmin] = await connection.query(
      "SELECT id FROM users WHERE email = ?",
      ["admin@voting.com"]
    );

    if (existingAdmin.length === 0) {
      // Create default admin user (password: admin123)
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("admin123", 12);

      await connection.query(
        "INSERT INTO users (email, password, first_name, last_name, user_type, is_verified) VALUES (?, ?, ?, ?, ?, ?)",
        ["admin@voting.com", hashedPassword, "Admin", "User", "admin", true]
      );
      console.log(
        "✅ Default admin user created (admin@voting.com / admin123)"
      );
    } else {
      console.log("✅ Default admin user already exists");
    }

    await connection.end();
    console.log("🎉 Database setup completed successfully!");
    console.log("\n📝 Default login credentials:");
    console.log("   Email: admin@voting.com");
    console.log("   Password: admin123");
    console.log("   Role: Admin\n");
  } catch (error) {
    console.error("❌ Database setup failed:", error.message);
    process.exit(1);
  }
};

setupDatabase();
