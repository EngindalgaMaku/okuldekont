'use client'

import { useEffect, useState, Fragment, ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Dialog, Transition, Menu as MenuDropdown } from '@headlessui/react'
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
 Check,
 ExternalLink,
 Building2,
 UserCheck,
 Sparkles,
 User,
 ChevronDown,
 MessageCircle
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
  const [adminUserName, setAdminUserName] = useState<string>('')
  
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
  const fetchSchoolName = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'school_name')
        .single()
      
      if (error) {
        console.error('Okul adı getirme hatası:', error)
        return
      }
      
      if (data?.value) {
        setSchoolName(data.value)
      }
    } catch (error) {
      console.error('Okul adı getirme hatası:', error)
    }
  }

  // Admin kullanıcı adını getir
  const fetchAdminUserName = async () => {
    if (!user?.id) return
    
    try {
      console.log('🔍 Fetching admin user name for ID:', user.id)
      const { data, error } = await supabase
        .from('admin_kullanicilar')
        .select('ad, soyad, email')
        .eq('id', user.id)
        .eq('aktif', true)
        .single()
      
      if (error) {
        console.error('Admin kullanıcı adı getirme hatası:', error)
        return
      }
      
      console.log('📊 Admin user data:', data)
      
      if (data?.ad && data?.soyad) {
        const fullName = `${data.ad} ${data.soyad}`
        console.log('✅ Setting admin user name:', fullName)
        setAdminUserName(fullName)
      }
    } catch (error) {
      console.error('Admin kullanıcı adı getirme hatası:', error)
    }
  }

  useEffect(() => {
    fetchSchoolName()
  }, [])

  useEffect(() => {
    if (user?.id && isAdmin) {
      fetchAdminUserName()
    }
  }, [user?.id, isAdmin])

  // Auth check and redirect logic
  useEffect(() => {
    if (!loading && !isSigningOut) {
      if (!user || !isAdmin) {
        if (pathname !== '/admin/login') {
          router.push('/admin/login')
        }
      }
    }
  }, [user, isAdmin, loading, pathname, router, isSigningOut])
  
  const handleLogout = async () => {
    if (isSigningOut) return // Prevent multiple simultaneous logout attempts
    
    setIsSigningOut(true)
    console.log('🚪 Logout initiated...')
    
    try {
      // Clear auth state immediately to prevent UI issues
      const { error } = await signOut()
      if (error) {
        console.error('Logout error:', error)
      }
      
      console.log('✅ Sign out completed, redirecting to login...')
      
      // Use a more forceful redirect approach
      setTimeout(() => {
        window.location.href = '/admin/login'
      }, 100)
      
    } catch (error) {
      console.error('Logout error:', error)
      // Force redirect even on error
      setTimeout(() => {
        window.location.href = '/admin/login'
      }, 100)
    } finally {
      // Reset the signing out state after a delay to prevent race conditions
      setTimeout(() => {
        setIsSigningOut(false)
      }, 1000)
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
            <GraduationCap className="h-8 w-8 text-white animate-pulse" />
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
    <div className={classNames(
      'flex min-h-screen bg-gray-50',
      desktopSidebarOpen ? 'pb-16' : 'pb-0'
    )}>
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
                    <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl shadow-sm">
                      <GraduationCap className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">K-Panel</h1>
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
            <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl shadow-sm">
              <GraduationCap className="w-8 h-8 text-indigo-600" />
            </div>
            {desktopSidebarOpen && (
              <div>
                <h1 className="text-xl font-bold text-gray-900">K-Panel</h1>
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
              {/* Quick Portal Links */}
              <div className="flex items-center gap-x-2">
                <Link
                  href="/admin/isletmeler"
                  className="flex items-center gap-x-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="İşletme Yönetimi - Tüm işletmeleri listele, filtrele ve yönet"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:block">İşletmeler</span>
                </Link>
                
                <Link
                  href="/admin/ogretmenler"
                  className="flex items-center gap-x-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Öğretmen Yönetimi - Tüm öğretmenleri listele, filtrele ve yönet"
                >
                  <UserCheck className="h-4 w-4" />
                  <span className="hidden sm:block">Öğretmenler</span>
                </Link>
                
                <Link
                  href="/admin/mesajlar"
                  className="flex items-center gap-x-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Mesajlaşma Merkezi - İşletme ve öğretmen mesajlaşma sistemi"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:block">Mesajlar</span>
                </Link>
              </div>

              {/* User dropdown */}
              {user && (
                <MenuDropdown as="div" className="relative hidden sm:block">
                  <MenuDropdown.Button className="flex items-center gap-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {adminUserName ||
                         user.user_metadata?.full_name ||
                         user.user_metadata?.name ||
                         user.email?.split('@')[0] ||
                         'Admin Kullanıcı'}
                      </p>
                      <p className="text-xs font-medium bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {adminRole === 'super_admin' ? 'K. Mud. Yard.' :
                         adminRole === 'admin' ? 'K. Mud. Yard.' :
                         adminRole === 'operator' ? 'Operatör' : 'K. Mud. Yard.'}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-sm font-medium text-indigo-600">
                        {(adminUserName ||
                          user.user_metadata?.full_name ||
                          user.user_metadata?.name ||
                          user.email ||
                          'A').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </MenuDropdown.Button>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <MenuDropdown.Items className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl bg-white py-2 shadow-xl ring-1 ring-gray-200 focus:outline-none">
                      <MenuDropdown.Item>
                        {({ active }) => (
                          <Link
                            href="/admin/profil"
                            className={classNames(
                              active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700',
                              'flex items-center px-4 py-3 text-sm font-medium transition-colors'
                            )}
                          >
                            <User className="mr-3 h-5 w-5" />
                            Profil Ayarları
                          </Link>
                        )}
                      </MenuDropdown.Item>
                      
                      <MenuDropdown.Item>
                        {({ active }) => (
                          <Link
                            href="/admin/ayarlar"
                            className={classNames(
                              active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700',
                              'flex items-center px-4 py-3 text-sm font-medium transition-colors'
                            )}
                          >
                            <Settings className="mr-3 h-5 w-5" />
                            Sistem Ayarları
                          </Link>
                        )}
                      </MenuDropdown.Item>
                      
                      <div className="my-1 h-px bg-gray-200" />
                      
                      <MenuDropdown.Item>
                        {({ active }) => (
                          <button
                            onClick={handleLogout}
                            disabled={isSigningOut}
                            className={classNames(
                              active ? 'bg-red-50 text-red-700' : 'text-gray-700',
                              'flex w-full items-center px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50'
                            )}
                          >
                            {isSigningOut ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-400 mr-3"></div>
                            ) : (
                              <LogOut className="mr-3 h-5 w-5" />
                            )}
                            {isSigningOut ? 'Çıkış Yapılıyor...' : 'Güvenli Çıkış'}
                          </button>
                        )}
                      </MenuDropdown.Item>
                    </MenuDropdown.Items>
                  </Transition>
                </MenuDropdown>
              )}
              
            </div>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Footer - Sadece sidebar açıkken göster */}
      {desktopSidebarOpen && (
        <footer className="w-full bg-gradient-to-br from-indigo-900 to-indigo-800 text-white py-4 fixed bottom-0 left-0 z-30 transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="font-bold bg-white text-indigo-900 w-6 h-6 flex items-center justify-center rounded-md">
                  {schoolName.charAt(0)}
                </div>
                <span className="text-sm">&copy; {new Date().getFullYear()} {schoolName}</span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}