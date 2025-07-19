'use client'

import { User, Users, Building2, Mail, Phone, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Ogretmen {
  id: string;
  ad: string;
  soyad: string;
  email: string | null;
  telefon: string | null;
  ogrenci_sayisi: number;
  isletme_sayisi: number;
}

interface Props {
  ogretmenler: Ogretmen[]
}

export default function OgretmenlerTab({ ogretmenler }: Props) {
  if (ogretmenler.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz öğretmen yok</h3>
        <p className="mt-1 text-sm text-gray-500">Bu alana henüz öğretmen atanmamış.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Öğretmen
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                İletişim
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Öğrenci Sayısı
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşletme Sayısı
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Detaylar</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ogretmenler.map((ogretmen) => (
              <tr key={ogretmen.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{ogretmen.ad} {ogretmen.soyad}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {ogretmen.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {ogretmen.email}
                    </div>
                  )}
                  {ogretmen.telefon && (
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      {ogretmen.telefon}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center">
                    <Users className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm font-semibold text-gray-800">{ogretmen.ogrenci_sayisi}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm font-semibold text-gray-800">{ogretmen.isletme_sayisi}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href={`/admin/ogretmenler/${ogretmen.id}`} className="inline-flex items-center text-indigo-600 hover:text-indigo-900">
                    Detaylar
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}