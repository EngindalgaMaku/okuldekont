import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('dosya') as File | null
    const note = formData.get('note') as string | null

    if (!file) {
      return NextResponse.json({ error: 'dosya alanı zorunludur' }, { status: 400 })
    }

    // Read first few bytes just to touch the stream (optional)
    const arrayBuf = await file.arrayBuffer()
    const size = arrayBuf.byteLength

    return NextResponse.json({
      ok: true,
      filename: file.name,
      type: file.type,
      size,
      note: note || '',
      receivedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'unknown error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: 'Send POST multipart/form-data with field "dosya"' })
}
