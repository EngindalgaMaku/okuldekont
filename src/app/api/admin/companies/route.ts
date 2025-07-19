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

    return NextResponse.json(transformedCompanies)
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
    const { name, contact, phone, email, address, taxNumber, pin, teacherId } = await request.json()

    if (!name || !contact || !pin) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const company = await prisma.companyProfile.create({
      data: {
        name: name.trim(),
        contact: contact.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        taxNumber: taxNumber?.trim() || null,
        pin: pin.trim(),
        teacherId: teacherId || null,
        userId: '' // This will need to be handled properly when user management is implemented
      },
      include: {
        teacher: true,
        user: true
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
      teacherId: company.teacherId,
      teacher: company.teacher ? {
        id: company.teacher.id,
        name: company.teacher.name,
        surname: company.teacher.surname
      } : null
    })
  } catch (error) {
    console.error('Company creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    )
  }
}