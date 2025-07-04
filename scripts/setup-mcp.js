const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://guqwqbxsfvddwwczwljp.supabase.co'
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXdxYnhzZnZkZHd3Y3p3bGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY4OTQ2MCwiZXhwIjoyMDY2MjY1NDYwfQ.snDNh-cNBjEoLstTmE3U6loXPrhKydBoTG7BvP6BONQ'

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function setupMCP() {
  try {
    console.log('🔧 MCP Kurulumu başlatılıyor...')
    
    // exec_sql fonksiyonunu oku
    const setupSQL = fs.readFileSync(
      path.join(__dirname, '../supabase/migrations/005_add_exec_sql.sql'),
      'utf8'
    )
    
    // Fonksiyonu direkt SQL olarak çalıştır
    const { data, error } = await supabase.rpc('exec_sql', {
      query: setupSQL
    })
    
    if (error) {
      console.error('❌ MCP Kurulum hatası:', error.message)
      return false
    }
    
    console.log('✅ MCP Kurulumu başarılı!')
    return true
    
  } catch (error) {
    console.error('❌ MCP Kurulum hatası:', error.message)
    return false
  }
}

setupMCP() 