const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testSaveFunctionality() {
  console.log('🔍 Testing save functionality...')
  
  try {
    // Get current table structure
    const { data: currentData, error: fetchError } = await supabase
      .from('isletmeler')
      .select('*')
      .limit(1)

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError)
      return
    }

    if (currentData && currentData.length > 0) {
      console.log('📋 Current table columns:', Object.keys(currentData[0]))
      
      const requiredColumns = [
        'faaliyet_alani',
        'vergi_numarasi', 
        'banka_hesap_no',
        'calisan_sayisi',
        'katki_payi_talebi',
        'usta_ogretici_adi',
        'usta_ogretici_telefon'
      ]
      
      const existingColumns = Object.keys(currentData[0])
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))
      
      if (missingColumns.length > 0) {
        console.log('❌ Missing columns:', missingColumns)
        console.log('🚨 Database columns must be added first!')
        return
      }
      
      console.log('✅ All required columns exist in database')
      
      // Test update functionality
      const testId = currentData[0].id
      console.log(`🧪 Testing update on record ID: ${testId}`)
      
      const updateData = {
        ad: currentData[0].ad || 'Test Company',
        adres: 'Test Address',
        telefon: '0555 123 45 67',
        email: 'test@example.com',
        yetkili_kisi: 'Test Person',
        pin: '1234',
        faaliyet_alani: 'Test Activity Area',
        vergi_numarasi: '1234567890',
        banka_hesap_no: 'TR00 0000 0000 0000 0000 00',
        calisan_sayisi: '10',
        katki_payi_talebi: 'evet',
        usta_ogretici_adi: 'Test Master Instructor',
        usta_ogretici_telefon: '0555 987 65 43'
      }
      
      const { error: updateError } = await supabase
        .from('isletmeler')
        .update(updateData)
        .eq('id', testId)
      
      if (updateError) {
        console.error('❌ Update error:', updateError)
        return
      }
      
      console.log('✅ Update test successful!')
      
      // Verify the update
      const { data: verifyData, error: verifyError } = await supabase
        .from('isletmeler')
        .select('*')
        .eq('id', testId)
        .single()
      
      if (verifyError) {
        console.error('❌ Verify error:', verifyError)
        return
      }
      
      console.log('📊 Updated record preview:')
      console.log('  - faaliyet_alani:', verifyData.faaliyet_alani)
      console.log('  - vergi_numarasi:', verifyData.vergi_numarasi)
      console.log('  - banka_hesap_no:', verifyData.banka_hesap_no)
      console.log('  - calisan_sayisi:', verifyData.calisan_sayisi)
      console.log('  - katki_payi_talebi:', verifyData.katki_payi_talebi)
      console.log('  - usta_ogretici_adi:', verifyData.usta_ogretici_adi)
      console.log('  - usta_ogretici_telefon:', verifyData.usta_ogretici_telefon)
      
    } else {
      console.log('❌ No data found in isletmeler table')
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error)
  }
}

testSaveFunctionality()
  .then(() => {
    console.log('🎉 Test completed!')
  })
  .catch(console.error)