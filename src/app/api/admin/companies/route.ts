import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get all companies with related data
    const companies = await prisma.companyProfile.findMany({
      include: {
        teacher: true,
        user: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Transform data to match expected interface
    const transformedCompanies = companies.map(company => ({
      id: company.id,
      name: company.name,
      contact: company.contact,
      phone: company.phone,
      email: company.email,
      address: company.address,
      taxNumber: company.taxNumber,
      pin: company.pin,
      teacherId: company.teacherId,
      teacher: company.teacher ? {
        id: company.teacher.id,
        name: company.teacher.name,
        surname: company.teacher.surname
      } : null
    }))

    return NextResponse.json({
      success: true,
      data: transformedCompanies
    })
  } catch (error) {
    console.error('Companies fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { name, contact, phone, email, address, taxNumber, teacherId, pin, usta_ogretici_ad, usta_ogretici_telefon } = await request.json()

    if (!name || !contact) {
      return NextResponse.json(
        { error: 'İşletme adı ve yetkili kişi zorunludur' },
        { status: 400 }
      )
    }

    // Use provided PIN or generate a random 4-digit PIN for the company
    const companyPin = pin || Math.floor(1000 + Math.random() * 9000).toString()

    const company = await prisma.companyProfile.create({
      data: {
        name: name.trim(),
        contact: contact.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        taxNumber: taxNumber?.trim() || null,
        pin: companyPin,
        masterTeacherName: usta_ogretici_ad?.trim() || null,
        masterTeacherPhone: usta_ogretici_telefon?.trim() || null
        // teacherId and userId are handled via relations, not direct fields
      }
    })

    return NextResponse.json({
      id: company.id,
      name: company.name,
      contact: company.contact,
      phone: company.phone,
      email: company.email,
      address: company.address,
      taxNumber: company.taxNumber,
      pin: company.pin,
      masterTeacherName: company.masterTeacherName,
      masterTeacherPhone: company.masterTeacherPhone,
      message: `İşletme başarıyla oluşturuldu. Giriş PIN kodu: ${companyPin}`
    })
  } catch (error) {
    console.error('Company creation error:', error)
    return NextResponse.json(
      { error: 'İşletme oluşturulurken bir hata oluştu: ' + (error as Error).message },
      { status: 500 }
    )
  }
}