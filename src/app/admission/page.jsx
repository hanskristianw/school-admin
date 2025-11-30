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
  faNoteSticky
} from '@fortawesome/free-solid-svg-icons'

// Animated background orbs component
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-emerald-400/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-3/4 -right-20 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute -top-20 right-1/4 w-80 h-80 bg-green-400/20 rounded-full blur-3xl animate-pulse delay-500" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-400/25 rounded-full blur-3xl animate-pulse delay-700" />
    </div>
  )
}

// Grid pattern overlay
function GridPattern() {
  return (
    <div 
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }}
    />
  )
}

export default function AdmissionPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: Student Info, 2: Parent Info, 3: School Selection
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [units, setUnits] = useState([])
  const [years, setYears] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [applicationNumber, setApplicationNumber] = useState('')
  
  const [formData, setFormData] = useState({
    // Student data
    student_name: '',
    student_nickname: '',
    student_gender: '',
    student_birth_date: '',
    student_birth_place: '',
    student_address: '',
    student_previous_school: '',
    // Parent data
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    parent_occupation: '',
    parent_address: '',
    // School selection
    unit_id: '',
    year_id: '',
    preferred_grade: '',
    additional_notes: ''
  })
  
  const [formErrors, setFormErrors] = useState({})
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

  const validateStep = (stepNumber) => {
    const errors = {}

    if (stepNumber === 1) {
      if (!formData.student_name.trim()) {
        errors.student_name = 'Nama lengkap wajib diisi'
      }
      if (!formData.student_gender) {
        errors.student_gender = 'Jenis kelamin wajib dipilih'
      }
    } else if (stepNumber === 2) {
      if (!formData.parent_name.trim()) {
        errors.parent_name = 'Nama orang tua/wali wajib diisi'
      }
      if (!formData.parent_phone.trim()) {
        errors.parent_phone = 'Nomor telepon wajib diisi'
      }
    } else if (stepNumber === 3) {
      if (!formData.unit_id) {
        errors.unit_id = 'Pilih sekolah yang dituju'
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
        student_address: formData.student_address.trim() || null,
        student_previous_school: formData.student_previous_school.trim() || null,
        parent_name: formData.parent_name.trim(),
        parent_phone: formData.parent_phone.trim(),
        parent_email: formData.parent_email.trim() || null,
        parent_occupation: formData.parent_occupation.trim() || null,
        parent_address: formData.parent_address.trim() || null,
        unit_id: parseInt(formData.unit_id),
        year_id: parseInt(formData.year_id),
        preferred_grade: formData.preferred_grade.trim() || null,
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900/40 to-slate-900 px-4 relative overflow-hidden">
        <FloatingOrbs />
        <GridPattern />
        
        <div className="w-full max-w-lg relative z-10">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-green-500 rounded-2xl blur-xl opacity-30" />
          
          <div className="relative backdrop-blur-xl bg-slate-900/80 border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-8 text-center">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
            
            <div className="w-20 h-20 mx-auto mb-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faCheckCircle} className="text-4xl text-emerald-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">Pendaftaran Berhasil!</h1>
            <p className="text-white/60 mb-6">Terima kasih telah mendaftar. Simpan nomor pendaftaran Anda:</p>
            
            <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-white/60 mb-1">Nomor Pendaftaran</p>
              <p className="text-2xl font-bold text-emerald-400 font-mono">{applicationNumber}</p>
            </div>
            
            <p className="text-white/50 text-sm mb-6">
              Gunakan nomor ini untuk mengecek status pendaftaran Anda. 
              Tim kami akan menghubungi Anda melalui nomor telepon yang terdaftar.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/admission/status" className="flex-1">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  Cek Status Pendaftaran
                </Button>
              </Link>
              <Link href="/login" className="flex-1">
                <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                  Kembali ke Login
                </Button>
              </Link>
            </div>
            
            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900/40 to-slate-900 px-4 py-8 relative overflow-y-auto" style={{ minHeight: '100vh', height: 'auto' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <FloatingOrbs />
        <GridPattern />
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
        <Link href="/login" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Kembali ke Login</span>
        </Link>
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur-lg opacity-30" />
              <Image
                src="/images/login-logo.png"
                alt="School Logo"
                width={120}
                height={60}
                style={{ width: 'auto', height: 'auto' }}
                className="relative object-contain drop-shadow-lg"
                priority
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Pendaftaran Siswa Baru</h1>
          <p className="text-white/60">Lengkapi formulir di bawah ini untuk mendaftar</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                s === step 
                  ? 'bg-emerald-500 text-white' 
                  : s < step 
                    ? 'bg-emerald-600/50 text-white' 
                    : 'bg-slate-700 text-white/50'
              }`}>
                {s < step ? '✓' : s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-1 mx-1 rounded ${
                  s < step ? 'bg-emerald-500' : 'bg-slate-700'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex justify-between text-xs text-white/60 mb-6 px-4">
          <span className={step === 1 ? 'text-emerald-400' : ''}>Data Siswa</span>
          <span className={step === 2 ? 'text-emerald-400' : ''}>Data Orang Tua</span>
          <span className={step === 3 ? 'text-emerald-400' : ''}>Pilihan Sekolah</span>
        </div>

        {/* Form Card */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-green-500 rounded-2xl blur-xl opacity-20" />
          
          <Card className="relative backdrop-blur-xl bg-slate-900/80 border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
            
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-white flex items-center gap-3">
                <FontAwesomeIcon 
                  icon={step === 1 ? faUser : step === 2 ? faUsers : faSchool} 
                  className="text-emerald-400"
                />
                {step === 1 && 'Data Calon Siswa'}
                {step === 2 && 'Data Orang Tua / Wali'}
                {step === 3 && 'Pilihan Sekolah & Tahun Ajaran'}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <FontAwesomeIcon icon={faSpinner} className="text-3xl text-emerald-400 animate-spin" />
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Step 1: Student Data */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="student_name" className="text-white/80">Nama Lengkap *</Label>
                        <Input
                          id="student_name"
                          name="student_name"
                          value={formData.student_name}
                          onChange={handleInputChange}
                          placeholder="Masukkan nama lengkap siswa"
                          className={`mt-1 bg-slate-800/50 border-white/20 text-white placeholder:text-white/40 ${
                            formErrors.student_name ? 'border-red-500' : ''
                          }`}
                        />
                        {formErrors.student_name && (
                          <p className="text-red-400 text-sm mt-1">{formErrors.student_name}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="student_nickname" className="text-white/80">Nama Panggilan</Label>
                        <Input
                          id="student_nickname"
                          name="student_nickname"
                          value={formData.student_nickname}
                          onChange={handleInputChange}
                          placeholder="Nama panggilan (opsional)"
                          className="mt-1 bg-slate-800/50 border-white/20 text-white placeholder:text-white/40"
                        />
                      </div>

                      <div>
                        <Label htmlFor="student_gender" className="text-white/80">Jenis Kelamin *</Label>
                        <select
                          id="student_gender"
                          name="student_gender"
                          value={formData.student_gender}
                          onChange={handleInputChange}
                          className={`mt-1 w-full px-3 py-2 bg-slate-800/50 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            formErrors.student_gender ? 'border-red-500' : 'border-white/20'
                          }`}
                        >
                          <option value="" className="bg-slate-800">Pilih jenis kelamin</option>
                          <option value="male" className="bg-slate-800">Laki-laki</option>
                          <option value="female" className="bg-slate-800">Perempuan</option>
                        </select>
                        {formErrors.student_gender && (
                          <p className="text-red-400 text-sm mt-1">{formErrors.student_gender}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="student_birth_place" className="text-white/80">Tempat Lahir</Label>
                          <Input
                            id="student_birth_place"
                            name="student_birth_place"
                            value={formData.student_birth_place}
                            onChange={handleInputChange}
                            placeholder="Kota tempat lahir"
                            className="mt-1 bg-slate-800/50 border-white/20 text-white placeholder:text-white/40"
                          />
                        </div>
                        <div>
                          <Label htmlFor="student_birth_date" className="text-white/80">Tanggal Lahir</Label>
                          <Input
                            id="student_birth_date"
                            name="student_birth_date"
                            type="date"
                            value={formData.student_birth_date}
                            onChange={handleInputChange}
                            className="mt-1 bg-slate-800/50 border-white/20 text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="student_address" className="text-white/80">Alamat</Label>
                        <textarea
                          id="student_address"
                          name="student_address"
                          value={formData.student_address}
                          onChange={handleInputChange}
                          placeholder="Alamat lengkap siswa"
                          rows={3}
                          className="mt-1 w-full px-3 py-2 bg-slate-800/50 border border-white/20 rounded-md text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <Label htmlFor="student_previous_school" className="text-white/80">Asal Sekolah Sebelumnya</Label>
                        <Input
                          id="student_previous_school"
                          name="student_previous_school"
                          value={formData.student_previous_school}
                          onChange={handleInputChange}
                          placeholder="Nama sekolah sebelumnya (jika ada)"
                          className="mt-1 bg-slate-800/50 border-white/20 text-white placeholder:text-white/40"
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 2: Parent Data */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="parent_name" className="text-white/80">Nama Orang Tua / Wali *</Label>
                        <Input
                          id="parent_name"
                          name="parent_name"
                          value={formData.parent_name}
                          onChange={handleInputChange}
                          placeholder="Nama lengkap orang tua/wali"
                          className={`mt-1 bg-slate-800/50 border-white/20 text-white placeholder:text-white/40 ${
                            formErrors.parent_name ? 'border-red-500' : ''
                          }`}
                        />
                        {formErrors.parent_name && (
                          <p className="text-red-400 text-sm mt-1">{formErrors.parent_name}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="parent_phone" className="text-white/80">Nomor Telepon / WhatsApp *</Label>
                        <Input
                          id="parent_phone"
                          name="parent_phone"
                          value={formData.parent_phone}
                          onChange={handleInputChange}
                          placeholder="Contoh: 08123456789"
                          className={`mt-1 bg-slate-800/50 border-white/20 text-white placeholder:text-white/40 ${
                            formErrors.parent_phone ? 'border-red-500' : ''
                          }`}
                        />
                        {formErrors.parent_phone && (
                          <p className="text-red-400 text-sm mt-1">{formErrors.parent_phone}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="parent_email" className="text-white/80">Email</Label>
                        <Input
                          id="parent_email"
                          name="parent_email"
                          type="email"
                          value={formData.parent_email}
                          onChange={handleInputChange}
                          placeholder="Email orang tua/wali (opsional)"
                          className="mt-1 bg-slate-800/50 border-white/20 text-white placeholder:text-white/40"
                        />
                      </div>

                      <div>
                        <Label htmlFor="parent_occupation" className="text-white/80">Pekerjaan</Label>
                        <Input
                          id="parent_occupation"
                          name="parent_occupation"
                          value={formData.parent_occupation}
                          onChange={handleInputChange}
                          placeholder="Pekerjaan orang tua/wali"
                          className="mt-1 bg-slate-800/50 border-white/20 text-white placeholder:text-white/40"
                        />
                      </div>

                      <div>
                        <Label htmlFor="parent_address" className="text-white/80">Alamat Orang Tua</Label>
                        <textarea
                          id="parent_address"
                          name="parent_address"
                          value={formData.parent_address}
                          onChange={handleInputChange}
                          placeholder="Alamat orang tua (jika berbeda dengan alamat siswa)"
                          rows={3}
                          className="mt-1 w-full px-3 py-2 bg-slate-800/50 border border-white/20 rounded-md text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 3: School Selection */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="unit_id" className="text-white/80">Pilih Sekolah *</Label>
                        <select
                          id="unit_id"
                          name="unit_id"
                          value={formData.unit_id}
                          onChange={handleInputChange}
                          className={`mt-1 w-full px-3 py-2 bg-slate-800/50 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            formErrors.unit_id ? 'border-red-500' : 'border-white/20'
                          }`}
                        >
                          <option value="" className="bg-slate-800">Pilih sekolah yang dituju</option>
                          {units.map(unit => (
                            <option key={unit.unit_id} value={unit.unit_id} className="bg-slate-800">
                              {unit.unit_name}
                            </option>
                          ))}
                        </select>
                        {formErrors.unit_id && (
                          <p className="text-red-400 text-sm mt-1">{formErrors.unit_id}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="year_id" className="text-white/80">Tahun Ajaran *</Label>
                        <select
                          id="year_id"
                          name="year_id"
                          value={formData.year_id}
                          onChange={handleInputChange}
                          className={`mt-1 w-full px-3 py-2 bg-slate-800/50 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            formErrors.year_id ? 'border-red-500' : 'border-white/20'
                          }`}
                        >
                          <option value="" className="bg-slate-800">Pilih tahun ajaran</option>
                          {years.map(year => (
                            <option key={year.year_id} value={year.year_id} className="bg-slate-800">
                              {year.year_name}
                            </option>
                          ))}
                        </select>
                        {formErrors.year_id && (
                          <p className="text-red-400 text-sm mt-1">{formErrors.year_id}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="preferred_grade" className="text-white/80">Kelas yang Diminati</Label>
                        <Input
                          id="preferred_grade"
                          name="preferred_grade"
                          value={formData.preferred_grade}
                          onChange={handleInputChange}
                          placeholder="Contoh: Grade 7, Kelas 1, dll (opsional)"
                          className="mt-1 bg-slate-800/50 border-white/20 text-white placeholder:text-white/40"
                        />
                      </div>

                      <div>
                        <Label htmlFor="additional_notes" className="text-white/80">Catatan Tambahan</Label>
                        <textarea
                          id="additional_notes"
                          name="additional_notes"
                          value={formData.additional_notes}
                          onChange={handleInputChange}
                          placeholder="Informasi tambahan yang perlu diketahui (opsional)"
                          rows={3}
                          className="mt-1 w-full px-3 py-2 bg-slate-800/50 border border-white/20 rounded-md text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
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
                        className="border-white/20 text-white hover:bg-white/10"
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
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Lanjut
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
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
            
            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent" />
          </Card>
        </div>

        {/* Footer */}
        <p className="text-center text-white/40 text-sm mt-6">
          Sudah mendaftar? <Link href="/admission/status" className="text-emerald-400 hover:underline">Cek status pendaftaran</Link>
        </p>
      </div>

      {/* CSS for custom animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        .animate-pulse {
          animation: pulse 4s ease-in-out infinite;
        }
        .delay-500 { animation-delay: 0.5s; }
        .delay-700 { animation-delay: 0.7s; }
        .delay-1000 { animation-delay: 1s; }
      `}</style>
    </div>
  )
}
