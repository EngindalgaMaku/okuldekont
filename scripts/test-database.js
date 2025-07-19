// Database bağlantısını test etmek için basit bir script
const { Client } = require('pg')

async function testDatabaseConnection() {
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
    
    console.log('📊 Mevcut tablolar:', result.rows.map(row => row.table_name))
    
    // Siniflar tablosu var mı kontrol et
    const siniflarResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'siniflar'
    `)
    
    if (siniflarResult.rows[0].count > 0) {
      console.log('✅ siniflar tablosu mevcut')
      
      // Siniflar tablosundaki verileri kontrol et
      const siniflarData = await client.query('SELECT * FROM siniflar LIMIT 5')
      console.log('📊 Siniflar tablosundaki örnek veriler:', siniflarData.rows)
    } else {
      console.log('❌ siniflar tablosu bulunamadı')
    }
    
    return true
  } catch (error) {
    console.error('❌ Veritabanı bağlantı hatası:', error)
    return false
  } finally {
    await client.end()
  }
}

testDatabaseConnection().catch(console.error) 