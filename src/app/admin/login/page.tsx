'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Mail, Lock, LogIn } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Geçici giriş kontrolü - Gerçek uygulamada API çağrısı yapılmalı
    if (email === 'admin@email.com' && password === 'admin') {
      // Giriş başarılı olursa, bir session bilgisi oluştur
      sessionStorage.setItem('admin-auth', 'true')
      router.push('/admin')
    } else {
      setError('Geçersiz e-posta veya şifre.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Admin Paneli
          </h1>
          <p className="text-gray-600 mt-1">Yönetici girişi yapın</p>
        </div>
        
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
          <div className="flex items-start">
            <div className="p-2 bg-indigo-100 rounded-lg mr-3">
              <LogIn className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-indigo-800 mb-1">Demo Giriş Bilgileri:</p>
              <p className="text-sm text-indigo-700"><strong>E-posta:</strong> admin@email.com</p>
              <p className="text-sm text-indigo-700"><strong>Şifre:</strong> admin</p>
            </div>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              E-posta
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="admin@email.com"
              />
            </div>
          </div>
          
          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              Şifre
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="Şifrenizi girin"
              />
            </div>
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}
          
          <button
            type="submit"
            className="w-full flex justify-center items-center py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Giriş Yap
          </button>
        </form>
      </div>
    </div>
  )
} 