"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faEdit, faSave, faTimes, faCamera, faUpload } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from '@/lib/i18n'

export default function ProfilePage() {
  const router = useRouter()
  const { t, lang } = useI18n()
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const [updating, setUpdating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  // Change password state
  const [showPwdForm, setShowPwdForm] = useState(false)
  const [pwdNew, setPwdNew] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMsg, setPwdMsg] = useState('')

  useEffect(() => {
    const id = localStorage.getItem("kr_id")
    const role = localStorage.getItem("user_role")

    console.log('Auth check - ID:', id, 'Role:', role)
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing')

    if (!id || !role) {
      console.log('Missing auth data, redirecting to login')
      localStorage.clear()
      router.replace("/login")
    } else {
      fetchUserProfile(id)
    }
  }, [router])

  const fetchUserProfile = async (userId) => {
    try {
      console.log('Fetching profile for user ID:', userId)
      
      // Try simple query first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (userError) {
        console.error('User query error:', userError)
        throw userError
      }

      console.log('User data:', userData)

      // Try to get role separately
      let roleData = null
      if (userData.user_role_id) {
        const { data: role, error: roleError } = await supabase
          .from('role')
          .select('role_name')
          .eq('role_id', userData.user_role_id)
          .single()

        if (roleError) {
          console.warn('Role query error (will continue without role):', roleError)
        } else {
          roleData = role
        }
      }

      // Combine data
      const combinedData = {
        ...userData,
        role: roleData
      }

      console.log('Combined user data:', combinedData)
      setUserData(combinedData)
      
      setFormData({
        user_nama_depan: combinedData.user_nama_depan || '',
        user_nama_belakang: combinedData.user_nama_belakang || '',
        user_email: combinedData.user_email || '',
        user_phone: combinedData.user_phone || '',
        user_bio: combinedData.user_bio || '',
        user_birth_date: combinedData.user_birth_date || '',
        user_address: combinedData.user_address || '',
        user_profile_picture: combinedData.user_profile_picture || ''
      })
    } catch (error) {
      console.error('Error fetching user profile:', error)
  setError(`${t('profile.validation.fetchFailedPrefix')} ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(t('profile.validation.invalidImageType'))
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('profile.validation.maxFileSize'))
      return
    }

    setUploading(true)
    setError('')

    try {
      const userId = localStorage.getItem("kr_id")
      
      // Create FormData for API upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', userId)

      // Upload via API route (bypasses RLS issues)
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const uploadResult = await uploadResponse.json()

      if (!uploadResponse.ok) {
        throw new Error(uploadResult.error || 'Upload failed')
      }

      // Update form data with new image URL
      setFormData(prev => ({ ...prev, user_profile_picture: uploadResult.publicUrl }))

      // If in edit mode, we'll save it later. If not in edit mode, save immediately
      if (!editing) {
        await supabase
          .from('users')
          .update({ user_profile_picture: uploadResult.publicUrl })
          .eq('user_id', userId)

        // Refresh user data
        await fetchUserProfile(userId)
      }

    } catch (error) {
  console.error('Error uploading file:', error)
  setError(`${t('profile.validation.uploadFailedPrefix')} ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = () => {
    setEditing(true)
    setError('')
  }

  const handleCancel = () => {
    setEditing(false)
    setFormData({
      user_nama_depan: userData.user_nama_depan || '',
      user_nama_belakang: userData.user_nama_belakang || '',
      user_email: userData.user_email || '',
      user_phone: userData.user_phone || '',
      user_bio: userData.user_bio || '',
      user_birth_date: userData.user_birth_date || '',
      user_address: userData.user_address || '',
      user_profile_picture: userData.user_profile_picture || ''
    })
    setError('')
  }

  const handleSave = async () => {
    if (!formData.user_nama_depan || !formData.user_nama_belakang) {
      setError(t('profile.validation.nameRequired'))
      return
    }

    setUpdating(true)
    setError('')

    try {
      const { error } = await supabase
        .from('users')
        .update({
          user_nama_depan: formData.user_nama_depan,
          user_nama_belakang: formData.user_nama_belakang,
          user_email: formData.user_email,
          user_phone: formData.user_phone,
          user_bio: formData.user_bio,
          user_birth_date: formData.user_birth_date || null,
          user_address: formData.user_address,
          user_profile_picture: formData.user_profile_picture
        })
        .eq('user_id', userData.user_id)

      if (error) throw error

      // Refresh user data
      await fetchUserProfile(userData.user_id)
      setEditing(false)
    } catch (error) {
  console.error('Error updating profile:', error)
  setError(t('profile.validation.saveFailed'))
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">{t('profile.loading')}</p>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">{t('profile.loadError')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
    <h1 className="text-3xl font-bold">{t('profile.title')}</h1>
        {!editing && (
          <div className="flex items-center gap-2">
            <Button onClick={handleEdit} className="flex items-center gap-2">
              <FontAwesomeIcon icon={faEdit} />
              {t('profile.edit')}
            </Button>
            <Button onClick={() => { setShowPwdForm((v) => !v); setPwdMsg(''); }} variant="outline" className="flex items-center gap-2">
              <FontAwesomeIcon icon={faSave} />
              Change Password
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Change Password Card */}
        {showPwdForm && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent>
              {pwdMsg && (
                <div className={`mb-3 px-3 py-2 rounded border text-sm ${pwdMsg.startsWith('Success') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {pwdMsg}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="pwdNew">New Password</Label>
                  <Input id="pwdNew" type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="pwdConfirm">Confirm New Password</Label>
                  <Input id="pwdConfirm" type="password" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <Button
                  type="button"
                  onClick={async () => {
                    setPwdMsg('')
                    if (!pwdNew || pwdNew.length < 6) { setPwdMsg('Password must be at least 6 characters'); return }
                    if (pwdNew !== pwdConfirm) { setPwdMsg('Password confirmation does not match'); return }
                    try {
                      setPwdSaving(true)
                      const res = await fetch('/api/profile/change-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ newPassword: pwdNew })
                      })
                      const json = await res.json().catch(() => ({}))
                      if (!res.ok) throw new Error(json.error || 'Request failed')
                      setPwdMsg('Success: Password updated')
                      setPwdNew('')
                      setPwdConfirm('')
                    } catch (e) {
                      console.error('Change password failed:', e)
                      setPwdMsg('Failed to update password: ' + (e.message || 'Unknown error'))
                    } finally {
                      setPwdSaving(false)
                    }
                  }}
                  disabled={pwdSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {pwdSaving ? 'Saving...' : 'Update Password'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowPwdForm(false); setPwdMsg(''); setPwdNew(''); setPwdConfirm(''); }}>
                  Cancel
                </Button>
              </div>
              <p className="mt-2 text-xs text-gray-500">Note: For development only. In production, use server routes and hashing.</p>
            </CardContent>
          </Card>
        )}

        {/* Profile Picture Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCamera} />
              {t('profile.photo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="relative inline-block">
              {formData.user_profile_picture ? (
                <img
                  src={formData.user_profile_picture}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-gray-200"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center mx-auto border-4 border-gray-200">
                  <FontAwesomeIcon icon={faUser} className="text-4xl text-gray-400" />
                </div>
              )}
              
              {uploading && (
                <div className="absolute inset-0 w-32 h-32 rounded-full bg-black bg-opacity-50 flex items-center justify-center mx-auto">
                  <div className="text-white text-sm">{t('profile.uploading')}</div>
                </div>
              )}
            </div>
            
            {/* File Upload */}
            <div className="mt-4">
              <input
                type="file"
                id="profile-picture-upload"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('profile-picture-upload').click()}
                disabled={uploading}
                className="flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faUpload} />
                {uploading ? t('profile.uploading') : t('profile.uploadPhoto')}
              </Button>
            </div>

            {/* URL Input (Alternative) */}
            {editing && (
              <div className="mt-4">
                <Label htmlFor="user_profile_picture">{t('profile.uploadAlternative')}</Label>
                <Input
                  id="user_profile_picture"
                  type="url"
                  placeholder={t('profile.urlPlaceholder')}
                  value={formData.user_profile_picture}
                  onChange={(e) => setFormData(prev => ({ ...prev, user_profile_picture: e.target.value }))}
                  className="mt-2"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Information Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faUser} />
              {t('profile.infoTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nama Depan */}
              <div>
                <Label htmlFor="user_nama_depan">{t('profile.firstName')} *</Label>
                {editing ? (
                  <Input
                    id="user_nama_depan"
                    type="text"
                    value={formData.user_nama_depan}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_nama_depan: e.target.value }))}
                  />
                ) : (
                  <p className="mt-1 p-2 bg-gray-50 rounded border">
                    {userData.user_nama_depan || '-'}
                  </p>
                )}
              </div>

              {/* Nama Belakang */}
              <div>
                <Label htmlFor="user_nama_belakang">{t('profile.lastName')} *</Label>
                {editing ? (
                  <Input
                    id="user_nama_belakang"
                    type="text"
                    value={formData.user_nama_belakang}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_nama_belakang: e.target.value }))}
                  />
                ) : (
                  <p className="mt-1 p-2 bg-gray-50 rounded border">
                    {userData.user_nama_belakang || '-'}
                  </p>
                )}
              </div>

              {/* Username (Read Only) */}
              <div>
                <Label>{t('profile.username')}</Label>
                <p className="mt-1 p-2 bg-gray-100 rounded border text-gray-600">
                  {userData.user_username}
                </p>
              </div>

              {/* Role (Read Only) */}
              <div>
                <Label>{t('profile.role')}</Label>
                <p className="mt-1 p-2 bg-gray-100 rounded border text-gray-600">
                  {userData.role?.role_name || t('profile.noRole')}
                </p>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="user_email">{t('profile.email')}</Label>
                {editing ? (
                  <Input
                    id="user_email"
                    type="email"
                    value={formData.user_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_email: e.target.value }))}
                  />
                ) : (
                  <p className="mt-1 p-2 bg-gray-50 rounded border">
                    {userData.user_email || '-'}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="user_phone">{t('profile.phone')}</Label>
                {editing ? (
                  <Input
                    id="user_phone"
                    type="tel"
                    value={formData.user_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_phone: e.target.value }))}
                  />
                ) : (
                  <p className="mt-1 p-2 bg-gray-50 rounded border">
                    {userData.user_phone || '-'}
                  </p>
                )}
              </div>

              {/* Birth Date */}
              <div>
        <Label htmlFor="user_birth_date">{t('profile.birthDate')}</Label>
                {editing ? (
                  <Input
                    id="user_birth_date"
                    type="date"
                    value={formData.user_birth_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_birth_date: e.target.value }))}
                  />
                ) : (
                  <p className="mt-1 p-2 bg-gray-50 rounded border">
          {userData.user_birth_date ? new Date(userData.user_birth_date).toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'id-ID') : '-'}
                  </p>
                )}
              </div>

              {/* Bio */}
              <div className="md:col-span-2">
        <Label htmlFor="user_bio">{t('profile.bio')}</Label>
                {editing ? (
                  <textarea
                    id="user_bio"
                    rows="3"
                    value={formData.user_bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_bio: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t('profile.bioPlaceholder')}
                  />
                ) : (
                  <p className="mt-1 p-2 bg-gray-50 rounded border min-h-[80px]">
                    {userData.user_bio || '-'}
                  </p>
                )}
              </div>

              {/* Address */}
              <div className="md:col-span-2">
        <Label htmlFor="user_address">{t('profile.address')}</Label>
                {editing ? (
                  <textarea
                    id="user_address"
                    rows="2"
                    value={formData.user_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_address: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t('profile.addressPlaceholder')}
                  />
                ) : (
                  <p className="mt-1 p-2 bg-gray-50 rounded border min-h-[60px]">
                    {userData.user_address || '-'}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {editing && (
              <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updating}
                  className="flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faTimes} />
          {t('profile.cancel')}
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={updating}
                  className="flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faSave} />
          {updating ? t('profile.saving') : t('profile.save')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.accountInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <Label>{t('profile.createdAt')}</Label>
              <p className="mt-1">
                {userData.user_created_at ? new Date(userData.user_created_at).toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'id-ID') : t('profile.notAvailable')}
              </p>
            </div>
            <div>
              <Label>{t('profile.updatedAt')}</Label>
              <p className="mt-1">
                {userData.user_updated_at ? new Date(userData.user_updated_at).toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'id-ID') : t('profile.notAvailable')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
