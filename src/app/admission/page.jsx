'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import NotificationModal from '@/components/ui/notification-modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faUserPlus, 
  faArrowLeft,
  faSpinner,
  faCheckCircle,
  faUser,
  faUsers,
  faSchool,
  faCalendar,
  faNoteSticky,
  faCamera,
  faIdCard
} from '@fortawesome/free-solid-svg-icons'
import { getCityList, getProvinceByCity } from '@/lib/cityProvinceData'

// Animated background orbs component - iOS style
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-300/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-3/4 -right-20 w-80 h-80 bg-teal-300/15 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute -top-20 right-1/4 w-72 h-72 bg-green-300/15 rounded-full blur-3xl animate-pulse delay-500" />
    </div>
  )
}

export default function AdmissionPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: Student Info, 2: Parent Info, 3: School Selection
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [units, setUnits] = useState([])
  const [levels, setLevels] = useState([])
  const [years, setYears] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [applicationNumber, setApplicationNumber] = useState('')
  
  const [citySearch, setCitySearch] = useState('')
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const allCities = getCityList()
  
  const [formData, setFormData] = useState({
    // Student data
    student_name: '',
    student_nickname: '',
    student_gender: '',
    student_birth_date: '',
    student_birth_place: '',
    student_religion: '',
    student_nationality: 'WNI',
    student_address: '',
    student_domicile_address: '',
    student_city: '',
    student_province: '',
    student_postal_code: '',
    student_previous_school: '',
    // Parent data
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    parent_occupation: '',
    parent_address: '',
    // School selection
    level_id: '',
    year_id: '',
    additional_notes: ''
  })
  
  const [formErrors, setFormErrors] = useState({})
  const [ktpScanning, setKtpScanning] = useState(false)
  const [ktpScanCount, setKtpScanCount] = useState(0)
  const KTP_SCAN_LIMIT = 3 // max 3 scans per session
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  })

  // Fetch units and years on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch school units only (is_school = true)
        const { data: unitsData, error: unitsError } = await supabase
          .from('unit')
          .select('unit_id, unit_name')
          .eq('is_school', true)
          .order('unit_name')

        if (unitsError) throw unitsError
        setUnits(unitsData || [])

        // Fetch admission levels
        const { data: levelsData } = await supabase
          .from('admission_level')
          .select('level_id, level_name, level_order, unit_id, unit:unit_id(unit_id, unit_name)')
          .eq('is_active', true)
          .order('level_order')
        setLevels(levelsData || [])

        // Fetch academic years
        const { data: yearsData, error: yearsError } = await supabase
          .from('year')
          .select('year_id, year_name')
          .order('year_name', { ascending: false })

        if (yearsError) throw yearsError
        setYears(yearsData || [])

      } catch (err) {
        console.error('Error fetching data:', err)
        showNotification('Error', 'Gagal memuat data. Silakan refresh halaman.', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const showNotification = (title, message, type = 'success') => {
    setNotification({ isOpen: true, title, message, type })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleCitySelect = (city) => {
    const province = getProvinceByCity(city)
    setFormData(prev => ({ ...prev, student_city: city, student_province: province }))
    setCitySearch(city)
    setShowCityDropdown(false)
    if (formErrors.student_city) {
      setFormErrors(prev => ({ ...prev, student_city: '' }))
    }
  }

  const filteredCities = citySearch.length >= 1
    ? allCities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase())).slice(0, 10)
    : []

  // KTP OCR handler
  const handleKtpScan = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (ktpScanCount >= KTP_SCAN_LIMIT) {
      showNotification('Batas Tercapai', 'Maksimal 3x scan KTP per sesi. Silakan isi manual.', 'error')
      return
    }

    // Validate file
    if (!file.type.startsWith('image/')) {
      showNotification('Error', 'File harus berupa gambar', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification('Error', 'Ukuran file maksimal 5MB', 'error')
      return
    }

    setKtpScanning(true)
    try {
      // Compress & convert to base64
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          const img = new window.Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            const maxW = 1200
            const scale = Math.min(1, maxW / img.width)
            canvas.width = img.width * scale
            canvas.height = img.height * scale
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            resolve(canvas.toDataURL('image/jpeg', 0.8))
          }
          img.src = reader.result
        }
        reader.readAsDataURL(file)
      })

      // Extract base64 data part only
      const base64Data = base64.split(',')[1]

      const res = await fetch('/api/ocr/ktp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data })
      })

      const result = await res.json()

      if (!result.success) {
        showNotification('Gagal', result.message || 'Gagal membaca KTP', 'error')
        return
      }

      setKtpScanCount(prev => prev + 1)
      const d = result.data

      // Auto-fill parent fields
      setFormData(prev => ({
        ...prev,
        parent_name: d.nama || prev.parent_name,
        parent_address: d.alamat || prev.parent_address,
        parent_occupation: d.pekerjaan || prev.parent_occupation,
      }))

      const filledFields = [
        d.nama && 'Nama',
        d.alamat && 'Alamat',
        d.pekerjaan && 'Pekerjaan'
      ].filter(Boolean)

      showNotification(
        'KTP Berhasil Dibaca',
        filledFields.length > 0
          ? `Data terisi: ${filledFields.join(', ')}. Silakan periksa dan koreksi jika perlu.`
          : 'Tidak ada data yang berhasil dibaca. Silakan isi manual.',
        filledFields.length > 0 ? 'success' : 'error'
      )
    } catch (err) {
      console.error('KTP scan error:', err)
      showNotification('Error', 'Gagal memproses KTP: ' + err.message, 'error')
    } finally {
      setKtpScanning(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const validateStep = (stepNumber) => {
    const errors = {}

    if (stepNumber === 1) {
      if (!formData.student_name.trim()) {
        errors.student_name = 'Nama lengkap wajib diisi'
      }
      if (!formData.student_gender) {
        errors.student_gender = 'Jenis kelamin wajib dipilih'
      }
      if (!formData.student_birth_date) {
        errors.student_birth_date = 'Tanggal lahir wajib diisi'
      }
      if (!formData.student_religion) {
        errors.student_religion = 'Agama wajib dipilih'
      }
      if (!formData.student_nationality) {
        errors.student_nationality = 'Kewarganegaraan wajib dipilih'
      }
      if (!formData.student_city.trim()) {
        errors.student_city = 'Kota wajib diisi'
      }
    } else if (stepNumber === 2) {
      if (!formData.parent_name.trim()) {
        errors.parent_name = 'Nama orang tua/wali wajib diisi'
      }
      if (!formData.parent_phone.trim()) {
        errors.parent_phone = 'Nomor telepon wajib diisi'
      }
    } else if (stepNumber === 3) {
      if (!formData.level_id) {
        errors.level_id = 'Pilih jenjang yang dituju'
      }
      if (!formData.year_id) {
        errors.year_id = 'Pilih tahun ajaran'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateStep(3)) return

    setSubmitting(true)
    try {
      // Prepare data for insert
      const insertData = {
        student_name: formData.student_name.trim(),
        student_nickname: formData.student_nickname.trim() || null,
        student_gender: formData.student_gender || null,
        student_birth_date: formData.student_birth_date || null,
        student_birth_place: formData.student_birth_place.trim() || null,
        student_religion: formData.student_religion || null,
        student_nationality: formData.student_nationality || 'WNI',
        student_address: formData.student_address.trim() || null,
        student_domicile_address: formData.student_domicile_address.trim() || null,
        student_city: formData.student_city.trim() || null,
        student_province: formData.student_province.trim() || null,
        student_postal_code: formData.student_postal_code.trim() || null,
        student_previous_school: formData.student_previous_school.trim() || null,
        parent_name: formData.parent_name.trim(),
        parent_phone: formData.parent_phone.trim(),
        parent_email: formData.parent_email.trim() || null,
        parent_occupation: formData.parent_occupation.trim() || null,
        parent_address: formData.parent_address.trim() || null,
        unit_id: levels.find(l => l.level_id === parseInt(formData.level_id))?.unit_id || null,
        level_id: parseInt(formData.level_id),
        year_id: parseInt(formData.year_id),
        additional_notes: formData.additional_notes.trim() || null,
        status: 'pending'
      }

      const { data, error } = await supabase
        .from('student_applications')
        .insert([insertData])
        .select('application_number')
        .single()

      if (error) throw error

      setApplicationNumber(data.application_number)
      setSubmitted(true)

      // Send WhatsApp notification to parent (non-blocking)
      const selectedLevel = levels.find(l => l.level_id === parseInt(formData.level_id))
      try {
        await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'admissionReceived',
            parentName: formData.parent_name.trim(),
            studentName: formData.student_name.trim(),
            applicationNumber: data.application_number,
            schoolName: selectedLevel?.level_name || '',
            phone: formData.parent_phone.trim()
          })
        })
      } catch (waErr) {
        // Don't block submission if WA fails
        console.warn('WhatsApp notification failed:', waErr)
      }

      // Send email notification if parent provided email (non-blocking)
      const parentEmail = formData.parent_email?.trim()
      if (parentEmail) {
        try {
          await fetch('/api/email/admission', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'admissionReceived',
              parentName: formData.parent_name.trim(),
              studentName: formData.student_name.trim(),
              applicationNumber: data.application_number,
              schoolName: selectedLevel?.level_name || '',
              email: parentEmail
            })
          })
        } catch (emailErr) {
          console.warn('Email notification failed:', emailErr)
        }
      }

    } catch (err) {
      console.error('Error submitting application:', err)
      showNotification('Error', 'Gagal mengirim pendaftaran: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Success screen after submission
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/30 px-4 relative overflow-hidden">
        <FloatingOrbs />
        
        <div className="w-full max-w-lg relative z-10">
          <div className="absolute -inset-2 bg-gradient-to-br from-emerald-100/50 to-teal-100/50 rounded-[2.5rem] blur-xl" />
          
          <div className="relative backdrop-blur-2xl bg-white/70 border border-white/40 rounded-[2.5rem] shadow-2xl overflow-hidden p-8 text-center">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            
            <div className="w-20 h-20 mx-auto mb-6 bg-emerald-50 rounded-full flex items-center justify-center ring-1 ring-emerald-100">
              <FontAwesomeIcon icon={faCheckCircle} className="text-4xl text-emerald-500" />
            </div>
            
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Pendaftaran Berhasil!</h1>
            <p className="text-gray-500 mb-6">Terima kasih telah mendaftar. Simpan nomor pendaftaran Anda:</p>
            
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">Nomor Pendaftaran</p>
              <p className="text-2xl font-bold text-emerald-600 font-mono">{applicationNumber}</p>
            </div>
            
            <p className="text-gray-400 text-sm mb-6">
              Gunakan nomor ini untuk mengecek status pendaftaran Anda. 
              Tim kami akan menghubungi Anda melalui nomor telepon yang terdaftar.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/admission/status" className="flex-1">
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl h-11 shadow-lg">
                  Cek Status Pendaftaran
                </Button>
              </Link>
              <Link href="/login" className="flex-1">
                <Button variant="outline" className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl h-11">
                  Kembali ke Login
                </Button>
              </Link>
            </div>
            
            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/30 px-4 py-8 relative overflow-y-auto" style={{ minHeight: '100vh', height: 'auto' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <FloatingOrbs />
      </div>
      
      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
      
      <div className="max-w-2xl mx-auto relative z-10">
        {/* Back to Login */}
        <Link href="/login" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-700 mb-6 transition-colors">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Kembali ke Login</span>
        </Link>
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-br from-emerald-100/50 to-teal-100/50 rounded-3xl blur-xl" />
              <div className="relative bg-white rounded-3xl p-5 shadow-lg ring-1 ring-black/5">
                <Image
                  src="/images/login-logo.png"
                  alt="School Logo"
                  width={120}
                  height={60}
                  style={{ width: 'auto', height: 'auto' }}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1 tracking-tight">Pendaftaran Siswa Baru</h1>
          <p className="text-sm text-gray-500 font-normal">Lengkapi formulir di bawah ini untuk mendaftar</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                s === step 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                  : s < step 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-gray-100 text-gray-400'
              }`}>
                {s < step ? '✓' : s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-1 mx-1 rounded ${
                  s < step ? 'bg-emerald-400' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex justify-between text-xs text-gray-400 mb-6 px-4">
          <span className={step === 1 ? 'text-emerald-600 font-medium' : ''}>Data Siswa</span>
          <span className={step === 2 ? 'text-emerald-600 font-medium' : ''}>Data Orang Tua</span>
          <span className={step === 3 ? 'text-emerald-600 font-medium' : ''}>Pilihan Sekolah</span>
        </div>

        {/* Form Card */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-br from-emerald-100/50 to-teal-100/50 rounded-[2.5rem] blur-xl" />
          
          <Card className="relative backdrop-blur-2xl bg-white/70 border border-white/40 rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            
            <CardHeader className="border-b border-gray-100/50">
              <CardTitle className="text-gray-900 flex items-center gap-3">
                <FontAwesomeIcon 
                  icon={step === 1 ? faUser : step === 2 ? faUsers : faSchool} 
                  className="text-emerald-500"
                />
                {step === 1 && 'Data Calon Siswa'}
                {step === 2 && 'Data Orang Tua / Wali'}
                {step === 3 && 'Pilihan Sekolah & Tahun Ajaran'}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <FontAwesomeIcon icon={faSpinner} className="text-3xl text-emerald-500 animate-spin" />
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Step 1: Student Data */}
                  {step === 1 && (
                    <div className="space-y-6">
                      {/* Required Fields */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-5 w-1 bg-emerald-500 rounded-full" />
                          <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Wajib Diisi</span>
                        </div>

                        <div>
                          <Label htmlFor="student_name" className="text-gray-700">Nama Lengkap <span className="text-red-500">*</span></Label>
                          <Input
                            id="student_name"
                            name="student_name"
                            value={formData.student_name}
                            onChange={handleInputChange}
                            placeholder="Masukkan nama lengkap siswa"
                            className={`mt-1 bg-white/60 border-gray-200 text-gray-900 placeholder:text-gray-400 ${
                              formErrors.student_name ? 'border-red-500' : ''
                            }`}
                          />
                          {formErrors.student_name && (
                            <p className="text-red-500 text-sm mt-1">{formErrors.student_name}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="student_gender" className="text-gray-700">Jenis Kelamin <span className="text-red-500">*</span></Label>
                            <select
                              id="student_gender"
                              name="student_gender"
                              value={formData.student_gender}
                              onChange={handleInputChange}
                              className={`mt-1 w-full px-3 py-2 bg-white/60 border rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                formErrors.student_gender ? 'border-red-500' : 'border-gray-200'
                              }`}
                            >
                              <option value="">Pilih jenis kelamin</option>
                              <option value="male">Laki-laki</option>
                              <option value="female">Perempuan</option>
                            </select>
                            {formErrors.student_gender && (
                              <p className="text-red-500 text-sm mt-1">{formErrors.student_gender}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="student_birth_date" className="text-gray-700">Tanggal Lahir <span className="text-red-500">*</span></Label>
                            <Input
                              id="student_birth_date"
                              name="student_birth_date"
                              type="date"
                              value={formData.student_birth_date}
                              onChange={handleInputChange}
                              className={`mt-1 bg-white/60 border-gray-200 text-gray-900 ${
                                formErrors.student_birth_date ? 'border-red-500' : ''
                              }`}
                            />
                            {formErrors.student_birth_date && (
                              <p className="text-red-500 text-sm mt-1">{formErrors.student_birth_date}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="student_religion" className="text-gray-700">Agama <span className="text-red-500">*</span></Label>
                            <select
                              id="student_religion"
                              name="student_religion"
                              value={formData.student_religion}
                              onChange={handleInputChange}
                              className={`mt-1 w-full px-3 py-2 bg-white/60 border rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                formErrors.student_religion ? 'border-red-500' : 'border-gray-200'
                              }`}
                            >
                              <option value="">Pilih agama</option>
                              <option value="Islam">Islam</option>
                              <option value="Kristen">Kristen</option>
                              <option value="Katolik">Katolik</option>
                              <option value="Hindu">Hindu</option>
                              <option value="Buddha">Buddha</option>
                              <option value="Konghucu">Konghucu</option>
                              <option value="Lainnya">Lainnya</option>
                            </select>
                            {formErrors.student_religion && (
                              <p className="text-red-500 text-sm mt-1">{formErrors.student_religion}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="student_nationality" className="text-gray-700">Kewarganegaraan <span className="text-red-500">*</span></Label>
                            <select
                              id="student_nationality"
                              name="student_nationality"
                              value={formData.student_nationality}
                              onChange={handleInputChange}
                              className={`mt-1 w-full px-3 py-2 bg-white/60 border rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                formErrors.student_nationality ? 'border-red-500' : 'border-gray-200'
                              }`}
                            >
                              <option value="WNI">WNI (Warga Negara Indonesia)</option>
                              <option value="WNA">WNA (Warga Negara Asing)</option>
                            </select>
                            {formErrors.student_nationality && (
                              <p className="text-red-500 text-sm mt-1">{formErrors.student_nationality}</p>
                            )}
                          </div>
                        </div>

                        {/* City with auto-fill province */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="relative">
                            <Label htmlFor="student_city" className="text-gray-700">Kota <span className="text-red-500">*</span></Label>
                            <Input
                              id="student_city"
                              autoComplete="off"
                              value={citySearch}
                              onChange={(e) => {
                                setCitySearch(e.target.value)
                                setShowCityDropdown(true)
                                // If manually typed and matches a city, auto-fill
                                const match = allCities.find(c => c.toLowerCase() === e.target.value.toLowerCase())
                                if (match) {
                                  handleCitySelect(match)
                                } else {
                                  setFormData(prev => ({ ...prev, student_city: e.target.value, student_province: '' }))
                                }
                              }}
                              onFocus={() => citySearch.length >= 1 && setShowCityDropdown(true)}
                              onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                              placeholder="Ketik nama kota..."
                              className={`mt-1 bg-white/60 border-gray-200 text-gray-900 placeholder:text-gray-400 ${
                                formErrors.student_city ? 'border-red-500' : ''
                              }`}
                            />
                            {showCityDropdown && filteredCities.length > 0 && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                {filteredCities.map(city => (
                                  <button
                                    key={city}
                                    type="button"
                                    onMouseDown={() => handleCitySelect(city)}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-emerald-50 transition-colors"
                                  >
                                    <span>{city}</span>
                                    <span className="text-gray-400 ml-2 text-xs">({getProvinceByCity(city)})</span>
                                  </button>
                                ))}
                              </div>
                            )}
                            {formErrors.student_city && (
                              <p className="text-red-500 text-sm mt-1">{formErrors.student_city}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="student_province" className="text-gray-700">Provinsi</Label>
                            <Input
                              id="student_province"
                              name="student_province"
                              value={formData.student_province}
                              readOnly
                              placeholder="Otomatis terisi dari kota"
                              className="mt-1 bg-gray-100 border-gray-200 text-emerald-600 placeholder:text-gray-300 cursor-not-allowed"
                            />
                            {formData.student_province && (
                              <p className="text-emerald-600 text-xs mt-1">✓ Otomatis dari kota</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-300">OPSIONAL</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>

                      {/* Optional Fields */}
                      <div className="space-y-4 bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-5 w-1 bg-gray-300 rounded-full" />
                          <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Informasi Tambahan</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="student_nickname" className="text-gray-700">Nama Panggilan</Label>
                            <Input
                              id="student_nickname"
                              name="student_nickname"
                              value={formData.student_nickname}
                              onChange={handleInputChange}
                              placeholder="Nama panggilan"
                              className="mt-1 bg-white/60 border-gray-200 text-gray-900 placeholder:text-gray-400"
                            />
                          </div>

                          <div>
                            <Label htmlFor="student_birth_place" className="text-gray-700">Tempat Lahir</Label>
                            <Input
                              id="student_birth_place"
                              name="student_birth_place"
                              value={formData.student_birth_place}
                              onChange={handleInputChange}
                              placeholder="Kota tempat lahir"
                              className="mt-1 bg-white/60 border-gray-200 text-gray-900 placeholder:text-gray-400"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="student_address" className="text-gray-700">Alamat KTP</Label>
                          <textarea
                            id="student_address"
                            name="student_address"
                            value={formData.student_address}
                            onChange={handleInputChange}
                            placeholder="Alamat sesuai KTP/KK"
                            rows={2}
                            className="mt-1 w-full px-3 py-2 bg-white/60 border border-gray-200 rounded-md text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <Label htmlFor="student_domicile_address" className="text-gray-700">Alamat Domisili</Label>
                          <textarea
                            id="student_domicile_address"
                            name="student_domicile_address"
                            value={formData.student_domicile_address}
                            onChange={handleInputChange}
                            placeholder="Isi jika berbeda dengan alamat KTP"
                            rows={2}
                            className="mt-1 w-full px-3 py-2 bg-white/60 border border-gray-200 rounded-md text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <Label htmlFor="student_postal_code" className="text-gray-700">Kode Pos</Label>
                          <Input
                            id="student_postal_code"
                            name="student_postal_code"
                            value={formData.student_postal_code}
                            onChange={handleInputChange}
                            placeholder="Contoh: 60294"
                            maxLength={5}
                            className="mt-1 bg-white/60 border-gray-200 text-gray-900 placeholder:text-gray-400 w-32"
                          />
                        </div>

                        <div>
                          <Label htmlFor="student_previous_school" className="text-gray-700">Asal Sekolah Sebelumnya</Label>
                          <Input
                            id="student_previous_school"
                            name="student_previous_school"
                            value={formData.student_previous_school}
                            onChange={handleInputChange}
                            placeholder="Nama sekolah sebelumnya (jika ada)"
                            className="mt-1 bg-white/60 border-gray-200 text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Parent Data */}
                  {step === 2 && (
                    <div className="space-y-6">
                      {/* KTP Scan Button */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">
                              <FontAwesomeIcon icon={faIdCard} className="text-blue-500 mr-2" />
                              Scan KTP Orang Tua
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Foto/upload KTP untuk mengisi otomatis nama, alamat, dan pekerjaan
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {ktpScanCount > 0 && (
                              <span className="text-xs text-gray-400">{ktpScanCount}/{KTP_SCAN_LIMIT}</span>
                            )}
                            <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 ${
                              ktpScanning || ktpScanCount >= KTP_SCAN_LIMIT
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl active:scale-95'
                            }`}>
                              {ktpScanning ? (
                                <>
                                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                  Membaca...
                                </>
                              ) : (
                                <>
                                  <FontAwesomeIcon icon={faCamera} />
                                  {ktpScanCount >= KTP_SCAN_LIMIT ? 'Batas Tercapai' : 'Foto / Upload'}
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleKtpScan}
                                disabled={ktpScanning || ktpScanCount >= KTP_SCAN_LIMIT}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Required Fields */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-5 w-1 bg-emerald-500 rounded-full" />
                          <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Wajib Diisi</span>
                        </div>

                        <div>
                          <Label htmlFor="parent_name" className="text-gray-700">Nama Orang Tua / Wali <span className="text-red-500">*</span></Label>
                          <Input
                            id="parent_name"
                            name="parent_name"
                            value={formData.parent_name}
                            onChange={handleInputChange}
                            placeholder="Nama lengkap orang tua/wali"
                            className={`mt-1 bg-white/60 border-gray-200 text-gray-900 placeholder:text-gray-400 ${
                              formErrors.parent_name ? 'border-red-500' : ''
                            }`}
                          />
                          {formErrors.parent_name && (
                            <p className="text-red-500 text-sm mt-1">{formErrors.parent_name}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="parent_phone" className="text-gray-700">Nomor Telepon / WhatsApp <span className="text-red-500">*</span></Label>
                          <Input
                            id="parent_phone"
                            name="parent_phone"
                            value={formData.parent_phone}
                            onChange={handleInputChange}
                            placeholder="Contoh: 08123456789"
                            className={`mt-1 bg-white/60 border-gray-200 text-gray-900 placeholder:text-gray-400 ${
                              formErrors.parent_phone ? 'border-red-500' : ''
                            }`}
                          />
                          {formErrors.parent_phone && (
                            <p className="text-red-500 text-sm mt-1">{formErrors.parent_phone}</p>
                          )}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-300">OPSIONAL</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>

                      {/* Optional Fields */}
                      <div className="space-y-4 bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-5 w-1 bg-gray-300 rounded-full" />
                          <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Informasi Tambahan</span>
                        </div>

                        <div>
                          <Label htmlFor="parent_email" className="text-gray-700">Email</Label>
                          <Input
                            id="parent_email"
                            name="parent_email"
                            type="email"
                            value={formData.parent_email}
                            onChange={handleInputChange}
                            placeholder="Email orang tua/wali (opsional)"
                            className="mt-1 bg-white/60 border-gray-200 text-gray-900 placeholder:text-gray-400"
                          />
                        </div>

                        <div>
                          <Label htmlFor="parent_occupation" className="text-gray-700">Pekerjaan</Label>
                          <Input
                            id="parent_occupation"
                            name="parent_occupation"
                            value={formData.parent_occupation}
                            onChange={handleInputChange}
                            placeholder="Pekerjaan orang tua/wali"
                            className="mt-1 bg-white/60 border-gray-200 text-gray-900 placeholder:text-gray-400"
                          />
                        </div>

                        <div>
                          <Label htmlFor="parent_address" className="text-gray-700">Alamat Orang Tua</Label>
                          <textarea
                            id="parent_address"
                            name="parent_address"
                            value={formData.parent_address}
                            onChange={handleInputChange}
                            placeholder="Alamat orang tua (jika berbeda dengan alamat siswa)"
                            rows={3}
                            className="mt-1 w-full px-3 py-2 bg-white/60 border border-gray-200 rounded-md text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: School Selection */}
                  {step === 3 && (
                    <div className="space-y-6">
                      {/* Required Fields */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-5 w-1 bg-emerald-500 rounded-full" />
                          <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Wajib Diisi</span>
                        </div>

                        <div>
                          <Label htmlFor="level_id" className="text-gray-700">Pilih Jenjang <span className="text-red-500">*</span></Label>
                          <select
                            id="level_id"
                            name="level_id"
                            value={formData.level_id}
                            onChange={handleInputChange}
                            className={`mt-1 w-full px-3 py-2 bg-white/60 border rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                              formErrors.level_id ? 'border-red-500' : 'border-gray-200'
                            }`}
                          >
                            <option value="">Pilih jenjang yang dituju</option>
                            {units.map(unit => {
                              const unitLevels = levels.filter(l => l.unit_id === unit.unit_id)
                              if (unitLevels.length === 0) return null
                              return (
                                <optgroup key={unit.unit_id} label={unit.unit_name}>
                                  {unitLevels.map(level => (
                                    <option key={level.level_id} value={level.level_id}>
                                      {level.level_name}
                                    </option>
                                  ))}
                                </optgroup>
                              )
                            })}
                          </select>
                          {formErrors.level_id && (
                            <p className="text-red-500 text-sm mt-1">{formErrors.level_id}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="year_id" className="text-gray-700">Tahun Ajaran <span className="text-red-500">*</span></Label>
                          <select
                            id="year_id"
                            name="year_id"
                            value={formData.year_id}
                            onChange={handleInputChange}
                            className={`mt-1 w-full px-3 py-2 bg-white/60 border rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                              formErrors.year_id ? 'border-red-500' : 'border-gray-200'
                            }`}
                          >
                            <option value="">Pilih tahun ajaran</option>
                            {years.map(year => (
                              <option key={year.year_id} value={year.year_id}>
                                {year.year_name}
                              </option>
                            ))}
                          </select>
                          {formErrors.year_id && (
                            <p className="text-red-500 text-sm mt-1">{formErrors.year_id}</p>
                          )}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-300">OPSIONAL</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>

                      {/* Optional Fields */}
                      <div className="space-y-4 bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-5 w-1 bg-gray-300 rounded-full" />
                          <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Informasi Tambahan</span>
                        </div>

                        <div>
                          <Label htmlFor="additional_notes" className="text-gray-700">Catatan Tambahan</Label>
                          <textarea
                            id="additional_notes"
                            name="additional_notes"
                            value={formData.additional_notes}
                            onChange={handleInputChange}
                            placeholder="Informasi tambahan yang perlu diketahui (opsional)"
                            rows={3}
                            className="mt-1 w-full px-3 py-2 bg-white/60 border border-gray-200 rounded-md text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between mt-8">
                    {step > 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        className="border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl"
                      >
                        Kembali
                      </Button>
                    ) : (
                      <div />
                    )}

                    {step < 3 ? (
                      <Button
                        type="button"
                        onClick={handleNext}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-lg"
                      >
                        Lanjut
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 rounded-2xl shadow-lg"
                      >
                        {submitting ? (
                          <>
                            <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />
                            Mengirim...
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                            Kirim Pendaftaran
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              )}
            </CardContent>
            
            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          </Card>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-6">
          Sudah mendaftar? <Link href="/admission/status" className="text-emerald-600 hover:underline">Cek status pendaftaran</Link>
        </p>
      </div>

      {/* CSS for custom animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(1.03); }
        }
        .animate-pulse {
          animation: pulse 4s ease-in-out infinite;
        }
        .delay-500 { animation-delay: 0.5s; }
        .delay-1000 { animation-delay: 1s; }
      `}</style>
    </div>
  )
}
