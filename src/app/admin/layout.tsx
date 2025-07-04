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
  Receipt
} from 'lucide-react'

const menuItems = [
  {
    title: 'Genel Bakış',
    icon: Home,
    href: '/admin',
    description: 'Sistem özeti ve istatistikler'
  },
  {
    title: 'Meslek Alanları',
    icon: Briefcase,
    href: '/admin/alanlar',
    description: 'Alan bazlı öğrenci, öğretmen ve staj yönetimi',
    subItems: [
      {
        title: 'Öğrenci İşlemleri',
        description: 'Alan bazlı öğrenci kayıt ve takibi'
      },
      {
        title: 'Öğretmen Atamaları',
        description: 'Alan öğretmenleri ve koordinatör atama'
      },
      {
        title: 'Staj Takibi',
        description: 'Alan bazlı staj süreç yönetimi'
      }
    ]
  },
  {
    title: 'İşletme Portalı',
    icon: Building,
    href: '/admin/isletmeler',
    description: 'İşletme kayıt ve staj yönetimi',
    subItems: [
      {
        title: 'İşletme Kaydı',
        description: 'Yeni işletme ekleme ve düzenleme'
      },
      {
        title: 'Stajyer Yönetimi',
        description: 'İşletme bazlı stajyer işlemleri'
      },
      {
        title: 'Koordinatör Eşleştirme',
        description: 'İşletme-öğretmen eşleştirmeleri'
      }
    ]
  },
  {
    title: 'Öğretmen Portalı',
    icon: GraduationCap,
    href: '/admin/ogretmenler',
    description: 'Öğretmen yetkilendirme ve görev takibi',
    subItems: [
      {
        title: 'Öğretmen Kaydı',
        description: 'Yeni öğretmen ekleme ve düzenleme'
      },
      {
        title: 'Koordinatörlük İşlemleri',
        description: 'Koordinatör atama ve takip'
      },
      {
        title: 'Staj Denetimi',
        description: 'Öğrenci staj takip ve onay'
      }
    ]
  },
  {
    title: 'Dekont Merkezi',
    icon: Receipt,
    href: '/admin/dekontlar',
    description: 'Staj ücret ve dekont yönetimi',
    subItems: [
      {
        title: 'Dekont Girişi',
        description: 'Yeni dekont ekleme'
      },
      {
        title: 'Ödeme Takibi',
        description: 'Ödemeler ve vadeler'
      },
      {
        title: 'Raporlama',
        description: 'Dekont ve ödeme raporları'
      }
    ]
  },
  {
    title: 'Sistem Ayarları',
    icon: Settings,
    href: '/admin/ayarlar',
    description: 'Genel sistem yapılandırması',
    subItems: [
      {
        title: 'Eğitim Yılı',
        description: 'Aktif dönem yönetimi'
      },
      {
        title: 'Kullanıcı Yetkileri',
        description: 'Yetki ve rol tanımları'
      },
      {
        title: 'Sistem Parametreleri',
        description: 'Genel ayarlar ve limitler'
      }
    ]
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
  const [isAuth, setIsAuth] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
  
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

  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin-auth')
    if (authStatus === 'true') {
      setIsAuth(true)
    } else {
      if (pathname !== '/admin/login') {
        router.push('/admin/login')
      }
    }
  }, [pathname, router])
  
  const handleLogout = () => {
    sessionStorage.removeItem('admin-auth');
    router.push('/admin/login');
  }

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (!isAuth) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
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
                              
                              {item.subItems && pathname.startsWith(item.href) && (
                                <div className="ml-8 pl-3 border-l-2 border-indigo-100 space-y-1">
                                  {item.subItems.map((subItem) => (
                                    <div key={subItem.title} className="py-1">
                                      <div className="text-sm font-medium text-gray-900">{subItem.title}</div>
                                      <div className="text-xs text-gray-500">{subItem.description}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
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
                      
                      {desktopSidebarOpen && item.subItems && pathname.startsWith(item.href) && (
                        <div className="ml-8 pl-3 border-l-2 border-indigo-100 space-y-1">
                          {item.subItems.map((subItem) => (
                            <div key={subItem.title} className="py-1">
                              <div className="text-sm font-medium text-gray-900">{subItem.title}</div>
                              <div className="text-xs text-gray-500">{subItem.description}</div>
                            </div>
                          ))}
                        </div>
                      )}
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
              <button
                type="button"
                onClick={handleLogout}
                className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Çıkış Yap</span>
                <LogOut className="h-6 w-6" aria-hidden="true" />
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
    </div>
  )
} 