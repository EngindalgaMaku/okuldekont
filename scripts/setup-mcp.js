const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Environment variables'dan bilgileri al
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY environment variables gerekli!')
  process.exit(1)
}

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