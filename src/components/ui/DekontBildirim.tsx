import { AlertTriangle } from 'lucide-react'

// DekontBildirim component geçici olarak devre dışı - Supabase to Prisma migration tamamlanana kadar
interface DekontBildirimProps {
  className?: string
}

export default function DekontBildirim({ className = '' }: DekontBildirimProps) {
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <div>
          <h4 className="text-sm font-medium text-red-900">🚧 Geçici Devre Dışı</h4>
          <p className="text-sm text-red-700">Dekont bildirimleri şu anda Prisma migration nedeniyle devre dışıdır.</p>
        </div>
      </div>
    </div>
  )
}