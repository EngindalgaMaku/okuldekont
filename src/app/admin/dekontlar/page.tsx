'use client'

// Bu sayfa Supabase'den Prisma'ya migration edilecek
export default function DekontYonetimiPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-full mx-auto px-6 sm:px-8 lg:px-12 py-8">
        <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl p-8 border border-indigo-100">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">
            Dekont Yönetimi
          </h1>
          <p className="text-gray-600">Bu sayfa şu anda bakım altında. Lütfen daha sonra tekrar deneyin.</p>
        </div>
      </div>
    </div>
  )
}