const mysql = require('mysql2/promise');

async function testConnection() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not found');
    return;
  }
  
  console.log('🔄 Testing database connection...');
  console.log('📍 URL:', DATABASE_URL.replace(/:[^:@]+@/, ':****@')); // Hide password
  
  try {
    const connection = await mysql.createConnection(DATABASE_URL);
    console.log('✅ Database connection successful!');
    
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query test successful:', rows);
    
    await connection.end();
    console.log('✅ Connection closed properly');
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    // Specific error handling
    if (error.code === 'ENOTFOUND') {
      console.error('💡 Suggestion: Check hostname in DATABASE_URL');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Suggestion: Check port and firewall settings');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Suggestion: Check username/password in DATABASE_URL');
    }
  }
}

testConnection();