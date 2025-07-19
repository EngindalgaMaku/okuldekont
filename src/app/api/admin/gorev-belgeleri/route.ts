import { NextResponse } from 'next/server'

// Görev belgeleri API geçici olarak devre dışı - Supabase to Prisma migration tamamlanana kadar
export async function GET(request: Request) {
  return NextResponse.json({ 
    message: "Görev belgeleri API geçici olarak devre dışıdır. Prisma migration tamamlandıktan sonra aktif edilecektir.",
    data: [],
    totalCount: 0
  })
}

export async function DELETE(request: Request) {
  return NextResponse.json({ 
    message: "Görev belgeleri API geçici olarak devre dışıdır. Prisma migration tamamlandıktan sonra aktif edilecektir.",
    success: false
  })
}