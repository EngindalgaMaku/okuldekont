'use client'

import { useEffect, useState, Fragment, ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Dialog, Transition } from '@headlessui/react'
import {
  Home,
  Menu,
  X,
  Building,
  Users,
  Briefcase,
  FileText,
  LogOut,
 Calendar,
 Shield,
 Settings,
 GraduationCap,
 Receipt,
 AlertTriangle,
 BarChart3,
 BookOpen,
 Check
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

const menuItems = [
  {
    title: 'Dashboard',
    icon: Home,
    href: '/admin',
    description: 'Genel bakış ve istatistikler'
  },
  {
    title: 'Koordinatörlük Yönetimi',
    icon: Briefcase,
    href: '/admin/stajlar',
    description: 'Öğrenci staj süreçleri'
  },
  {
    title: 'Alanlar',
    icon: BookOpen,
    href: '/admin/alanlar',
    description: 'Alan seçimi ve kademeli yönetim'
  },
  {
    title: 'Dekontlar',
    icon: Receipt,
    href: '/admin/dekontlar',
    description: 'Ödeme ve dekont yönetimi'
  },
  {
    title: 'Görev Takibi',
    icon: Check,
    href: '/admin/gorev-takip',
    description: 'Görev belgelerinin takibi'
  }
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    const listener = () => setMatches(media.matches)
    media.addListener(listener)
    return () => media.removeListener(listener)
  }, [matches, query])

  return matches
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, isAdmin, adminRole, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [schoolName, setSchoolName] = useState('Hüsniye Özdilek MTAL')
  
  // Tablet ve daha küçük ekranlar için media query
  const isTabletOrSmaller = useMediaQuery('(max-width: 1279px)')

  // Tablet/mobil cihazlarda sidebar'ı otomatik küçült
  useEffect(() => {
    if (isTabletOrSmaller) {
      setDesktopSidebarOpen(false)
    } else {
      setDesktopSidebarOpen(true)
    }
  }, [isTabletOrSmaller])

  // Okul ismini ayarlardan çek
  // Okul ismini geçici olarak sabit bir değerle ayarla
  useEffect(() => {
    setSchoolName('Hüsniye Özdilek MTAL');
  }, []);

  // Auth check and redirect logic
  useEffect(() => {
    if (!loading) {
      if (!user || !isAdmin) {
        if (pathname !== '/admin/login') {
          router.push('/admin/login')
        }
      }
    }
  }, [user, isAdmin, loading, pathname, router])
  
  const handleLogout = async () => {
    setIsSigningOut(true)
    try {
      const { error } = await signOut()
      if (error) {
        console.error('Logout error:', error)
        // Still redirect to login even if there's an error
      }
      router.push('/admin/login')
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/admin/login')
    } finally {
      setIsSigningOut(false)
    }
  }

  // Always render login page
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-white animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-48 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  // Show unauthorized access
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Yetkisiz Erişim</h1>
          <p className="text-gray-600 mb-6">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
          <button
            onClick={() => router.push('/admin/login')}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Giriş Sayfasına Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50 pb-16">
      {/* Mobile Sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                      <span className="sr-only">Menüyü kapat</span>
                      <X className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                
                {/* Sidebar component for mobile */}
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                  <div className="flex items-center gap-3 px-4 py-6 border-b border-gray-200">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                      <Shield className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">Admin Paneli</h1>
                      <p className="text-sm text-gray-500">Koordinatörlük Yönetimi</p>
                    </div>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {menuItems.map((item) => (
                            <div key={item.href} className="space-y-1">
                              <Link
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 group transition-colors duration-150
                                  ${pathname === item.href ? 'bg-indigo-50 text-indigo-700' : ''}`}
                              >
                                <item.icon className={`w-5 h-5 ${pathname === item.href ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600'}`} />
                                <span className="font-medium">{item.title}</span>
                              </Link>
                              
                            </div>
                          ))}
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop Sidebar */}
      <div
        className={classNames(
          desktopSidebarOpen ? 'lg:w-72' : 'lg:w-20',
          'hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:flex-col transition-all duration-300'
        )}
      >
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white">
          <div className={classNames(
            desktopSidebarOpen ? 'justify-start px-6' : 'justify-center px-2',
            'flex h-16 items-center gap-3 border-b border-gray-200 transition-all duration-300'
          )}>
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Shield className="w-8 h-8 text-indigo-600" />
            </div>
            {desktopSidebarOpen && (
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Paneli</h1>
                <p className="text-sm text-gray-500">Koordinatörlük Yönetimi</p>
              </div>
            )}
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className={classNames(
                  desktopSidebarOpen ? 'px-4' : 'px-2',
                  'space-y-1'
                )}>
                  {menuItems.map((item) => (
                    <div key={item.href} className="space-y-1">
                      <Link
                        href={item.href}
                        className={classNames(
                          pathname === item.href ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700',
                          desktopSidebarOpen ? 'px-3' : 'justify-center px-2',
                          'group flex items-center gap-x-3 py-2 rounded-lg transition-colors duration-150'
                        )}
                        title={!desktopSidebarOpen ? item.title : undefined}
                      >
                        <item.icon className={classNames(
                          pathname === item.href ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600',
                          'h-5 w-5 shrink-0'
                        )} />
                        {desktopSidebarOpen && <span className="font-medium">{item.title}</span>}
                      </Link>
                      
                    </div>
                  ))}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className={classNames(
        desktopSidebarOpen ? 'lg:pl-72' : 'lg:pl-20',
        'flex flex-1 flex-col lg:ml-0 transition-all duration-300'
      )}>
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Menüyü aç</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="hidden lg:block -m-2.5 p-2.5 text-gray-700"
            onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
          >
            <span className="sr-only">{desktopSidebarOpen ? 'Menüyü daralt' : 'Menüyü genişlet'}</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-end">
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Settings Link */}
              <Link
                href="/admin/ayarlar"
                className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 transition-colors"
                title="Sistem Ayarları"
              >
                <span className="sr-only">Ayarlar</span>
                <Settings className="h-6 w-6" aria-hidden="true" />
              </Link>
              
              {/* User info */}
              {user && (
                <div className="hidden sm:flex sm:items-center sm:gap-x-2">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user.user_metadata?.full_name || user.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-gray-500">
                      {adminRole === 'super_admin' ? 'Süper Admin' :
                       adminRole === 'admin' ? 'Admin' :
                       adminRole === 'operator' ? 'Operatör' : 'Admin'}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-indigo-600">
                      {(user.user_metadata?.full_name || user.email || 'A').charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
              
              <button
                type="button"
                onClick={handleLogout}
                disabled={isSigningOut}
                className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Güvenli Çıkış"
              >
                <span className="sr-only">Çıkış Yap</span>
                {isSigningOut ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
                ) : (
                  <LogOut className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="w-full bg-gradient-to-br from-indigo-900 to-indigo-800 text-white py-4 fixed bottom-0 left-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="font-bold bg-white text-indigo-900 w-6 h-6 flex items-center justify-center rounded-md">
                A
              </div>
              <span className="text-sm">&copy; {new Date().getFullYear()} {schoolName}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}