'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Receipt,
  FileText,
  BarChart3,
  Download,
  ChevronRight,
  Wrench,
  Printer,
  Users,
  ClipboardList,
  FileBarChart,
  FileCheck,
  History,
  TestTube2
} from 'lucide-react'

interface Tool {
  id: string
  title: string
  description: string
  icon: React.ElementType
  href: string
  color: string
  bgColor: string
  disabled?: boolean
}

const tools: Tool[] = [
  {
    id: 'gecmis-takip',
    title: 'Geçmiş Takip',
    description: 'Temporal veri ve geçmiş bilgi yönetimi, değişiklik geçmişi',
    icon: History,
    href: '/admin/temporal',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100'
  },
  {
    id: 'ogrenci-ucret-dokum',
    title: 'Öğrenci Ücret Dökümü',
    description: 'Öğrenci ücret dekont teslim çizelgesi çıktısı alın',
    icon: Receipt,
    href: '/admin/araclar/ogrenci-ucret-dokum',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100'
  },
  {
    id: 'raporlar',
    title: 'Raporlar',
    description: 'Staj fesih, atama ve diğer önemli işlem raporları oluşturun',
    icon: FileBarChart,
    href: '/admin/araclar/raporlar',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100'
  },
  {
    id: 'gorev-takibi',
    title: 'Görev Takibi',
    description: 'Öğretmen görev belgelerini görüntüleyin ve takip edin',
    icon: ClipboardList,
    href: '/admin/gorev-takip',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 hover:bg-indigo-100'
  },
  {
    id: 'toplu-belge-indirme',
    title: 'Toplu Belge İndirme',
    description: 'Öğretmen dekontlarını aylara göre ZIP olarak indirin',
    icon: Download,
    href: '/admin/araclar/toplu-belge-indirme',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100'
  },
  {
    id: 'belge-islemleri',
    title: 'Belge İşlemleri',
    description: 'Öğretmen ve işletme panellerinden yüklenen belgelerin onay/red işlemleri',
    icon: FileCheck,
    href: '/admin/araclar/belge-islemleri',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 hover:bg-teal-100'
  }
]

export default function AraclarPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTools = tools.filter(tool =>
    tool.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl">
            <Wrench className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Araçlar</h1>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Araç ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => (
          <div key={tool.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {tool.disabled ? (
              <div className={`p-6 ${tool.bgColor} opacity-50 cursor-not-allowed`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 ${tool.bgColor} rounded-lg`}>
                    <tool.icon className={`w-6 h-6 ${tool.color}`} />
                  </div>
                  <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full">
                    Yakında
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{tool.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{tool.description}</p>
                <div className="flex items-center text-gray-400 text-sm">
                  <span>Geliştirme aşamasında</span>
                </div>
              </div>
            ) : (
              <Link href={tool.href} className="block">
                <div className={`p-6 ${tool.bgColor} transition-colors`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 ${tool.bgColor} rounded-lg`}>
                      <tool.icon className={`w-6 h-6 ${tool.color}`} />
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{tool.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{tool.description}</p>
                  <div className={`flex items-center ${tool.color} text-sm font-medium`}>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            )}
          </div>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Araç bulunamadı</h3>
          <p className="text-gray-600">Arama kriterlerinize uygun araç bulunamadı.</p>
        </div>
      )}

    </div>
  )
}