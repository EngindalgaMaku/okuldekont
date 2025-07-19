import { NextResponse } from 'next/server'

// Veri bütünlüğü kontrolü geçici olarak devre dışı - Supabase to Prisma migration tamamlanana kadar
export async function GET() {
  return NextResponse.json({ 
    message: "Veri bütünlüğü kontrolü geçici olarak devre dışıdır. Prisma migration tamamlandıktan sonra aktif edilecektir.",
    issues: [],
    checkedAt: new Date().toISOString()
  })
}