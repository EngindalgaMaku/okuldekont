import { CheckCircle, XCircle, Clock } from 'lucide-react'

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'onaylandi': return <CheckCircle className="h-4 w-4" />
    case 'reddedildi': return <XCircle className="h-4 w-4" />
    default: return <Clock className="h-4 w-4" />
  }
}

export const getStatusText = (status: string) => {
  switch (status) {
    case 'onaylandi': return 'Onaylandı'
    case 'reddedildi': return 'Reddedildi'
    default: return 'Bekliyor'
  }
}

export const getStatusClass = (status: string) => {
  switch (status) {
    case 'onaylandi': return 'bg-green-100 text-green-800'
    case 'reddedildi': return 'bg-red-100 text-red-800'
    default: return 'bg-yellow-100 text-yellow-800'
  }
} 