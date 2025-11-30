'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowLeft,
  faSearch,
  faSpinner,
  faCheckCircle,
  faClock,
  faTimesCircle,
  faHourglassHalf,
  faListAlt,
  faUser,
  faSchool,
  faCalendar,
  faPhone,
  faEnvelope
} from '@fortawesome/free-solid-svg-icons'

// Background components
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-sky-400/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-3/4 -right-20 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute -top-20 right-1/4 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-pulse delay-500" />
    </div>
  )
}

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

const statusConfig = {
  pending: {
    label: 'Menunggu Review',
    icon: faClock,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30'
  },
  under_review: {
    label: 'Sedang Direview',
    icon: faHourglassHalf,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30'
  },
  approved: {
    label: 'Diterima',
    icon: faCheckCircle,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30'
  },
  rejected: {
    label: 'Ditolak',
    icon: faTimesCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30'
  },
  waitlist: {
    label: 'Daftar Tunggu',
    icon: faListAlt,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30'
  }
}

export default function AdmissionStatusPage() {
  const [searching, setSearching] = useState(false)
  const [application, setApplication] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [searchData, setSearchData] = useState({
    application_number: '',
    verification: '' // phone or email
  })
  const [error, setError] = useState('')

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setSearchData(prev => ({ ...prev, [name]: value }))
    setError('')
    setNotFound(false)
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    
    if (!searchData.application_number.trim()) {
      setError('Nomor pendaftaran wajib diisi')
      return
    }
    if (!searchData.verification.trim()) {
      setError('Email atau nomor telepon wajib diisi untuk verifikasi')
      return
    }

    setSearching(true)
    setApplication(null)
    setNotFound(false)
    setError('')

    try {
      // Search by application number and verify with email or phone
      const { data, error: fetchError } = await supabase
        .from('student_applications')
        .select(`
          application_id,
          application_number,
          student_name,
          student_nickname,
          status,
          created_at,
          updated_at,
          reviewed_at,
          admin_notes,
          preferred_grade,
          unit:unit_id(unit_name),
          year:year_id(year_name)
        `)
        .eq('application_number', searchData.application_number.trim().toUpperCase())
        .or(`parent_email.ilike.${searchData.verification.trim()},parent_phone.eq.${searchData.verification.trim()}`)
        .single()

      if (fetchError || !data) {
        setNotFound(true)
      } else {
        setApplication(data)
      }
    } catch (err) {
      console.error('Error searching application:', err)
      setError('Terjadi kesalahan saat mencari data')
    } finally {
      setSearching(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-sky-900/40 to-slate-900 px-4 py-8 relative overflow-hidden">
      <FloatingOrbs />
      <GridPattern />
      
      <div className="max-w-xl mx-auto relative z-10">
        {/* Back to Login */}
        <Link href="/login" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Kembali ke Login</span>
        </Link>
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/images/login-logo.png"
              alt="School Logo"
              width={100}
              height={50}
              style={{ width: 'auto', height: 'auto' }}
              className="object-contain drop-shadow-lg"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Cek Status Pendaftaran</h1>
          <p className="text-white/60">Masukkan nomor pendaftaran untuk melihat status</p>
        </div>

        {/* Search Form */}
        <div className="relative mb-6">
          <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-blue-500 rounded-2xl blur-xl opacity-20" />
          
          <Card className="relative backdrop-blur-xl bg-slate-900/80 border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-400 to-transparent" />
            
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <Label htmlFor="application_number" className="text-white/80">Nomor Pendaftaran *</Label>
                  <Input
                    id="application_number"
                    name="application_number"
                    value={searchData.application_number}
                    onChange={handleInputChange}
                    placeholder="Contoh: REG-2025-000001"
                    className="mt-1 bg-slate-800/50 border-white/20 text-white placeholder:text-white/40 uppercase"
                  />
                </div>

                <div>
                  <Label htmlFor="verification" className="text-white/80">Email atau No. Telepon *</Label>
                  <Input
                    id="verification"
                    name="verification"
                    value={searchData.verification}
                    onChange={handleInputChange}
                    placeholder="Email atau nomor telepon yang didaftarkan"
                    className="mt-1 bg-slate-800/50 border-white/20 text-white placeholder:text-white/40"
                  />
                  <p className="text-white/40 text-xs mt-1">Untuk verifikasi identitas</p>
                </div>

                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={searching}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50"
                >
                  {searching ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />
                      Mencari...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faSearch} className="mr-2" />
                      Cek Status
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
            
            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
          </Card>
        </div>

        {/* Not Found Message */}
        {notFound && (
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur-xl opacity-20" />
            <Card className="relative backdrop-blur-xl bg-slate-900/80 border border-red-500/30 rounded-2xl p-6 text-center">
              <FontAwesomeIcon icon={faTimesCircle} className="text-4xl text-red-400 mb-4" />
              <h3 className="text-white font-semibold mb-2">Data Tidak Ditemukan</h3>
              <p className="text-white/60 text-sm">
                Pastikan nomor pendaftaran dan email/telepon yang Anda masukkan benar.
              </p>
            </Card>
          </div>
        )}

        {/* Application Result */}
        {application && (
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-blue-500 rounded-2xl blur-xl opacity-20" />
            
            <Card className="relative backdrop-blur-xl bg-slate-900/80 border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-400 to-transparent" />
              
              <CardHeader className="border-b border-white/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Detail Pendaftaran</CardTitle>
                  <span className="text-sm font-mono text-sky-400">{application.application_number}</span>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Status Badge */}
                <div className={`${statusConfig[application.status]?.bgColor} ${statusConfig[application.status]?.borderColor} border rounded-xl p-4 flex items-center gap-4`}>
                  <div className={`w-12 h-12 rounded-full ${statusConfig[application.status]?.bgColor} flex items-center justify-center`}>
                    <FontAwesomeIcon 
                      icon={statusConfig[application.status]?.icon} 
                      className={`text-2xl ${statusConfig[application.status]?.color}`} 
                    />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Status Pendaftaran</p>
                    <p className={`text-lg font-semibold ${statusConfig[application.status]?.color}`}>
                      {statusConfig[application.status]?.label}
                    </p>
                  </div>
                </div>

                {/* Student Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-white/80">
                    <FontAwesomeIcon icon={faUser} className="w-5 text-sky-400" />
                    <div>
                      <p className="text-white/50 text-xs">Nama Siswa</p>
                      <p className="font-medium">{application.student_name}</p>
                      {application.student_nickname && (
                        <p className="text-sm text-white/60">({application.student_nickname})</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-white/80">
                    <FontAwesomeIcon icon={faSchool} className="w-5 text-sky-400" />
                    <div>
                      <p className="text-white/50 text-xs">Sekolah yang Dituju</p>
                      <p className="font-medium">{application.unit?.unit_name || '-'}</p>
                      {application.preferred_grade && (
                        <p className="text-sm text-white/60">Kelas: {application.preferred_grade}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-white/80">
                    <FontAwesomeIcon icon={faCalendar} className="w-5 text-sky-400" />
                    <div>
                      <p className="text-white/50 text-xs">Tahun Ajaran</p>
                      <p className="font-medium">{application.year?.year_name || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="border-t border-white/10 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-white/60">
                    <span>Tanggal Daftar:</span>
                    <span>{formatDate(application.created_at)}</span>
                  </div>
                  {application.reviewed_at && (
                    <div className="flex justify-between text-white/60">
                      <span>Tanggal Review:</span>
                      <span>{formatDate(application.reviewed_at)}</span>
                    </div>
                  )}
                </div>

                {/* Admin Notes */}
                {application.admin_notes && (
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-white/50 text-xs mb-1">Catatan dari Admin:</p>
                    <p className="text-white/80 text-sm bg-slate-800/50 rounded-lg p-3">
                      {application.admin_notes}
                    </p>
                  </div>
                )}
              </CardContent>
              
              <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            </Card>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-white/40 text-sm mt-6">
          Belum mendaftar? <Link href="/admission" className="text-sky-400 hover:underline">Daftar sekarang</Link>
        </p>
      </div>

      {/* CSS for custom animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        .animate-pulse { animation: pulse 4s ease-in-out infinite; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-1000 { animation-delay: 1s; }
      `}</style>
    </div>
  )
}
