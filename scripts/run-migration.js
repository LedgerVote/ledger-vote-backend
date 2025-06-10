const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function runMigration() {
  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "voting_system",
      multipleStatements: true,
    });

    console.log("Connected to database");

    // Read and execute migration script
    const migrationPath = path.join(
      __dirname,
      "../database/migration_voter_registration.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("Running voter registration migration...");
    await connection.execute(migrationSQL);

    console.log("Migration completed successfully!");
    console.log(
      "Database schema updated for voter registration functionality."
    );
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration
runMigration();
