'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/modal';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserGraduate,
  faEye,
  faCheck,
  faTimes,
  faClock,
  faSpinner,
  faPhone,
  faEnvelope,
  faSchool,
  faCalendar,
  faUser,
  faTag,
  faPlus,
  faTrash,
  faArrowUp,
  faArrowDown,
  faCalculator,
  faSave,
  faDownload,
  faEdit,
  faFileInvoice,
  faSync,
  faPaperPlane,
  faHistory,
  faChevronLeft,
  faChevronRight,
  faReceipt,
  faExternalLinkAlt,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';

export default function UnifiedAdmissionModal({
  isOpen,
  onClose,
  application,
  modalTab,
  setModalTab,
  isDark,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  inputStyle,
  selectStyle,
  statusConfig,
  statusLabels,
  formatDate,
  formatDateTime,
  formatCurrency,
  cleanAdditionalNotes,
  handleSendStepEmail,
  sendingEmailStep,
  handleVerifyFormFee,
  processing,
  isEditing,
  setIsEditing,
  editData,
  setEditData,
  editSaving,
  handleStartEdit,
  handleSaveEdit,
  allCities = [],
  scheduleData,
  setScheduleData,
  sameDaySchedule,
  setSameDaySchedule,
  handleSaveSchedule,
  scheduleSaving,
  discounts = [],
  masterDiscounts = [],
  udpDef,
  usekDef,
  discountLoading,
  discountSaving,
  showAddDiscount,
  setShowAddDiscount,
  addDiscountTarget,
  setAddDiscountTarget,
  handleAddDiscount,
  handleRemoveDiscount,
  handleMoveDiscount,
  installmentConfig,
  setInstallmentConfig,
  installmentLoading,
  installmentSaving,
  allInstallments = [],
  handleSaveInstallment,
  handlePrintInstallment,
  handleEmailInstallment,
  emailSending,
  calculateInstallmentSchedule,
  monthNames = [],
  actionType,
  setActionType,
  adminNotes,
  setAdminNotes,
  handleUpdateStatus,
  detailApplicantLogs = [],
  detailLogsLoading,
  fetchLogsForApplicant,
  handleResendPaymentEmail,
  resendingEmailId,
  getEmailTypeLabel,
  getEmailStatusLabel
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [editCitySearch, setEditCitySearch] = useState('');
  const [showEditCityDropdown, setShowEditCityDropdown] = useState(false);

  if (!application) return null;

  const appNo = application.application_number || 'REG-XXXX';
  const targetEmailOrNo = application.parent_email || application.application_number;
  const phoneParam = application.parent_phone ? `&phone=${encodeURIComponent(application.parent_phone)}` : '';
  const portalUrl = `https://ccs.sch.id/registrasi/status.php?cek=${encodeURIComponent(targetEmailOrNo)}${phoneParam}`;

  const handleCopyPortal = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(portalUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const scheduleInfoNotes = application.schedule_notes || scheduleData?.schedule_notes;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${appNo} — ${application.student_name || 'Detail Pendaftaran'}`}
      size="xl"
    >
      <div className="space-y-5">
        {/* ── 1. TOP SUMMARY HEADER BANNER ─────────────────────────────────── */}
        <div
          className="p-3.5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3"
          style={{
            background: isDark ? '#18181B' : '#F9F9F8',
            borderColor
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center border font-bold text-sm shrink-0"
              style={{
                background: isDark ? '#27272A' : '#FFFFFF',
                borderColor,
                color: isDark ? '#60A5FA' : '#0284C7'
              }}
            >
              <FontAwesomeIcon icon={faUserGraduate} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm" style={{ color: textPrimary }}>
                  {application.student_name || 'Calon Siswa Baru'}
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded border font-semibold" style={{ borderColor, color: isDark ? '#60A5FA' : '#0284C7', background: isDark ? '#1E293B' : '#F0F9FF' }}>
                  {appNo}
                </span>
              </div>
              <p className="text-xs font-mono mt-0.5" style={{ color: textSecondary }}>
                Jenjang: <strong style={{ color: textPrimary }}>{application.level?.level_name || application.preferred_grade || '-'}</strong> ({application.unit?.unit_name || 'CCS'}) &bull; TA: {application.year?.year_name || '2026/2027'} &bull; Gelombang: {application.wave_name || 'Reguler'}
              </p>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Form Fee Status Badge */}
            <span
              className="px-2.5 py-1 rounded text-[11px] font-mono font-medium border inline-flex items-center gap-1.5"
              style={
                application.form_fee_status === 'verified'
                  ? { background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#EDF3EC', color: isDark ? '#34D399' : '#346538', borderColor: isDark ? '#059669' : '#A7F3D0' }
                  : application.form_fee_status === 'proof_uploaded'
                  ? { background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FBF3DB', color: isDark ? '#FBBF24' : '#956400', borderColor: isDark ? '#D97706' : '#FDE68A' }
                  : application.form_fee_status === 'rejected'
                  ? { background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC', color: isDark ? '#F87171' : '#9F2F2D', borderColor: isDark ? '#DC2626' : '#FECACA' }
                  : { background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary, borderColor }
              }
            >
              <FontAwesomeIcon icon={application.form_fee_status === 'verified' ? faCheck : (application.form_fee_status === 'rejected' ? faTimes : faClock)} className="text-[10px]" />
              <span>
                {application.form_fee_status === 'verified' ? 'Formulir Lunas' :
                 application.form_fee_status === 'proof_uploaded' ? 'Bukti Perlu Diverifikasi' :
                 application.form_fee_status === 'rejected' ? 'Bukti Ditolak' : 'Belum Bayar Formulir'}
              </span>
            </span>

            {/* Admission Status Badge */}
            <span
              className="px-2.5 py-1 rounded text-[11px] font-mono font-semibold border inline-flex items-center gap-1.5"
              style={
                application.status === 'approved'
                  ? { background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#EDF3EC', color: isDark ? '#34D399' : '#346538', borderColor: isDark ? '#059669' : '#A7F3D0' }
                  : application.status === 'rejected'
                  ? { background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC', color: isDark ? '#F87171' : '#9F2F2D', borderColor: isDark ? '#DC2626' : '#FECACA' }
                  : application.status === 'under_review'
                  ? { background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF', color: isDark ? '#60A5FA' : '#1D4ED8', borderColor: isDark ? '#2563EB' : '#BFDBFE' }
                  : { background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FBF3DB', color: isDark ? '#FBBF24' : '#956400', borderColor: isDark ? '#D97706' : '#FDE68A' }
              }
            >
              <FontAwesomeIcon icon={statusConfig[application.status]?.icon || faClock} className="text-[10px]" />
              <span>{statusLabels[application.status] || application.status}</span>
            </span>

            {/* Promo Code Badge */}
            {application.promo_code && (
              <span
                className="px-2.5 py-1 rounded text-[11px] font-mono font-bold border inline-flex items-center gap-1.5"
                style={{
                  background: isDark ? 'rgba(147, 51, 234, 0.2)' : '#F5F3FF',
                  color: isDark ? '#C4B5FD' : '#6D28D9',
                  borderColor: isDark ? '#7E22CE' : '#DDD6FE'
                }}
                title={`Kupon Promosi: ${application.promo_code}`}
              >
                <FontAwesomeIcon icon={faTag} className="text-[10px]" />
                <span>Kupon: {application.promo_code}</span>
              </span>
            )}
          </div>
        </div>

        {/* ── 2. STEPPER NAVIGATION BAR (5 STEPS + RIWAYAT EMAIL) ───────────── */}
        <div className="border-b pb-2 -mx-5 px-5 overflow-x-auto" style={{ borderColor }}>
          <div className="flex items-center gap-1.5 min-w-max">
            {/* Step 1: Registrasi */}
            <button
              type="button"
              onClick={() => setModalTab('step1')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
              style={{
                background: modalTab === 'step1' ? (isDark ? '#27272A' : '#E2E8F0') : 'transparent',
                border: modalTab === 'step1' ? `1px solid ${isDark ? '#3F3F46' : '#CBD5E1'}` : '1px solid transparent',
                color: modalTab === 'step1' ? textPrimary : textSecondary,
                fontWeight: modalTab === 'step1' ? 700 : 500
              }}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
              </span>
              <span>1. Registrasi</span>
            </button>

            {/* Step 2: Biaya Formulir */}
            <button
              type="button"
              onClick={() => setModalTab('step2')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
              style={{
                background: modalTab === 'step2' ? (isDark ? '#27272A' : '#E2E8F0') : 'transparent',
                border: modalTab === 'step2' ? `1px solid ${isDark ? '#3F3F46' : '#CBD5E1'}` : '1px solid transparent',
                color: modalTab === 'step2' ? textPrimary : textSecondary,
                fontWeight: modalTab === 'step2' ? 700 : 500
              }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: application.form_fee_status === 'verified' ? 'rgba(16, 185, 129, 0.2)' : (application.form_fee_status === 'proof_uploaded' ? 'rgba(245, 158, 11, 0.2)' : (isDark ? '#3F3F46' : '#E2E8F0')),
                  color: application.form_fee_status === 'verified' ? (isDark ? '#34D399' : '#047857') : (application.form_fee_status === 'proof_uploaded' ? '#D97706' : textSecondary)
                }}
              >
                {application.form_fee_status === 'verified' ? <FontAwesomeIcon icon={faCheck} className="text-[9px]" /> : '2'}
              </span>
              <span>2. Biaya Formulir</span>
              {application.form_fee_status === 'proof_uploaded' && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>

            {/* Step 3: Biodata Lengkap & Jadwal */}
            <button
              type="button"
              onClick={() => setModalTab('step3')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
              style={{
                background: modalTab === 'step3' ? (isDark ? '#27272A' : '#E2E8F0') : 'transparent',
                border: modalTab === 'step3' ? `1px solid ${isDark ? '#3F3F46' : '#CBD5E1'}` : '1px solid transparent',
                color: modalTab === 'step3' ? textPrimary : textSecondary,
                fontWeight: modalTab === 'step3' ? 700 : 500
              }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: (application.is_form_completed && (application.test_date || scheduleData?.test_date)) ? 'rgba(16, 185, 129, 0.2)' : (isDark ? '#3F3F46' : '#E2E8F0'),
                  color: (application.is_form_completed && (application.test_date || scheduleData?.test_date)) ? (isDark ? '#34D399' : '#047857') : textSecondary
                }}
              >
                {(application.is_form_completed && (application.test_date || scheduleData?.test_date)) ? <FontAwesomeIcon icon={faCheck} className="text-[9px]" /> : '3'}
              </span>
              <span>3. Biodata & Jadwal</span>
            </button>

            {/* Step 4: Observasi & Biaya */}
            <button
              type="button"
              onClick={() => setModalTab('step4')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
              style={{
                background: modalTab === 'step4' ? (isDark ? '#27272A' : '#E2E8F0') : 'transparent',
                border: modalTab === 'step4' ? `1px solid ${isDark ? '#3F3F46' : '#CBD5E1'}` : '1px solid transparent',
                color: modalTab === 'step4' ? textPrimary : textSecondary,
                fontWeight: modalTab === 'step4' ? 700 : 500
              }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: (discounts.length > 0 || allInstallments.some(inst => inst.application_id === application.application_id)) ? 'rgba(139, 92, 246, 0.2)' : (isDark ? '#3F3F46' : '#E2E8F0'),
                  color: (discounts.length > 0 || allInstallments.some(inst => inst.application_id === application.application_id)) ? (isDark ? '#A78BFA' : '#7C3AED') : textSecondary
                }}
              >
                4
              </span>
              <span>4. Observasi & Biaya</span>
            </button>

            {/* Step 5: Hasil Seleksi */}
            <button
              type="button"
              onClick={() => setModalTab('step5')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
              style={{
                background: modalTab === 'step5' ? (isDark ? '#27272A' : '#E2E8F0') : 'transparent',
                border: modalTab === 'step5' ? `1px solid ${isDark ? '#3F3F46' : '#CBD5E1'}` : '1px solid transparent',
                color: modalTab === 'step5' ? textPrimary : textSecondary,
                fontWeight: modalTab === 'step5' ? 700 : 500
              }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: application.status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : (application.status === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : (isDark ? '#3F3F46' : '#E2E8F0')),
                  color: application.status === 'approved' ? (isDark ? '#34D399' : '#047857') : (application.status === 'rejected' ? '#EF4444' : textSecondary)
                }}
              >
                {application.status === 'approved' ? <FontAwesomeIcon icon={faCheck} className="text-[9px]" /> : '5'}
              </span>
              <span>5. Hasil Seleksi</span>
            </button>

            <div className="h-4 w-px mx-1" style={{ background: borderColor }} />

            {/* Tab Riwayat Email */}
            <button
              type="button"
              onClick={() => setModalTab('email_logs')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
              style={{
                background: modalTab === 'email_logs' ? (isDark ? '#27272A' : '#E2E8F0') : 'transparent',
                border: modalTab === 'email_logs' ? `1px solid ${isDark ? '#3F3F46' : '#CBD5E1'}` : '1px solid transparent',
                color: modalTab === 'email_logs' ? textPrimary : textSecondary,
                fontWeight: modalTab === 'email_logs' ? 700 : 500
              }}
            >
              <FontAwesomeIcon icon={faHistory} className="text-[10px]" />
              <span>Riwayat Email ({detailApplicantLogs.length})</span>
            </button>
          </div>
        </div>

        {/* ── 3. TAB 1: REGISTRASI ─────────────────────────────────────────── */}
        {modalTab === 'step1' && (
          <div className="space-y-4">
            {/* Promo Code Notification Card */}
            {application.promo_code && (
              <div
                className="p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                style={{
                  background: isDark ? 'rgba(147, 51, 234, 0.1)' : '#F5F3FF',
                  borderColor: isDark ? '#7E22CE' : '#DDD6FE'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-600 text-white text-xs shrink-0">
                    <FontAwesomeIcon icon={faTag} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-100 border border-purple-300 dark:border-purple-700">
                        {application.promo_code}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: textPrimary }}>
                        {application.promo_details?.discount_name || 'Kupon Promosi Pendaftaran'}
                      </span>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: textSecondary }}>
                      Kupon berhasil diklaim saat pendaftaran &bull; Potongan: <strong>{application.promo_details?.discount_type === 'percentage' ? `${application.promo_details?.discount_value}%` : formatCurrency(application.promo_details?.discount_value)}</strong> untuk {application.promo_details?.applies_to === 'udp' ? 'Uang Gedung (DPP)' : application.promo_details?.applies_to === 'usek' ? 'Uang Sekolah (SPP)' : 'DPP & SPP'}
                    </p>
                  </div>
                </div>
                {['confirmed', 'applied'].includes(application.promo_status) || application.form_fee_status === 'verified' ? (
                  <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 self-start sm:self-auto shrink-0 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                    <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
                    <span>{application.promo_status === 'applied' ? 'Kupon Diterapkan' : 'Kuota Terkunci (Lunas)'}</span>
                  </span>
                ) : application.promo_status === 'quota_exhausted' ? (
                  <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 self-start sm:self-auto shrink-0 border border-rose-300 dark:border-rose-700">
                    Kuota Habis
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 self-start sm:self-auto shrink-0 border border-amber-300 dark:border-amber-700">
                    Menunggu Pelunasan Formulir
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card Data Pendaftaran */}
              <div className="p-4 rounded-lg border space-y-3" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor }}>
                <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor }}>
                  <FontAwesomeIcon icon={faSchool} style={{ color: textSecondary }} className="text-xs" />
                  <h4 className="text-xs font-mono uppercase tracking-wider font-semibold" style={{ color: textPrimary }}>
                    Data Registrasi & Pendaftaran
                  </h4>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span style={{ color: textSecondary }}>Nomor Registrasi:</span>
                    <span className="font-mono font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>{appNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: textSecondary }}>Tanggal Pendaftaran:</span>
                    <span className="font-mono" style={{ color: textPrimary }}>{formatDate(application.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: textSecondary }}>Jenjang Pilihan:</span>
                    <span className="font-semibold" style={{ color: textPrimary }}>{application.level?.level_name || application.preferred_grade || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: textSecondary }}>Unit Sekolah:</span>
                    <span style={{ color: textPrimary }}>{application.unit?.unit_name || 'Chung Chung Christian School'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: textSecondary }}>Tahun Ajaran:</span>
                    <span className="font-mono" style={{ color: textPrimary }}>{application.year?.year_name || '2026/2027'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: textSecondary }}>Gelombang:</span>
                    <span className="font-medium" style={{ color: textPrimary }}>{application.wave_name || 'Gelombang Reguler'}</span>
                  </div>
                </div>
              </div>

              {/* Card Kontak & Link Portal */}
              <div className="p-4 rounded-lg border space-y-3" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor }}>
                <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor }}>
                  <FontAwesomeIcon icon={faPhone} style={{ color: textSecondary }} className="text-xs" />
                  <h4 className="text-xs font-mono uppercase tracking-wider font-semibold" style={{ color: textPrimary }}>
                    Kontak Orang Tua & Akses Portal Siswa
                  </h4>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span style={{ color: textSecondary }}>Nama Orang Tua / Pendaftar:</span>
                    <span className="font-medium" style={{ color: textPrimary }}>{application.parent_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: textSecondary }}>Email Orang Tua:</span>
                    <span className="font-mono font-medium" style={{ color: textPrimary }}>{application.parent_email || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: textSecondary }}>WhatsApp / HP:</span>
                    <span className="font-mono font-medium" style={{ color: textPrimary }}>{application.parent_phone || '-'}</span>
                  </div>
                  <div className="pt-2 border-t" style={{ borderColor }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono uppercase" style={{ color: textSecondary }}>Link Portal Cek Status Orang Tua:</span>
                      {copiedLink && <span className="text-[10px] font-mono text-emerald-600 font-semibold">Tersalin!</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        readOnly
                        value={portalUrl}
                        className="w-full text-[11px] font-mono px-2 py-1 rounded border outline-none truncate"
                        style={inputStyle}
                      />
                      <button
                        type="button"
                        onClick={handleCopyPortal}
                        className="px-2 py-1 rounded border text-[11px] font-mono transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ borderColor, color: textPrimary }}
                      >
                        Salin
                      </button>
                      <a
                        href={portalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded border text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 shrink-0"
                        style={{ borderColor }}
                        title="Buka Halaman Portal Orang Tua"
                      >
                        <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Email Action Box Step 1 */}
            <div className="p-4 rounded-lg border space-y-3" style={{ background: isDark ? 'rgba(56, 189, 248, 0.08)' : '#F0F9FF', borderColor: isDark ? '#0284C7' : '#BAE6FD' }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5" style={{ color: isDark ? '#38BDF8' : '#0369A1' }}>
                    <FontAwesomeIcon icon={faEnvelope} />
                    Kirim Email Tagihan & Instruksi Pembayaran Formulir
                  </h4>
                  <p className="text-xs mt-1" style={{ color: textSecondary }}>
                    Kirimkan rincian nomor registrasi ({appNo}), nomor rekening resmi Bank Mayapada (100-3000-3853 a/n Yayasan Pendidikan Mayapada School), nominal biaya formulir ({formatCurrency(application.form_fee_amount || 250000)}), serta tautan upload bukti transfer ke email orang tua.
                  </p>
                  <p className="text-[11px] font-mono mt-1" style={{ color: textSecondary }}>
                    Status: {application.step1_email_sent_at ? `Terakhir dikirim: ${formatDateTime(application.step1_email_sent_at)}` : 'Belum pernah dikirim'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSendStepEmail(1, 'admissionRegistrationPayment')}
                  disabled={sendingEmailStep === 1 || !application.parent_email}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded text-white transition-all shadow-sm disabled:opacity-50"
                  style={{ background: isDark ? '#0284C7' : '#0369A1' }}
                >
                  <FontAwesomeIcon icon={sendingEmailStep === 1 ? faSpinner : faPaperPlane} className={sendingEmailStep === 1 ? 'animate-spin' : ''} />
                  <span>{sendingEmailStep === 1 ? 'Mengirim...' : 'Kirim Email Tagihan Formulir'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 4. TAB 2: BIAYA FORMULIR ─────────────────────────────────────── */}
        {modalTab === 'step2' && (
          <div className="space-y-4">
            {/* Promo Code Quota Alert in Step 2 */}
            {application.promo_code && (() => {
              const isPromoConfirmed = ['confirmed', 'applied'].includes(application.promo_status) || application.form_fee_status === 'verified';
              const isPromoExhausted = application.promo_status === 'quota_exhausted' && application.form_fee_status !== 'verified';
              const isPromoApplied = application.promo_status === 'applied';

              return (
                <div
                  className="p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                  style={{
                    background: isPromoConfirmed
                      ? (isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5')
                      : isPromoExhausted
                      ? (isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2')
                      : (isDark ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB'),
                    borderColor: isPromoConfirmed
                      ? (isDark ? '#059669' : '#A7F3D0')
                      : isPromoExhausted
                      ? (isDark ? '#DC2626' : '#FECACA')
                      : (isDark ? '#D97706' : '#FDE68A')
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <FontAwesomeIcon
                      icon={faTag}
                      className={`mt-0.5 ${isPromoConfirmed ? 'text-emerald-600' : isPromoExhausted ? 'text-rose-600' : 'text-amber-600'}`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: textPrimary }}>
                          Kupon Promosi: <strong className="font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-800">{application.promo_code}</strong> ({application.promo_details?.discount_name || 'Diskon Masuk'})
                        </span>
                      </div>
                      <span className="block text-[11px] mt-0.5" style={{ color: textSecondary }}>
                        {isPromoConfirmed
                          ? (isPromoApplied
                              ? 'Kupon promosi telah resmi diterapkan pada rincian skema pembiayaan siswa ini.'
                              : 'Kuota promosi telah resmi terpotong dan terkunci untuk calon siswa ini karena pembayaran formulir telah lunas.')
                          : isPromoExhausted
                          ? 'Mohon maaf, kuota kode promosi ini telah habis terisi oleh pendaftar lain yang menyelesaikan pembayaran formulir lebih awal.'
                          : 'Calon siswa mendaftar dengan kupon ini. Menyetujui pembayaran formulir di bawah ini akan resmi memotong & mengunci 1 slot kuota promosi.'}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase shrink-0 border self-start sm:self-auto ${
                      isPromoConfirmed
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                        : isPromoExhausted
                        ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                        : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {isPromoConfirmed 
                      ? (isPromoApplied ? 'Kupon Diterapkan' : 'Kuota Terkunci') 
                      : isPromoExhausted 
                      ? 'Kuota Habis' 
                      : 'Menunggu Pelunasan'}
                  </span>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Pembayaran & Tagihan */}
              <div className="p-4 rounded-lg border space-y-3" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor }}>
                <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor }}>
                  <FontAwesomeIcon icon={faReceipt} style={{ color: textSecondary }} className="text-xs" />
                  <h4 className="text-xs font-mono uppercase tracking-wider font-semibold" style={{ color: textPrimary }}>
                    Status Biaya Formulir Pendaftaran
                  </h4>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span style={{ color: textSecondary }}>Nominal Biaya Formulir:</span>
                    <span className="font-mono font-bold text-sm" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
                      {formatCurrency(application.form_fee_amount || 250000)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: textSecondary }}>Status Verifikasi:</span>
                    <span className="font-semibold" style={{
                      color: application.form_fee_status === 'verified' ? (isDark ? '#34D399' : '#059669') :
                             application.form_fee_status === 'proof_uploaded' ? (isDark ? '#FBBF24' : '#D97706') :
                             application.form_fee_status === 'rejected' ? (isDark ? '#F87171' : '#DC2626') : textSecondary
                    }}>
                      {application.form_fee_status === 'verified' ? 'LUNAS (Terverifikasi)' :
                       application.form_fee_status === 'proof_uploaded' ? 'Bukti Diunggah (Perlu Verifikasi)' :
                       application.form_fee_status === 'rejected' ? 'Bukti Ditolak' : 'Menunggu Pembayaran'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: textSecondary }}>Waktu Verifikasi:</span>
                    <span className="font-mono" style={{ color: textPrimary }}>
                      {application.verified_at ? formatDateTime(application.verified_at) : '-'}
                    </span>
                  </div>
                </div>

                {/* Tombol Aksi Verifikasi */}
                <div className="pt-3 border-t flex items-center gap-2 flex-wrap" style={{ borderColor }}>
                  {application.form_fee_status !== 'verified' && (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded transition-colors"
                      style={{ background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#EDF3EC', borderColor: isDark ? '#059669' : '#A7F3D0', color: isDark ? '#34D399' : '#059669', borderRadius: '6px' }}
                      onClick={() => handleVerifyFormFee(application.application_id, 'verified')}
                      disabled={processing}
                    >
                      <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                      <span>Setujui Pembayaran Formulir (Lunas)</span>
                    </button>
                  )}
                  {application.form_fee_status !== 'rejected' && (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded transition-colors"
                      style={{ background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC', borderColor: isDark ? '#DC2626' : '#FECACA', color: isDark ? '#F87171' : '#DC2626', borderRadius: '6px' }}
                      onClick={() => handleVerifyFormFee(application.application_id, 'rejected')}
                      disabled={processing}
                    >
                      <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                      <span>Tolak Bukti Transfer</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bukti Transfer Box & Direct Inline Preview */}
              <div className="p-4 rounded-lg border space-y-3" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor }}>
                <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor }}>
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faEye} style={{ color: textSecondary }} className="text-xs" />
                    <h4 className="text-xs font-mono uppercase tracking-wider font-semibold" style={{ color: textPrimary }}>
                      Bukti Transfer Pembayaran
                    </h4>
                  </div>
                  {application.payment_proof_file && (
                    <a
                      href={`/api/admission/${application.application_id}/proof`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-mono text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <span>Buka Tab Baru</span>
                      <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[9px]" />
                    </a>
                  )}
                </div>

                {application.payment_proof_file ? (
                  <div className="space-y-2">
                    <div className="border rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 flex items-center justify-center p-2" style={{ borderColor }}>
                      <img
                        src={`/api/admission/${application.application_id}/proof`}
                        alt="Bukti Transfer"
                        className="max-h-64 object-contain rounded shadow-sm"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                    <p className="text-[11px] font-mono text-center" style={{ color: textSecondary }}>
                      Nama Berkas: <span className="font-semibold">{application.payment_proof_file}</span>
                    </p>
                  </div>
                ) : (
                  <div className="p-8 text-center" style={{ color: textSecondary }}>
                    <FontAwesomeIcon icon={faFileInvoice} className="text-2xl mb-2 opacity-40" />
                    <p className="text-xs font-mono">Orang tua belum mengunggah foto bukti transfer.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Email Action Box Step 2 */}
            <div className="p-4 rounded-lg border space-y-3" style={{ background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4', borderColor: isDark ? '#059669' : '#BBF7D0' }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5" style={{ color: isDark ? '#34D399' : '#059669' }}>
                    <FontAwesomeIcon icon={faEnvelope} />
                    Kirim Email Konfirmasi Formulir Terverifikasi (Lunas)
                  </h4>
                  <p className="text-xs mt-1" style={{ color: textSecondary }}>
                    Mengirimkan notifikasi resmi bahwa biaya pendaftaran sebesar {formatCurrency(application.form_fee_amount || 250000)} telah LUNAS & DIVERIFIKASI, serta mengarahkan orang tua untuk segera melengkapi formulir biodata dan menentukan jadwal tes di portal.
                  </p>
                  <p className="text-[11px] font-mono mt-1" style={{ color: textSecondary }}>
                    Status: {application.step2_email_sent_at ? `Terakhir dikirim: ${formatDateTime(application.step2_email_sent_at)}` : 'Belum pernah dikirim'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSendStepEmail(2, 'formFeeVerified')}
                  disabled={sendingEmailStep === 2 || !application.parent_email}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded text-white transition-all shadow-sm disabled:opacity-50"
                  style={{ background: isDark ? '#059669' : '#10B981' }}
                >
                  <FontAwesomeIcon icon={sendingEmailStep === 2 ? faSpinner : faPaperPlane} className={sendingEmailStep === 2 ? 'animate-spin' : ''} />
                  <span>{sendingEmailStep === 2 ? 'Mengirim...' : 'Kirim Email Formulir Lunas'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 5. TAB 3: BIODATA LENGKAP & JADWAL ─────────────────────────────── */}
        {modalTab === 'step3' && (
          <div className="space-y-4">
            {/* Sorotan Kehadiran & Pendampingan Orang Tua (Menjawab Permintaan User) */}
            <div 
              className="p-4 rounded-lg border"
              style={{
                background: isDark ? 'rgba(56, 189, 248, 0.08)' : '#F0F9FF',
                borderColor: isDark ? '#0284C7' : '#BAE6FD',
                borderRadius: '8px'
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: isDark ? '#0369A1' : '#E0F2FE', color: isDark ? '#38BDF8' : '#0284C7' }}>
                  <FontAwesomeIcon icon={faUser} className="text-xs" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: isDark ? '#38BDF8' : '#0369A1' }}>
                      Informasi Kehadiran & Pendampingan Saat Tes & Wawancara:
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border" style={{ background: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#0284C7' : '#BAE6FD', color: textSecondary }}>
                      Diinput oleh Orang Tua di Formulir Portal
                    </span>
                  </div>
                  <p className="text-sm font-semibold mt-1" style={{ color: textPrimary }}>
                    {scheduleInfoNotes ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                        &ldquo;{scheduleInfoNotes}&rdquo;
                      </span>
                    ) : (
                      <span className="text-xs italic text-gray-400 font-normal">
                        (Tidak ada catatan pendampingan khusus yang diisi oleh orang tua)
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] font-mono mt-1" style={{ color: textSecondary }}>
                    Orang Tua / Wali: <strong>{application.parent_name || '-'}</strong> ({application.parent_phone || '-'})
                  </p>
                </div>
              </div>
            </div>

            {/* Biodata Calon Siswa & Orang Tua */}
            <div className="p-4 rounded-lg border space-y-3" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor }}>
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor }}>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faUser} style={{ color: textSecondary }} className="text-xs" />
                  <h4 className="text-xs font-mono uppercase tracking-wider font-semibold" style={{ color: textPrimary }}>
                    Biodata Calon Siswa & Data Orang Tua
                  </h4>
                </div>
                {!isEditing ? (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ background: cardBg, borderColor, color: textPrimary, borderRadius: '6px' }}
                    onClick={handleStartEdit}
                  >
                    <FontAwesomeIcon icon={faEdit} className="text-xs" />
                    <span>Edit Biodata</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors"
                      style={{ background: isDark ? '#F4F4F5' : '#111111', color: isDark ? '#111111' : '#FFFFFF', borderRadius: '6px' }}
                      onClick={handleSaveEdit}
                      disabled={editSaving}
                    >
                      {editSaving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" /> : <FontAwesomeIcon icon={faSave} className="text-xs" />}
                      <span>{editSaving ? 'Menyimpan...' : 'Simpan Biodata'}</span>
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 text-xs border rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ background: 'none', borderColor, color: textSecondary, borderRadius: '6px' }}
                      onClick={() => setIsEditing(false)}
                      disabled={editSaving}
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                /* Edit Form In-place */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Nama Lengkap Siswa</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.student_name} onChange={(e) => setEditData(p => ({ ...p, student_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Nama Panggilan</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.student_nickname} onChange={(e) => setEditData(p => ({ ...p, student_nickname: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Jenis Kelamin</Label>
                    <select className="mt-1 w-full px-2.5 py-2 rounded-md focus:outline-none" style={selectStyle} value={editData.student_gender} onChange={(e) => setEditData(p => ({ ...p, student_gender: e.target.value }))}>
                      <option value="">Pilih Gender</option>
                      <option value="male">Laki-laki</option>
                      <option value="female">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Tempat Lahir</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.student_birth_place} onChange={(e) => setEditData(p => ({ ...p, student_birth_place: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Tanggal Lahir</Label>
                    <Input type="date" className="mt-1" style={inputStyle} value={editData.student_birth_date} onChange={(e) => setEditData(p => ({ ...p, student_birth_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Agama</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.student_religion} onChange={(e) => setEditData(p => ({ ...p, student_religion: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Asal Sekolah Sebelumnya</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.student_previous_school} onChange={(e) => setEditData(p => ({ ...p, student_previous_school: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Nama Lengkap Orang Tua</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.parent_name} onChange={(e) => setEditData(p => ({ ...p, parent_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>NIK KTP / Paspor Orang Tua</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.parent_nik} onChange={(e) => setEditData(p => ({ ...p, parent_nik: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Pekerjaan Orang Tua</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.parent_occupation} onChange={(e) => setEditData(p => ({ ...p, parent_occupation: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>WhatsApp Orang Tua</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.parent_phone} onChange={(e) => setEditData(p => ({ ...p, parent_phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Email Orang Tua</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.parent_email} onChange={(e) => setEditData(p => ({ ...p, parent_email: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2 md:col-span-3">
                    <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Alamat Domisili Siswa</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.student_domicile_address || editData.student_address} onChange={(e) => setEditData(p => ({ ...p, student_domicile_address: e.target.value }))} />
                  </div>
                </div>
              ) : (
                /* Read-Only View */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase block" style={{ color: textSecondary }}>Nama Lengkap Siswa:</span>
                    <span className="font-semibold" style={{ color: textPrimary }}>{application.student_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase block" style={{ color: textSecondary }}>Nama Panggilan:</span>
                    <span style={{ color: textPrimary }}>{application.student_nickname || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase block" style={{ color: textSecondary }}>Jenis Kelamin:</span>
                    <span style={{ color: textPrimary }}>{application.student_gender === 'male' ? 'Laki-laki' : (application.student_gender === 'female' ? 'Perempuan' : '-')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase block" style={{ color: textSecondary }}>Tempat / Tgl Lahir:</span>
                    <span style={{ color: textPrimary }}>{application.student_birth_place || '-'}, {application.student_birth_date ? formatDate(application.student_birth_date) : '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase block" style={{ color: textSecondary }}>Agama / Kewarganegaraan:</span>
                    <span style={{ color: textPrimary }}>{application.student_religion || '-'} / {application.student_nationality || 'WNI'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase block" style={{ color: textSecondary }}>Asal Sekolah:</span>
                    <span style={{ color: textPrimary }}>{application.student_previous_school || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase block" style={{ color: textSecondary }}>Nama Orang Tua / Wali:</span>
                    <span className="font-semibold" style={{ color: textPrimary }}>{application.parent_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase block" style={{ color: textSecondary }}>NIK Orang Tua:</span>
                    <span className="font-mono" style={{ color: textPrimary }}>{application.parent_nik || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase block" style={{ color: textSecondary }}>Pekerjaan Orang Tua:</span>
                    <span style={{ color: textPrimary }}>{application.parent_occupation || '-'}</span>
                  </div>
                  <div className="sm:col-span-2 md:col-span-3">
                    <span className="text-[10px] font-mono uppercase block" style={{ color: textSecondary }}>Alamat Domisili:</span>
                    <span style={{ color: textPrimary }}>{application.student_domicile_address || application.student_address || '-'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Pengaturan Jadwal Tes & Wawancara */}
            <div className="p-4 rounded-lg border space-y-3" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor }}>
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor }}>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCalendar} style={{ color: textSecondary }} className="text-xs" />
                  <h4 className="text-xs font-mono uppercase tracking-wider font-semibold" style={{ color: textPrimary }}>
                    Pengaturan Jadwal Tes Penempatan & Wawancara Orang Tua
                  </h4>
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sameDaySchedule}
                    onChange={(e) => setSameDaySchedule(e.target.checked)}
                    className="rounded accent-purple-600"
                  />
                  <span className="font-medium" style={{ color: textPrimary }}>Hari yang sama</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tes Siswa */}
                <div className="p-3 rounded border space-y-2.5" style={{ borderColor, background: cardBg }}>
                  <div className="font-semibold text-xs text-sky-600 dark:text-sky-400">
                    1. Tes Penempatan Calon Siswa
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Tanggal Tes</Label>
                      <Input
                        type="date"
                        className="mt-1"
                        style={inputStyle}
                        value={scheduleData.test_date}
                        onChange={(e) => {
                          const val = e.target.value;
                          setScheduleData(p => ({
                            ...p,
                            test_date: val,
                            interview_date: sameDaySchedule ? val : p.interview_date
                          }));
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Sesi Waktu</Label>
                      <select
                        className="mt-1 w-full px-2.5 py-2 rounded-md focus:outline-none"
                        style={selectStyle}
                        value={scheduleData.test_session}
                        onChange={(e) => {
                          const val = e.target.value;
                          setScheduleData(p => ({
                            ...p,
                            test_session: val,
                            interview_session: sameDaySchedule ? val : p.interview_session
                          }));
                        }}
                      >
                        <option value="Sesi 1 (08:30 - 10:00 WIB)">Sesi 1 (08:30 - 10:00 WIB)</option>
                        <option value="Sesi 2 (10:30 - 12:00 WIB)">Sesi 2 (10:30 - 12:00 WIB)</option>
                        <option value="Sesi 3 (13:00 - 14:30 WIB)">Sesi 3 (13:00 - 14:30 WIB)</option>
                        <option value="Sesi 4 (15:00 - 16:30 WIB)">Sesi 4 (15:00 - 16:30 WIB)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Wawancara Ortu */}
                <div className="p-3 rounded border space-y-2.5" style={{ borderColor, background: cardBg }}>
                  <div className="font-semibold text-xs text-purple-600 dark:text-purple-400">
                    2. Wawancara Orang Tua & Observasi
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Tanggal Wawancara</Label>
                      <Input
                        type="date"
                        className="mt-1"
                        style={inputStyle}
                        disabled={sameDaySchedule}
                        value={sameDaySchedule ? scheduleData.test_date : scheduleData.interview_date}
                        onChange={(e) => setScheduleData(p => ({ ...p, interview_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Sesi Waktu</Label>
                      <select
                        className="mt-1 w-full px-2.5 py-2 rounded-md focus:outline-none"
                        style={selectStyle}
                        value={sameDaySchedule ? scheduleData.test_session : scheduleData.interview_session}
                        onChange={(e) => setScheduleData(p => ({ ...p, interview_session: e.target.value }))}
                      >
                        <option value="Sesi 1 (08:30 - 10:00 WIB)">Sesi 1 (08:30 - 10:00 WIB)</option>
                        <option value="Sesi 2 (10:30 - 12:00 WIB)">Sesi 2 (10:30 - 12:00 WIB)</option>
                        <option value="Sesi 3 (13:00 - 14:30 WIB)">Sesi 3 (13:00 - 14:30 WIB)</option>
                        <option value="Sesi 4 (15:00 - 16:30 WIB)">Sesi 4 (15:00 - 16:30 WIB)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Catatan Jadwal & Pendampingan Calon Siswa</Label>
                <Input
                  className="mt-1"
                  style={inputStyle}
                  value={scheduleData.schedule_notes}
                  placeholder="Misal: Hadir didampingi ayah dan ibu"
                  onChange={(e) => setScheduleData(p => ({ ...p, schedule_notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded text-white transition-colors"
                  style={{ background: isDark ? '#7C3AED' : '#6D28D9' }}
                  onClick={handleSaveSchedule}
                  disabled={scheduleSaving}
                >
                  {scheduleSaving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" /> : <FontAwesomeIcon icon={faSave} className="text-xs" />}
                  <span>{scheduleSaving ? 'Menyimpan...' : 'Simpan Perubahan Jadwal'}</span>
                </button>
              </div>
            </div>

            {/* Email Action Box Step 3 */}
            <div className="p-4 rounded-lg border space-y-3" style={{ background: isDark ? 'rgba(124, 58, 237, 0.08)' : '#F5F3FF', borderColor: isDark ? '#7C3AED' : '#DDD6FE' }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5" style={{ color: isDark ? '#A78BFA' : '#7C3AED' }}>
                    <FontAwesomeIcon icon={faEnvelope} />
                    Kirim Email Konfirmasi Jadwal Tes & Wawancara Orang Tua
                  </h4>
                  <p className="text-xs mt-1" style={{ color: textSecondary }}>
                    Kirimkan jadwal tes tertulis calon siswa ({scheduleData.test_date ? formatDate(scheduleData.test_date) : 'Belum diset'}) dan wawancara orang tua lengkap beserta sesi jam, catatan pendampingan, serta alamat resmi Kampus CCS (Jl. Raya Gn. Anyar Sawah No.18, Surabaya).
                  </p>
                  <p className="text-[11px] font-mono mt-1" style={{ color: textSecondary }}>
                    Status: {application.step3_email_sent_at ? `Terakhir dikirim: ${formatDateTime(application.step3_email_sent_at)}` : 'Belum pernah dikirim'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSendStepEmail(3, 'placementTestSchedule')}
                  disabled={sendingEmailStep === 3 || !application.parent_email}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded text-white transition-all shadow-sm disabled:opacity-50"
                  style={{ background: isDark ? '#7C3AED' : '#6D28D9' }}
                >
                  <FontAwesomeIcon icon={sendingEmailStep === 3 ? faSpinner : faPaperPlane} className={sendingEmailStep === 3 ? 'animate-spin' : ''} />
                  <span>{sendingEmailStep === 3 ? 'Mengirim...' : 'Kirim Email Jadwal Tes'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 6. TAB 4: OBSERVASI & BIAYA PENDIDIKAN ────────────────────────── */}
        {modalTab === 'step4' && (
          <div className="space-y-4">
            {/* Sub-section Potongan & Diskon */}
            <div className="p-4 rounded-lg border space-y-3" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor }}>
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor }}>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faTag} style={{ color: textSecondary }} className="text-xs" />
                  <h4 className="text-xs font-mono uppercase tracking-wider font-semibold" style={{ color: textPrimary }}>
                    Potongan & Diskon Masuk (UDP & USEK)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAddDiscountTarget('udp');
                    setShowAddDiscount(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border rounded transition-colors"
                  style={{ background: cardBg, borderColor, color: textPrimary }}
                >
                  <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                  <span>Tambah Potongan</span>
                </button>
              </div>

              {/* Promo Code Highlight Banner */}
              {application.promo_code && (
                <div
                  className="p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  style={{
                    background: isDark ? 'rgba(147, 51, 234, 0.12)' : '#F5F3FF',
                    borderColor: isDark ? '#7E22CE' : '#DDD6FE'
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <FontAwesomeIcon icon={faTag} className="text-purple-600 dark:text-purple-400 mt-0.5 text-sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-purple-950 dark:text-purple-200">
                          Kupon Promosi Terklaim:
                        </span>
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-100 border border-purple-300 dark:border-purple-700">
                          {application.promo_code}
                        </span>
                      </div>
                      <p className="text-[11px] mt-0.5 text-purple-800 dark:text-purple-300">
                        {application.promo_details?.discount_name || 'Potongan Promosi Pendaftaran'} &bull; Nilai: <strong>{application.promo_details?.discount_type === 'percentage' ? `${application.promo_details?.discount_value}%` : formatCurrency(application.promo_details?.discount_value)}</strong> ({application.promo_details?.applies_to === 'udp' ? 'DPP' : application.promo_details?.applies_to === 'usek' ? 'SPP' : 'DPP & SPP'})
                      </p>
                    </div>
                  </div>

                  {application.promo_code && !discounts.some(d => (application.promo_discount_id && d.discount_id === application.promo_discount_id) || (d.discount?.discount_code && d.discount?.discount_code?.toUpperCase() === application.promo_code?.toUpperCase())) ? (
                    <button
                      type="button"
                      disabled={discountSaving}
                      onClick={() => handleAddDiscount(application.promo_discount_id, application.promo_details?.applies_to === 'usek' ? 'usek' : 'udp')}
                      className={`px-3 py-1.5 rounded text-xs font-bold text-white transition-all shadow-xs self-start sm:self-auto shrink-0 flex items-center gap-1.5 ${
                        discountSaving
                          ? 'bg-purple-400 cursor-not-allowed opacity-80'
                          : 'bg-purple-600 hover:bg-purple-700 active:scale-95'
                      }`}
                    >
                      <FontAwesomeIcon icon={discountSaving ? faSpinner : faCheck} className={`text-xs ${discountSaving ? 'animate-spin' : ''}`} />
                      <span>{discountSaving ? 'Menerapkan Kupon...' : 'Terapkan Kupon Pendaftar'}</span>
                    </button>
                  ) : application.promo_code ? (
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                      <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600 dark:text-emerald-400 text-xs" />
                      <span>Kupon Telah Diterapkan</span>
                    </span>
                  ) : null}
                </div>
              )}

              {/* Daftar Diskon Aktif */}
              {discounts.length > 0 ? (
                <div className="space-y-2">
                  {discounts.map((d) => (
                    <div
                      key={d.app_discount_id}
                      className="p-3 rounded-lg border flex items-center justify-between text-xs"
                      style={{ background: cardBg, borderColor }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold" style={{ color: textPrimary }}>{d.discount?.discount_name || d.discount?.discount_code}</span>
                          <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded border" style={{ borderColor, color: textSecondary }}>
                            {d.fee_target === 'udp' ? 'DPP / UDP' : 'SPP / USEK'}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono mt-0.5" style={{ color: textSecondary }}>
                          Nilai: {d.discount_type === 'percentage' ? `${d.discount_value}%` : formatCurrency(d.discount_value)} &bull; Potongan: <strong className="text-rose-600">-{formatCurrency(d.calculated_amount)}</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDiscount(d.app_discount_id, d.fee_target)}
                        className="p-1.5 text-rose-600 hover:opacity-80"
                        title="Hapus Potongan"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-center py-4" style={{ color: textSecondary }}>
                  Belum ada potongan diskon yang diterapkan untuk calon siswa ini.
                </p>
              )}

              {/* Dropdown Tambah Diskon */}
              {showAddDiscount && (
                <div className="p-3 rounded border space-y-2" style={{ background: cardBg, borderColor }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: textPrimary }}>Pilih Potongan Master:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={`px-2 py-0.5 text-[11px] font-mono rounded ${addDiscountTarget === 'udp' ? 'bg-sky-600 text-white' : 'border'}`}
                        onClick={() => setAddDiscountTarget('udp')}
                      >
                        UDP
                      </button>
                      <button
                        type="button"
                        className={`px-2 py-0.5 text-[11px] font-mono rounded ${addDiscountTarget === 'usek' ? 'bg-sky-600 text-white' : 'border'}`}
                        onClick={() => setAddDiscountTarget('usek')}
                      >
                        USEK
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddDiscount(false)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {masterDiscounts
                      .filter(m => m.applies_to === addDiscountTarget || m.applies_to === 'both')
                      .filter(m => !discounts.some(d => d.discount_id === m.discount_id && d.fee_target === addDiscountTarget))
                      .map(m => (
                        <button
                          key={m.discount_id}
                          type="button"
                          onClick={() => handleAddDiscount(m.discount_id, addDiscountTarget)}
                          className="w-full flex items-center justify-between p-2 rounded text-left border text-xs hover:bg-black/5 dark:hover:bg-white/5"
                          style={{ borderColor }}
                        >
                          <span>{m.discount_name}</span>
                          <span className="font-mono font-semibold">
                            {m.discount_type === 'percentage' ? `${m.discount_value}%` : formatCurrency(m.discount_value)}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sub-section Simulasi Cicilan Inhouse */}
            <div className="p-4 rounded-lg border space-y-3" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor }}>
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor }}>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCalculator} style={{ color: textSecondary }} className="text-xs" />
                  <h4 className="text-xs font-mono uppercase tracking-wider font-semibold" style={{ color: textPrimary }}>
                    Simulasi Skema Cicilan Inhouse
                  </h4>
                </div>
                {allInstallments.some(inst => inst.application_id === application.application_id) && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300">
                    Skema Tersimpan
                  </span>
                )}
              </div>

              {/* Param Config */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>UTJ / DP (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="mt-1 font-mono"
                    style={inputStyle}
                    value={installmentConfig.utj_percentage}
                    onChange={(e) => setInstallmentConfig(p => ({ ...p, utj_percentage: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Jumlah Bulan</Label>
                  <Input
                    type="number"
                    min={1}
                    max={36}
                    className="mt-1 font-mono"
                    style={inputStyle}
                    value={installmentConfig.num_installments}
                    onChange={(e) => setInstallmentConfig(p => ({ ...p, num_installments: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Mulai Bulan</Label>
                  <select
                    className="mt-1 w-full px-2.5 py-2 rounded-md focus:outline-none"
                    style={selectStyle}
                    value={installmentConfig.start_month}
                    onChange={(e) => setInstallmentConfig(p => ({ ...p, start_month: Number(e.target.value) }))}
                  >
                    {monthNames.map((m, idx) => (
                      <option key={idx} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Mulai Tahun</Label>
                  <Input
                    type="number"
                    className="mt-1 font-mono"
                    style={inputStyle}
                    value={installmentConfig.start_year}
                    onChange={(e) => setInstallmentConfig(p => ({ ...p, start_year: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* Tabel Jadwal Angsuran */}
              {(() => {
                const schedule = calculateInstallmentSchedule();
                if (!schedule) return null;
                return (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold" style={{ color: textPrimary }}>
                        Total Masuk: {formatCurrency(schedule.totalEntry)} (Termasuk UTJ {formatCurrency(schedule.utjAmount)})
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveInstallment}
                          disabled={installmentSaving}
                          className="px-3 py-1 text-xs rounded text-white bg-purple-600 hover:bg-purple-700 font-medium"
                        >
                          {installmentSaving ? 'Menyimpan...' : 'Simpan Skema'}
                        </button>
                        <button
                          type="button"
                          onClick={handlePrintInstallment}
                          className="px-2.5 py-1 text-xs rounded border hover:bg-black/5 dark:hover:bg-white/5"
                          style={{ borderColor, color: textPrimary }}
                          title="Download PDF Perjanjian"
                        >
                          <FontAwesomeIcon icon={faDownload} />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto border rounded divide-y text-xs font-mono" style={{ borderColor }}>
                      {schedule.items.map((item) => (
                        <div key={item.seq} className="px-3 py-1.5 flex justify-between items-center" style={{ background: item.seq === 1 ? (isDark ? '#27272A' : '#FEF3C7') : cardBg }}>
                          <div>
                            <span className="font-medium">{item.label}</span>
                            {item.info && <span className="text-[10px] text-amber-600 block">{item.info}</span>}
                          </div>
                          <span className="font-bold">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Email Action Box Step 4 */}
            <div className="p-4 rounded-lg border space-y-3" style={{ background: isDark ? 'rgba(139, 92, 246, 0.08)' : '#F5F3FF', borderColor: isDark ? '#8B5CF6' : '#DDD6FE' }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5" style={{ color: isDark ? '#A78BFA' : '#7C3AED' }}>
                    <FontAwesomeIcon icon={faEnvelope} />
                    Kirim Email Dokumen Perjanjian Cicilan (Lampiran PDF)
                  </h4>
                  <p className="text-xs mt-1" style={{ color: textSecondary }}>
                    Mengirimkan dokumen resmi perjanjian angsuran biaya pendidikan dalam format lampiran PDF resmi langsung ke email orang tua pendaftar.
                  </p>
                  <p className="text-[11px] font-mono mt-1" style={{ color: textSecondary }}>
                    Status: {application.step4_email_sent_at ? `Terakhir dikirim: ${formatDateTime(application.step4_email_sent_at)}` : 'Belum pernah dikirim'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEmailInstallment}
                  disabled={emailSending || !application.parent_email}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded text-white transition-all shadow-sm disabled:opacity-50"
                  style={{ background: isDark ? '#7C3AED' : '#6D28D9' }}
                >
                  <FontAwesomeIcon icon={emailSending ? faSpinner : faPaperPlane} className={emailSending ? 'animate-spin' : ''} />
                  <span>{emailSending ? 'Membuat PDF & Mengirim...' : 'Kirim Email Perjanjian (PDF)'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 7. TAB 5: HASIL SELEKSI ───────────────────────────────────────── */}
        {modalTab === 'step5' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border space-y-4" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor }}>
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor }}>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} style={{ color: textSecondary }} className="text-xs" />
                  <h4 className="text-xs font-mono uppercase tracking-wider font-semibold" style={{ color: textPrimary }}>
                    Penetapan Status Keputusan Penerimaan Siswa
                  </h4>
                </div>
                <span
                  className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider border"
                  style={
                    application.status === 'approved'
                      ? { background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#EDF3EC', color: isDark ? '#34D399' : '#346538', borderColor: isDark ? '#059669' : '#A7F3D0' }
                      : application.status === 'rejected'
                      ? { background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC', color: isDark ? '#F87171' : '#9F2F2D', borderColor: isDark ? '#DC2626' : '#FECACA' }
                      : application.status === 'under_review'
                      ? { background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF', color: isDark ? '#60A5FA' : '#1D4ED8', borderColor: isDark ? '#2563EB' : '#BFDBFE' }
                      : { background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FBF3DB', color: isDark ? '#FBBF24' : '#956400', borderColor: isDark ? '#D97706' : '#FDE68A' }
                  }
                >
                  Status: {statusLabels[application.status] || application.status}
                </span>
              </div>

              {/* Form Pilihan Keputusan */}
              <div className="space-y-3 text-xs">
                <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Pilih Hasil Keputusan</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className="p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all"
                    style={{
                      borderColor: actionType === 'approved' ? (isDark ? '#059669' : '#10B981') : borderColor,
                      background: actionType === 'approved' ? (isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5') : cardBg
                    }}
                  >
                    <input
                      type="radio"
                      name="decision_status"
                      value="approved"
                      checked={actionType === 'approved'}
                      onChange={() => setActionType('approved')}
                      className="accent-emerald-600"
                    />
                    <div>
                      <p className="font-bold text-emerald-700 dark:text-emerald-400">DITERIMA (APPROVED)</p>
                      <p className="text-[11px] text-gray-500">Siswa dinyatakan lulus seleksi dan diterima di CCS</p>
                    </div>
                  </label>

                  <label
                    className="p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all"
                    style={{
                      borderColor: actionType === 'rejected' ? (isDark ? '#DC2626' : '#EF4444') : borderColor,
                      background: actionType === 'rejected' ? (isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2') : cardBg
                    }}
                  >
                    <input
                      type="radio"
                      name="decision_status"
                      value="rejected"
                      checked={actionType === 'rejected'}
                      onChange={() => setActionType('rejected')}
                      className="accent-rose-600"
                    />
                    <div>
                      <p className="font-bold text-rose-700 dark:text-rose-400">DITOLAK (REJECTED)</p>
                      <p className="text-[11px] text-gray-500">Siswa belum dapat diterima pada tahun ajaran ini</p>
                    </div>
                  </label>
                </div>

                <div>
                  <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Catatan Panitia Penerimaan / Reviewer (Ditampilkan pada Surat Keputusan)</Label>
                  <textarea
                    rows={3}
                    className="mt-1 w-full px-3 py-2 rounded-md focus:outline-none"
                    style={inputStyle}
                    placeholder="Contoh: Selamat! Calon siswa menunjukkan hasil tes penempatan yang memuaskan."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleUpdateStatus}
                    disabled={processing}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded text-white transition-colors"
                    style={{ background: actionType === 'approved' ? (isDark ? '#059669' : '#10B981') : (isDark ? '#DC2626' : '#EF4444') }}
                  >
                    {processing ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" /> : <FontAwesomeIcon icon={faSave} className="text-xs" />}
                    <span>{processing ? 'Menyimpan...' : 'Simpan Status Keputusan'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Email Action Box Step 5 */}
            <div className="p-4 rounded-lg border space-y-3" style={{ background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4', borderColor: isDark ? '#059669' : '#BBF7D0' }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5" style={{ color: isDark ? '#34D399' : '#059669' }}>
                    <FontAwesomeIcon icon={faEnvelope} />
                    Kirim Email Surat Keputusan Hasil Seleksi (LoA)
                  </h4>
                  <p className="text-xs mt-1" style={{ color: textSecondary }}>
                    Kirimkan surat keputusan resmi (Letter of Acceptance jika Diterima, atau Surat Pemberitahuan jika Belum Diterima) langsung ke email orang tua.
                  </p>
                  <p className="text-[11px] font-mono mt-1" style={{ color: textSecondary }}>
                    Status: {application.step5_email_sent_at ? `Terakhir dikirim: ${formatDateTime(application.step5_email_sent_at)}` : 'Belum pernah dikirim'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendStepEmail(5, 'admissionApproved')}
                    disabled={sendingEmailStep === 5 || !application.parent_email}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded text-white transition-all shadow-sm disabled:opacity-50"
                    style={{ background: isDark ? '#059669' : '#10B981' }}
                  >
                    <FontAwesomeIcon icon={sendingEmailStep === 5 ? faSpinner : faPaperPlane} className={sendingEmailStep === 5 ? 'animate-spin' : ''} />
                    <span>Kirim Surat Diterima (LoA)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendStepEmail(5, 'admissionRejected')}
                    disabled={sendingEmailStep === 5 || !application.parent_email}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded text-white transition-all shadow-sm disabled:opacity-50"
                    style={{ background: isDark ? '#DC2626' : '#EF4444' }}
                  >
                    <FontAwesomeIcon icon={sendingEmailStep === 5 ? faSpinner : faPaperPlane} className={sendingEmailStep === 5 ? 'animate-spin' : ''} />
                    <span>Kirim Surat Ditolak</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 8. TAB 6: RIWAYAT EMAIL KHUSUS PENDAFTAR INI ─────────────────── */}
        {modalTab === 'email_logs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faHistory} style={{ color: textSecondary }} className="text-xs" />
                <h4 className="text-xs font-mono uppercase tracking-wider font-semibold" style={{ color: textPrimary }}>
                  Riwayat Korespondensi Email ({application.parent_email || 'Tanpa Email'})
                </h4>
              </div>
              {application.parent_email && (
                <button
                  type="button"
                  onClick={() => fetchLogsForApplicant(application.parent_email)}
                  disabled={detailLogsLoading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ borderColor, color: textPrimary }}
                >
                  <FontAwesomeIcon icon={faSync} className={detailLogsLoading ? 'animate-spin text-[10px]' : 'text-[10px]'} />
                  <span>Segarkan</span>
                </button>
              )}
            </div>

            {detailLogsLoading ? (
              <div className="p-8 text-center" style={{ color: textSecondary }}>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl mb-2" style={{ color: isDark ? '#60A5FA' : '#0284C7' }} />
                <p className="text-xs font-mono">Memuat riwayat pengiriman email...</p>
              </div>
            ) : detailApplicantLogs.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {detailApplicantLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: textPrimary }}>{getEmailTypeLabel(log.email_type)}</span>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border"
                          style={
                            log.status === 'delivered'
                              ? { background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#EDF3EC', color: isDark ? '#34D399' : '#346538', borderColor: isDark ? '#059669' : '#A7F3D0' }
                              : log.status === 'bounced' || log.status === 'failed'
                              ? { background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC', color: isDark ? '#F87171' : '#9F2F2D', borderColor: isDark ? '#DC2626' : '#FECACA' }
                              : { background: isDark ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE', color: isDark ? '#38BDF8' : '#0369A1', borderColor: isDark ? '#0284C7' : '#BAE6FD' }
                          }
                        >
                          {getEmailStatusLabel(log.status)}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono mt-0.5 truncate max-w-md" style={{ color: textSecondary }}>
                        Subjek: {log.subject}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 sm:self-center">
                      <span className="text-[11px] font-mono whitespace-nowrap" style={{ color: textSecondary }}>
                        {formatDateTime(log.created_at)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleResendPaymentEmail(application)}
                        disabled={resendingEmailId === application.application_id}
                        className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider border rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
                        style={{ borderColor, color: textPrimary }}
                        title="Kirim ulang email tagihan"
                      >
                        <FontAwesomeIcon icon={resendingEmailId === application.application_id ? faSpinner : faPaperPlane} className={resendingEmailId === application.application_id ? 'animate-spin' : ''} />
                        <span className="ml-1">Kirim Ulang</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-lg border" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor, color: textSecondary }}>
                <FontAwesomeIcon icon={faEnvelope} className="text-2xl mb-2 opacity-40" />
                <p className="text-xs font-mono">Belum ada riwayat email tercatat untuk pendaftar ini.</p>
              </div>
            )}
          </div>
        )}

        {/* ── 9. BOTTOM MODAL NAVIGATION & CLOSE FOOTER ────────────────────── */}
        <div className="flex items-center justify-between gap-2.5 pt-4 border-t" style={{ borderColor }}>
          <div className="flex items-center gap-2">
            {modalTab !== 'step1' && (
              <button
                type="button"
                onClick={() => {
                  const tabs = ['step1', 'step2', 'step3', 'step4', 'step5', 'email_logs'];
                  const curIdx = tabs.indexOf(modalTab);
                  if (curIdx > 0) setModalTab(tabs[curIdx - 1]);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor, color: textSecondary, borderRadius: '6px' }}
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                <span>Sebelumnya</span>
              </button>
            )}
            {modalTab !== 'email_logs' && (
              <button
                type="button"
                onClick={() => {
                  const tabs = ['step1', 'step2', 'step3', 'step4', 'step5', 'email_logs'];
                  const curIdx = tabs.indexOf(modalTab);
                  if (curIdx < tabs.length - 1) setModalTab(tabs[curIdx + 1]);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor, color: textPrimary, borderRadius: '6px' }}
              >
                <span>Berikutnya</span>
                <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
              </button>
            )}
          </div>

          <button
            type="button"
            className="px-4 py-1.5 text-xs font-mono uppercase tracking-wider border rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ borderColor, color: textSecondary, borderRadius: '6px' }}
            onClick={onClose}
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
}
