'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Briefcase, Save, ArrowLeft, Loader } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function DuzenleAlanPage() {
  const router = useRouter()
  const params = useParams()
  const id = Number(params.id)
  
  const [alanAdi, setAlanAdi] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (isNaN(id)) {
        setNotFound(true);
        setLoading(false);
        return;
    }
    const fetchAlan = async () => {
        const { data, error } = await supabase.from('alanlar').select('ad').eq('id', id).single()
        if (error || !data) {
          setNotFound(true)
          console.error("Alan getirilirken hata:", error)
        } else {
          setAlanAdi(data.ad)
        }
        setLoading(false)
    }
    fetchAlan()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!alanAdi.trim()) {
      alert('Alan adı boş olamaz.')
      return
    }
    setLoading(true)
    
    const { error } = await supabase.from('alanlar').update({ ad: alanAdi.trim() }).match({ id })

    if(error) {
        alert('Alan güncellenirken bir hata oluştu: ' + error.message)
        setLoading(false)
    } else {
        router.push('/admin/alanlar')
        router.refresh()
    }
  }

  if (loading) {
    return (
        <div className="flex justify-center items-center h-32">
            <Loader className="animate-spin h-8 w-8 text-indigo-600" />
        </div>
    )
  }

  if (notFound) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
            <div className="max-w-md mx-auto bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl p-6 border border-red-100">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Alan Bulunamadı</h1>
                <p className="text-gray-500 mb-6">Aradığınız alan mevcut değil veya silinmiş olabilir.</p>
                <button
                    onClick={() => router.push('/admin/alanlar')}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl shadow-sm text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
                >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Alan Listesine Geri Dön
                </button>
            </div>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Alanı Düzenle
            </h1>
            <p className="text-gray-600 mt-2">Mevcut alanı güncelleyin.</p>
          </div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl shadow-sm text-gray-700 bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-200"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Geri Dön
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl p-8 border border-indigo-100">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <label htmlFor="alanAdi" className="block text-sm font-medium text-gray-700 mb-2">
                  Alan Adı
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="alanAdi"
                    id="alanAdi"
                    value={alanAdi}
                    onChange={(e) => setAlanAdi(e.target.value)}
                    className="pl-10 pr-4 py-3 block w-full border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900"
                    placeholder="Örn: Bilişim Teknolojileri"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="pt-8">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200"
                  disabled={loading}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent shadow-lg text-sm font-medium rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {loading ? 'Güncelleniyor...' : 'Güncelle'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 