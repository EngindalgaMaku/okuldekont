'use client'

import { useEffect, useState, Fragment, ReactNode, Suspense } from 'react'
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
  MessageCircle,
  Wrench
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const menuItems = [
  {
    title: 'Dashboard',
    icon: Home,
    href: '/admin',
    description: 'Genel bakış ve istatistikler'
  },
  {
    title: 'Meslek Alanları',
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
    title: 'Stajlar',
    icon: GraduationCap,
    href: '/admin/stajlar',
    description: 'Öğrenci staj süreçleri ve koordinatörlük yönetimi'
  },
  {
    title: 'Araçlar',
    icon: Wrench,
    href: '/admin/araclar',
    description: 'Raporlama araçları ve geçmiş takip'
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
  const [schoolName, setSchoolName] = useState('')
  const [adminUserName, setAdminUserName] = useState<string>('')
  const [activeEducationYear, setActiveEducationYear] = useState<string>('')
  const [activeEducationYearId, setActiveEducationYearId] = useState<string>('')
  const [educationYears, setEducationYears] = useState<any[]>([])
  const [educationYearsLoading, setEducationYearsLoading] = useState(false)
  const [changingYear, setChangingYear] = useState(false)

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
      const response = await fetch('/api/system-settings/school-name')
      if (!response.ok) {
        console.error('Okul adı getirme hatası:', response.statusText)
        return
      }

      const data = await response.json()
      if (data?.value) {
        setSchoolName(data.value)
      }
    } catch (error) {
      console.error('Okul adı getirme hatası:', error)
    }
  }

  // Admin kullanıcı adını getir
  const fetchAdminUserName = async () => {
    if (!user?.email) return

    try {
      console.log('🔍 Fetching admin user name for email:', user.email)
      const response = await fetch(`/api/admin/user-info?email=${encodeURIComponent(user.email)}`)
      if (!response.ok) {
        console.error('Admin kullanıcı adı getirme hatası:', response.statusText)
        return
      }

      const data = await response.json()
      console.log('📊 Admin user data:', data)

      if (data?.name) {
        console.log('✅ Setting admin user name:', data.name)
        setAdminUserName(data.name)
      }
    } catch (error) {
      console.error('Admin kullanıcı adı getirme hatası:', error)
    }
  }

  // Aktif eğitim yılını getir
  const fetchActiveEducationYear = async () => {
    try {
      const response = await fetch('/api/admin/education-years/active')
      if (!response.ok) {
        console.error('Aktif eğitim yılı getirme hatası:', response.statusText)
        return
      }
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Aktif eğitim yılı getirme hatası: JSON bekleniyordu, gelen yanıt HTML/text görünüyor. İlk 200 karakter:', text.slice(0, 200))
        return
      }

      const data = await response.json()
      if (data?.year) {
        setActiveEducationYear(data.year)
        if (data?.id) setActiveEducationYearId(data.id)
      }
    } catch (error) {
      console.error('Aktif eğitim yılı getirme hatası:', error)
    }
  }

  // Eğitim yıllarını getir (liste)
  const fetchEducationYears = async () => {
    try {
      setEducationYearsLoading(true)
      const response = await fetch('/api/admin/education-years')
      if (!response.ok) throw new Error('Eğitim yılları getirilemedi')
      const data = await response.json()
      setEducationYears(data || [])
      const active = (data || []).find((y: any) => y.active)
      if (active) {
        setActiveEducationYear(active.year)
        setActiveEducationYearId(active.id)
      }
    } catch (err) {
      console.error('Eğitim yılları çekilirken hata:', err)
    } finally {
      setEducationYearsLoading(false)
    }
  }

  // Aktif eğitim yılını değiştir
  const handleChangeActiveEducationYear = async (yearId: string) => {
    try {
      setChangingYear(true)
      const year = educationYears.find((y: any) => y.id === yearId)
      if (!year) return
      const response = await fetch('/api/admin/education-years', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...year,
          active: true
        })
      })
      if (!response.ok) throw new Error('Aktif dönem güncellenemedi')
      // Refresh local state
      await fetchEducationYears()
      // Refresh route to re-fetch server components/data loaders
      router.refresh()
      // Tam sayfa yenileme: tüm client componentleri ve cache'leri temiz şekilde yeniden yüklesin
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload()
        }
      }, 50)
    } catch (error) {
      console.error('Aktif dönem değiştirilirken hata:', error)
      alert('Aktif dönem değiştirilemedi')
    } finally {
      setChangingYear(false)
    }
  }

  useEffect(() => {
    fetchSchoolName()
  }, [])

  useEffect(() => {
    if (user?.id && isAdmin) {
      fetchAdminUserName()
      fetchActiveEducationYear()
      fetchEducationYears()
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
    return (
      <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
        {children}
      </Suspense>
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
                  <div className="flex items-center justify-center px-4 py-6 border-b border-gray-200">
                    <div className="text-center">
                      <p className="text-2xl font-extrabold text-gray-900 leading-tight">K-Panel</p>
                      <p className="text-xs text-gray-600 tracking-wide">Koordinatörlük Takip Uygulaması</p>
                    </div>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        {/* Aktif Dönem Göstergesi - Mobil Sidebar */}
                        {activeEducationYear && (
                          <div className="px-3 mb-4">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                              <label className="block text-xs font-medium text-blue-700 mb-1">
                                Aktif Dönem
                              </label>
                              <select
                                value={activeEducationYearId || ''}
                                onChange={(e) => handleChangeActiveEducationYear(e.target.value)}
                                disabled={educationYearsLoading || changingYear}
                                className="w-full text-sm font-medium text-blue-900 bg-white border border-blue-200 rounded-md px-2 py-1 disabled:opacity-60"
                              >
                                {(educationYears || []).filter((y: any) => !y.archived).map((y: any) => (
                                  <option key={y.id} value={y.id}>
                                    {y.year} Eğitim Yılı{y.active ? ' (aktif)' : ''}
                                  </option>
                                ))}
                              </select>
                              {changingYear && (
                                <p className="mt-1 text-[11px] text-blue-700">Güncelleniyor...</p>
                              )}
                            </div>
                          </div>
                        )}

                        <ul role="list" className="-mx-2 space-y-1">
                          {menuItems.map((item) => (
                            <div key={item.href} className="space-y-1">
                              <Link
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 group transition-colors duration-150
                                  ${pathname === item.href ? 'bg-indigo-50 text-indigo-700' : ''}`}
                                onClick={() => setSidebarOpen(false)}
                              >
                                <item.icon className={`w-5 h-5 ${pathname === item.href ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600'}`} />
                                <span className="font-medium">{item.title}</span>
                              </Link>

                            </div>
                          ))}
                        </ul>
                      </li>

                      {/* Quick Links for Mobile */}
                      <li>
                        <div className="text-xs font-semibold leading-6 text-gray-400 px-3">Hızlı Erişim</div>
                        <ul role="list" className="-mx-2 mt-2 space-y-1">
                          <Link
                            href="/admin/isletmeler"
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-orange-50 hover:text-orange-700 group transition-colors duration-150"
                            onClick={() => setSidebarOpen(false)}
                          >
                            <Building2 className="w-5 h-5 text-gray-400 group-hover:text-orange-600" />
                            <span className="font-medium">İşletmeler</span>
                          </Link>
                          <Link
                            href="/admin/ogretmenler"
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700 group transition-colors duration-150"
                            onClick={() => setSidebarOpen(false)}
                          >
                            <UserCheck className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                            <span className="font-medium">Öğretmenler</span>
                          </Link>
                          <Link
                            href="/admin/ogrenciler"
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-purple-50 hover:text-purple-700 group transition-colors duration-150"
                            onClick={() => setSidebarOpen(false)}
                          >
                            <Users className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
                            <span className="font-medium">Öğrenciler</span>
                          </Link>
                        </ul>
                      </li>

                      {/* User Menu for Mobile */}
                      {user && (
                        <li className="mt-auto">
                          <div className="border-t border-gray-200 pt-4">
                            <div className="px-3 mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center shadow-sm">
                                  <span className="text-sm font-medium text-indigo-600">
                                    {(adminUserName ||
                                      user.user_metadata?.full_name ||
                                      user.user_metadata?.name ||
                                      user.email ||
                                      'A').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {adminUserName ||
                                     user.user_metadata?.full_name ||
                                     user.user_metadata?.name ||
                                     user.email?.split('@')[0] ||
                                     'Admin Kullanıcı'}
                                  </p>
                                  <p className="text-xs font-medium bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                    {adminRole === 'super_admin' ? 'K. Müd. Yard.' :
                                     adminRole === 'admin' ? 'Admin' :
                                     adminRole === 'operator' ? 'Admin' : 'Admin'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <ul role="list" className="-mx-2 space-y-1">
                              <Link
                                href="/admin/mesajlar"
                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-purple-50 hover:text-purple-700 group transition-colors duration-150"
                                onClick={() => setSidebarOpen(false)}
                              >
                                <MessageCircle className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
                                <span className="font-medium">Mesajlar</span>
                              </Link>
                              <Link
                                href="/admin/profil"
                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 group transition-colors duration-150"
                                onClick={() => setSidebarOpen(false)}
                              >
                                <User className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
                                <span className="font-medium">Profil</span>
                              </Link>
                              <Link
                                href="/admin/ayarlar"
                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 group transition-colors duration-150"
                                onClick={() => setSidebarOpen(false)}
                              >
                                <Settings className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
                                <span className="font-medium">Ayarlar</span>
                              </Link>
                              <button
                                onClick={() => {
                                  setSidebarOpen(false)
                                  handleLogout()
                                }}
                                disabled={isSigningOut}
                                className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-700 group transition-colors duration-150 disabled:opacity-50"
                              >
                                {isSigningOut ? (
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-400"></div>
                                ) : (
                                  <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-600" />
                                )}
                                <span className="font-medium">{isSigningOut ? 'Çıkış Yapılıyor...' : 'Çıkış Yap'}</span>
                              </button>
                            </ul>
                          </div>
                        </li>
                      )}
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
            'flex items-center justify-center border-b border-gray-200 transition-all duration-300',
            desktopSidebarOpen ? 'h-28 py-4' : 'h-16 py-2'
          )}>
            {desktopSidebarOpen && (
              <div className="text-center">
                <p className="text-2xl font-extrabold text-gray-900 leading-tight">K-Panel</p>
                <p className="text-sm text-gray-600 tracking-wide">Koordinatörlük Takip Uygulaması</p>
              </div>
            )}
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                {/* Aktif Dönem Göstergesi - Sadece sidebar açıkken */}
                {desktopSidebarOpen && activeEducationYear && (
                  <div className="px-4 mb-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                      <label className="block text-xs font-medium text-blue-700 mb-1">
                        Aktif Dönem
                      </label>
                      <select
                        value={activeEducationYearId || ''}
                        onChange={(e) => handleChangeActiveEducationYear(e.target.value)}
                        disabled={educationYearsLoading || changingYear}
                        className="w-full text-sm font-medium text-blue-900 bg-white border border-blue-200 rounded-md px-2 py-1 disabled:opacity-60"
                      >
                        {(educationYears || []).filter((y: any) => !y.archived).map((y: any) => (
                          <option key={y.id} value={y.id}>
                            {y.year} Eğitim Yılı{y.active ? ' (aktif)' : ''}
                          </option>
                        ))}
                      </select>
                      {changingYear && (
                        <p className="mt-1 text-[11px] text-blue-700">Güncelleniyor...</p>
                      )}
                    </div>
                  </div>
                )}

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
                          pathname === item.href ? 'text-indigo-600' :
                          !desktopSidebarOpen ?
                            (item.href === '/admin' ? 'text-blue-500 group-hover:text-blue-600' :
                             item.href === '/admin/alanlar' ? 'text-green-500 group-hover:text-green-600' :
                             item.href === '/admin/dekontlar' ? 'text-purple-500 group-hover:text-purple-600' :
                             item.href === '/admin/araclar' ? 'text-orange-500 group-hover:text-orange-600' :
                             'text-gray-400 group-hover:text-indigo-600') :
                          'text-gray-400 group-hover:text-indigo-600',
                          'h-5 w-5 shrink-0'
                        )} />
                        {desktopSidebarOpen && <span className="font-medium">{item.title}</span>}
                      </Link>

                    </div>
                  ))}
                </ul>
              </li>

              {/* Sidebar Footer - sadece açık durumda göster */}
              {desktopSidebarOpen && (
                <li className="mt-auto">
                  <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 text-white py-4">
                    <div className="px-4 sm:px-6 lg:px-8">
                      <div className="flex items-center justify-center h-6">
                      </div>
                    </div>
                  </div>
                </li>
              )}
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
            {/* Aktif Dönem Göstergesi - Sadece tablet/mobil için */}
            {activeEducationYear && (
              <div className="flex items-center lg:hidden absolute left-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5">
                  <div className="flex items-center gap-x-1 sm:gap-x-2">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-blue-700 hidden sm:block">Aktif Dönem</p>
                      <p className="text-xs sm:text-sm font-semibold text-blue-900 truncate">
                        <span className="sm:hidden">Dönem: </span>{activeEducationYear}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-x-2 lg:gap-x-6">
              {/* Quick Portal Links */}
              <div className="flex items-center gap-x-1 md:gap-x-2">
                <Link
                  href="/admin/isletmeler"
                  className="flex items-center gap-x-1 px-1.5 sm:px-2 md:px-3 py-1.5 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                  title="İşletme Yönetimi - Tüm işletmeleri listele, filtrele ve yönet"
                >
                  <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:block text-xs sm:text-sm">İşletmeler</span>
                </Link>

                <Link
                  href="/admin/ogretmenler"
                  className="flex items-center gap-x-1 px-1.5 sm:px-2 md:px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Öğretmen Yönetimi - Tüm öğretmenleri listele, filtrele ve yönet"
                >
                  <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:block text-xs sm:text-sm">Öğretmenler</span>
                </Link>

                <Link
                  href="/admin/ogrenciler"
                  className="flex items-center gap-x-1 px-1.5 sm:px-2 md:px-3 py-1.5 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Öğrenci Yönetimi - Tüm öğrencileri listele, filtrele ve yönet"
                >
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:block text-xs sm:text-sm">Öğrenciler</span>
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
                        {adminRole === 'super_admin' ? 'K. Müd. Yard.' :
                         adminRole === 'admin' ? 'Admin' :
                         adminRole === 'operator' ? 'Admin' : 'Admin'}
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
                            href="/admin/mesajlar"
                            className={classNames(
                              active ? 'bg-purple-50 text-purple-700' : 'text-gray-700',
                              'flex items-center px-4 py-3 text-sm font-medium transition-colors'
                            )}
                          >
                            <MessageCircle className="mr-3 h-5 w-5" />
                            Mesajlaşma Merkezi
                          </Link>
                        )}
                      </MenuDropdown.Item>

                      <div className="my-1 h-px bg-gray-200" />

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
          <div className="px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>}>
              {children}
            </Suspense>
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