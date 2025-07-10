'use client'

import { useState, useEffect } from 'react'
import { User, Plus, Edit, Trash2, Shield, Crown, Settings, AlertTriangle, Save, X, Check, Mail, Key, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AdminUser, CreateAdminUser, UpdateAdminUser, YetkiSeviyeleri } from '@/types/admin'
import { Button } from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface AdminManagementProps {
  currentUserRole?: string
}

export function AdminManagement({ currentUserRole }: AdminManagementProps) {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

  // Form states
  const [newUser, setNewUser] = useState<CreateAdminUser>({
    ad: '',
    soyad: '',
    email: '',
    yetki_seviyesi: 'operator'
  })
  
  const [newPassword, setNewPassword] = useState('')
  const [useCustomPassword, setUseCustomPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [editUser, setEditUser] = useState<UpdateAdminUser>({
    ad: '',
    soyad: '',
    yetki_seviyesi: 'operator',
    aktif: true
  })

  const [passwordUpdate, setPasswordUpdate] = useState('')
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false)

  useEffect(() => {
    fetchAdminUsers()
  }, [])

  const fetchAdminUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_admin_users')
      
      if (error) {
        console.error('Admin kullanıcılar çekilirken hata:', error)
        return
      }

      setAdminUsers(data || [])
    } catch (error) {
      console.error('Admin kullanıcılar çekilirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async () => {
    if (!newUser.ad.trim() || !newUser.soyad.trim() || !newUser.email.trim()) {
      alert('Lütfen tüm alanları doldurun')
      return
    }

    setFormLoading(true)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          ...newUser,
          password: useCustomPassword ? newPassword : undefined
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Kullanıcı eklenemedi')
      }

      alert(result.message)
      
      // Reset form
      setNewUser({
        ad: '',
        soyad: '',
        email: '',
        yetki_seviyesi: 'operator'
      })
      setNewPassword('')
      setUseCustomPassword(false)
      setShowAddModal(false)
      
      // Refresh list
      await fetchAdminUsers()

    } catch (error: any) {
      console.error('Kullanıcı ekleme hatası:', error)
      alert(error.message || 'Kullanıcı eklenirken bir hata oluştu')
    } finally {
      setFormLoading(false)
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser || !editUser.ad.trim() || !editUser.soyad.trim()) {
      alert('Lütfen tüm alanları doldurun')
      return
    }

    setFormLoading(true)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          ...editUser,
          password: passwordUpdate || undefined
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Kullanıcı güncellenemedi')
      }

      alert(result.message)
      
      // Reset form
      setPasswordUpdate('')
      setShowEditModal(false)
      setSelectedUser(null)
      
      // Refresh list
      await fetchAdminUsers()

    } catch (error: any) {
      console.error('Kullanıcı güncelleme hatası:', error)
      alert(error.message || 'Kullanıcı güncellenirken bir hata oluştu')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    setFormLoading(true)

    try {
      const { data, error } = await supabase.rpc('delete_admin_user', {
        p_user_id: selectedUser.id
      })

      if (error) {
        throw new Error(error.message)
      }

      if (data.success) {
        alert(data.message)
        setShowDeleteModal(false)
        setSelectedUser(null)
        await fetchAdminUsers()
      } else {
        throw new Error(data.error)
      }

    } catch (error: any) {
      console.error('Kullanıcı silme hatası:', error)
      alert(error.message || 'Kullanıcı silinirken bir hata oluştu')
    } finally {
      setFormLoading(false)
    }
  }

  const openEditModal = (user: AdminUser) => {
    setSelectedUser(user)
    setEditUser({
      ad: user.ad,
      soyad: user.soyad,
      yetki_seviyesi: user.yetki_seviyesi,
      aktif: user.aktif
    })
    setPasswordUpdate('')
    setShowEditModal(true)
  }

  const openDeleteModal = (user: AdminUser) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const openPasswordModal = (user: AdminUser) => {
    setSelectedUser(user)
    setPasswordUpdate('')
    setShowPasswordModal(true)
  }

  if (currentUserRole !== 'super_admin') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-yellow-800">Erişim Kısıtlı</h3>
            <p className="text-yellow-700 mt-1">
              Admin kullanıcı yönetimi sadece süper admin yetki seviyesindeki kullanıcılar tarafından kullanılabilir.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-indigo-600 mr-3" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Admin Kullanıcı Yönetimi</h2>
            <p className="text-sm text-gray-600">Sistem yöneticilerini ekleyin, düzenleyin ve yetkilendirin</p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Yeni Admin Ekle
        </Button>
      </div>

      {/* Admin Users List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Admin kullanıcıları yükleniyor...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Kayıtlı Admin Kullanıcılar ({adminUsers.length})</h3>
          </div>
          
          {adminUsers.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Henüz admin kullanıcı bulunmuyor</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {adminUsers.map((user) => (
                <div key={user.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                      user.yetki_seviyesi === 'super_admin' ? 'bg-red-100' :
                      user.yetki_seviyesi === 'admin' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {user.yetki_seviyesi === 'super_admin' ? (
                        <Crown className={`h-5 w-5 ${
                          user.yetki_seviyesi === 'super_admin' ? 'text-red-600' : 'text-gray-600'
                        }`} />
                      ) : (
                        <User className={`h-5 w-5 ${
                          user.yetki_seviyesi === 'admin' ? 'text-blue-600' : 'text-green-600'
                        }`} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center">
                        <h4 className="text-sm font-medium text-gray-900">{user.ad} {user.soyad}</h4>
                        {!user.aktif && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Pasif
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <div className="flex items-center mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          YetkiSeviyeleri[user.yetki_seviyesi].color
                        }`}>
                          {YetkiSeviyeleri[user.yetki_seviyesi].label}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {new Date(user.created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openPasswordModal(user)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Şifre Değiştir"
                    >
                      <Key className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Düzenle"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {user.yetki_seviyesi !== 'super_admin' && (
                      <button
                        onClick={() => openDeleteModal(user)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {user.yetki_seviyesi === 'super_admin' && (
                      <div className="p-2 text-gray-300" title="Süper admin silinemez">
                        <Shield className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Admin Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Yeni Admin Kullanıcı Ekle"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ad</label>
              <input
                type="text"
                value={newUser.ad}
                onChange={(e) => setNewUser({...newUser, ad: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Admin adı"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Soyad</label>
              <input
                type="text"
                value={newUser.soyad}
                onChange={(e) => setNewUser({...newUser, soyad: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Admin soyadı"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">E-posta Adresi</label>
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="admin@okul.edu.tr"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Yetki Seviyesi</label>
            <select
              value={newUser.yetki_seviyesi}
              onChange={(e) => setNewUser({...newUser, yetki_seviyesi: e.target.value as any})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {Object.entries(YetkiSeviyeleri)
                .filter(([key]) => key !== 'super_admin') // Süper admin seçeneğini gizle
                .map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label} - {value.description}
                  </option>
                ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Güvenlik nedeniyle süper admin yetki seviyesi sadece mevcut süper admin tarafından değiştirilebilir.
            </p>
          </div>

          {/* Password Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Şifre Ayarlama</label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useCustomPassword}
                  onChange={(e) => setUseCustomPassword(e.target.checked)}
                  className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-600">Özel şifre ata</span>
              </label>
            </div>
            
            {useCustomPassword ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Şifre</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Minimum 8 karakter"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Kullanıcı bu şifre ile sisteme giriş yapabilir.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Otomatik Hesap Oluşturma:</p>
                    <p>Kullanıcı eklendikten sonra belirtilen email adresine davet maili gönderilecek. Kullanıcı bu emaildeki linke tıklayarak şifresini belirleyip hesabını aktive edebilir.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={formLoading}
            >
              İptal
            </button>
            <button
              onClick={handleAddUser}
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formLoading ? 'Ekleniyor...' : 'Admin Ekle'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Admin Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`${selectedUser?.ad} ${selectedUser?.soyad} - Düzenle`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ad</label>
              <input
                type="text"
                value={editUser.ad}
                onChange={(e) => setEditUser({...editUser, ad: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Soyad</label>
              <input
                type="text"
                value={editUser.soyad}
                onChange={(e) => setEditUser({...editUser, soyad: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Yetki Seviyesi</label>
            <select
              value={editUser.yetki_seviyesi}
              onChange={(e) => setEditUser({...editUser, yetki_seviyesi: e.target.value as any})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={selectedUser?.yetki_seviyesi === 'super_admin'}
            >
              {Object.entries(YetkiSeviyeleri)
                .filter(([key]) => {
                  // Süper admin düzenlenmiyorsa süper admin seçeneğini gizle
                  if (selectedUser?.yetki_seviyesi !== 'super_admin' && key === 'super_admin') {
                    return false;
                  }
                  return true;
                })
                .map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label} - {value.description}
                  </option>
                ))}
            </select>
            {selectedUser?.yetki_seviyesi === 'super_admin' && (
              <p className="text-xs text-red-500 mt-1">
                Süper admin yetki seviyesi değiştirilemez. Güvenlik koruması aktif.
              </p>
            )}
          </div>

          {/* Password Update Section */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Yeni Şifre (İsteğe Bağlı)</label>
            <div className="relative">
              <input
                type={showPasswordUpdate ? "text" : "password"}
                value={passwordUpdate}
                onChange={(e) => setPasswordUpdate(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Yeni şifre (boş bırakılırsa değişmez)"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPasswordUpdate(!showPasswordUpdate)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswordUpdate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Şifre alanını boş bırakırsanız mevcut şifre değişmez.
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Aktif Durum</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editUser.aktif}
                onChange={(e) => setEditUser({...editUser, aktif: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={formLoading}
            >
              İptal
            </button>
            <button
              onClick={handleEditUser}
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formLoading ? 'Güncelleniyor...' : 'Güncelle'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={`${selectedUser?.ad} ${selectedUser?.soyad} - Şifre Değiştir`}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Key className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Şifre Değiştirme</p>
                <p>Bu kullanıcı için yeni bir şifre belirleyin. Kullanıcı yeni şifre ile sisteme giriş yapabilir.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Yeni Şifre</label>
            <div className="relative">
              <input
                type={showPasswordUpdate ? "text" : "password"}
                value={passwordUpdate}
                onChange={(e) => setPasswordUpdate(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Minimum 8 karakter"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPasswordUpdate(!showPasswordUpdate)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswordUpdate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Güvenli bir şifre seçin (minimum 8 karakter).
            </p>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={formLoading}
            >
              İptal
            </button>
            <button
              onClick={async () => {
                if (!passwordUpdate.trim()) {
                  alert('Lütfen bir şifre girin')
                  return
                }
                
                setFormLoading(true)
                try {
                  const response = await fetch('/api/admin/users', {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                    },
                    body: JSON.stringify({
                      userId: selectedUser?.id,
                      password: passwordUpdate
                    })
                  })

                  const result = await response.json()

                  if (!response.ok) {
                    throw new Error(result.error || 'Şifre güncellenemedi')
                  }

                  alert(result.message)
                  setPasswordUpdate('')
                  setShowPasswordModal(false)
                  
                } catch (error: any) {
                  alert(error.message || 'Şifre güncellenirken bir hata oluştu')
                } finally {
                  setFormLoading(false)
                }
              }}
              disabled={formLoading || !passwordUpdate.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteUser}
        title="Admin Kullanıcıyı Sil"
        description={
          selectedUser
            ? `"${selectedUser.ad} ${selectedUser.soyad}" adlı admin kullanıcıyı silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz ve kullanıcının tüm erişim yetkileri iptal edilir.`
            : ""
        }
        confirmText="Sil"
        isLoading={formLoading}
      />
    </div>
  )
}