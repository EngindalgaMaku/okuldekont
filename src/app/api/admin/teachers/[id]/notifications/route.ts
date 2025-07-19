import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    }

    // Check if notifications table exists, if not return empty array
    try {
      const notifications = await prisma.$queryRaw`
        SELECT id, title, content, priority, recipient_id, recipient_type, sent_by, is_read, read_at, created_at
        FROM notifications
        WHERE recipient_id = ${id} AND recipient_type = 'ogretmen'
        ORDER BY created_at DESC
      `;
      return NextResponse.json(notifications);
    } catch (tableError: any) {
      // If table doesn't exist, return empty array
      if (tableError.code === 'ER_NO_SUCH_TABLE' || tableError.message?.includes("doesn't exist")) {
        console.log('Notifications table does not exist yet, returning empty array');
        return NextResponse.json([]);
      }
      throw tableError;
    }
  } catch (error) {
    console.error('Bildirimler getirme hatası:', error);
    return NextResponse.json([]);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { notificationId, markAsRead } = await request.json();
    
    if (!id || !notificationId) {
      return NextResponse.json({ error: 'ID ve notificationId gerekli' }, { status: 400 });
    }

    try {
      const readAt = markAsRead ? new Date() : null;
      await prisma.$executeRaw`
        UPDATE notifications
        SET is_read = ${markAsRead}, read_at = ${readAt}
        WHERE id = ${notificationId}
      `;

      return NextResponse.json({ success: true });
    } catch (tableError: any) {
      if (tableError.code === 'ER_NO_SUCH_TABLE' || tableError.message?.includes("doesn't exist")) {
        return NextResponse.json({ success: true });
      }
      throw tableError;
    }
  } catch (error) {
    console.error('Bildirim güncelleme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { markAllAsRead } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    }

    if (markAllAsRead) {
      try {
        const now = new Date();
        await prisma.$executeRaw`
          UPDATE notifications
          SET is_read = true, read_at = ${now}
          WHERE recipient_id = ${id} AND recipient_type = 'ogretmen' AND is_read = false
        `;
      } catch (tableError: any) {
        if (tableError.code === 'ER_NO_SUCH_TABLE' || tableError.message?.includes("doesn't exist")) {
          return NextResponse.json({ success: true });
        }
        throw tableError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Tüm bildirimler güncelleme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}