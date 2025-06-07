const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabase() {
  let connection;
  
  try {
    console.log('🔄 Testing database connection...');
    
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'voting_system',
      port: process.env.DB_PORT || 3306
    });
    
    console.log('✅ Database connected successfully!');
    
    // Test if tables exist
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('\n📋 Database tables:');
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });
    
    // Check if admin user exists
    const [adminUsers] = await connection.execute(
      'SELECT id, email, user_type FROM users WHERE user_type = "admin" LIMIT 1'
    );
    
    if (adminUsers.length > 0) {
      console.log('\n👤 Admin user found:', adminUsers[0]);
    } else {
      console.log('\n⚠️  No admin user found');
    }
    
    // Check table structures
    console.log('\n📊 Table structures:');
    
    // Users table
    const [userCols] = await connection.execute('DESCRIBE users');
    console.log('\n👥 users table:');
    userCols.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    // Voting sessions table
    try {
      const [sessionCols] = await connection.execute('DESCRIBE voting_sessions');
      console.log('\n🗳️  voting_sessions table:');
      sessionCols.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type}`);
      });
    } catch (err) {
      console.log('\n❌ voting_sessions table not found');
    }
    
    // Session voters table
    try {
      const [voterCols] = await connection.execute('DESCRIBE session_voters');
      console.log('\n📝 session_voters table:');
      voterCols.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type}`);
      });
    } catch (err) {
      console.log('\n❌ session_voters table not found');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Please check your database credentials in backend/.env');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Database "voting_system" does not exist. Run the setup script first.');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 MySQL server is not running. Please start MySQL service.');
    }
    
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
  
  return true;
}

// Run the test
testDatabase().then(success => {
  if (success) {
    console.log('\n✅ Database test completed successfully!');
  } else {
    console.log('\n❌ Database test failed!');
  }
  process.exit(success ? 0 : 1);
});
