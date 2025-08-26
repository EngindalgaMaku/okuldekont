import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const field = await prisma.alan.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            teachers: true,
            students: true,
            classes: true,
          },
        },
      },
    })

    if (!field) {
      return NextResponse.json({ error: 'Alan bulunamadı' }, { status: 404 })
    }

    // Extra safety: verify zero-orphans by querying minimal IDs
    const [teacherIds, studentIds, classIds] = await Promise.all([
      field._count.teachers > 0
        ? prisma.teacherProfile.findMany({ where: { alanId: id }, select: { id: true }, take: 5 })
        : Promise.resolve([]),
      field._count.students > 0
        ? prisma.student.findMany({ where: { alanId: id }, select: { id: true }, take: 5 })
        : Promise.resolve([]),
      field._count.classes > 0
        ? prisma.class.findMany({ where: { alanId: id }, select: { id: true }, take: 5 })
        : Promise.resolve([]),
    ])

    return NextResponse.json({
      id: field.id,
      ad: field.name,
      counts: {
        teachers: field._count.teachers,
        students: field._count.students,
        classes: field._count.classes,
      },
      sampleIds: {
        teachers: teacherIds.map(t => t.id),
        students: studentIds.map(s => s.id),
        classes: classIds.map(c => c.id),
      },
    })
  } catch (error) {
    console.error('Alan ilişkileri sorgulanırken hata:', error)
    return NextResponse.json({ error: 'İlişkiler getirilemedi' }, { status: 500 })
  }
}
