// PostgreSQL bağlantısını test etmek için basit bir test dosyası
import { Client } from 'pg'

export async function testDatabaseConnection() {
  const client = new Client({
    connectionString: 'postgresql://postgres:f0VIhEhylgBb4fw2mRf05goowBmqq3rR@okuldb.run.place:5432/postgres'
  })
  
  try {
    await client.connect()
    console.log('✅ Veritabanı bağlantısı başarılı!')
    
    // Tablolar var mı kontrol et
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    console.log('📊 Mevcut tablolar:', result.rows.map((row: any) => row.table_name))
    
    return true
  } catch (error) {
    console.error('❌ Veritabanı bağlantı hatası:', error)
    return false
  } finally {
    await client.end()
  }
} 