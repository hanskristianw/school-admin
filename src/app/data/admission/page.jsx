'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getCityList, getProvinceByCity } from '@/lib/cityProvinceData';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserGraduate,
  faSearch,
  faEye,
  faCheck,
  faTimes,
  faClock,
  faSpinner,
  faFilter,
  faPhone,
  faEnvelope,
  faSchool,
  faCalendar,
  faUser,
  faMapMarkerAlt,
  faBriefcase,
  faInfoCircle,
  faTag,
  faPlus,
  faTrash,
  faArrowUp,
  faArrowDown,
  faCalculator,
  faSave,
  faPercent,
  faMoneyBill,
  faDownload,
  faEdit,
  faFileInvoice,
  faPrint,
  faSync,
  faPaperPlane,
  faHistory
} from '@fortawesome/free-solid-svg-icons';

const statusConfig = {
  pending: {
    label: 'Menunggu Peninjauan',
    icon: faClock,
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800'
  },
  approved: {
    label: 'Diterima',
    icon: faCheck,
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800'
  },
  rejected: {
    label: 'Ditolak',
    icon: faTimes,
    color: 'text-rose-700 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
    borderColor: 'border-rose-200 dark:border-rose-800'
  }
};

const getEmailTypeLabel = (type) => {
  switch (type) {
    case 'payment_instruction': return 'Instruksi Pembayaran & Tagihan';
    case 'submission_confirmation': return 'Konfirmasi Pendaftaran';
    case 'form_fee_receipt': return 'Kuitansi Pembayaran Formulir';
    case 'installment_plan': return 'Perjanjian Skema Cicilan';
    default: return type ? type.replace(/_/g, ' ') : '-';
  }
};

const getEmailStatusLabel = (status) => {
  switch (status) {
    case 'delivered': return 'Terkirim';
    case 'sent': return 'Terkirim';
    case 'bounced': return 'Gagal Terkirim';
    case 'failed': return 'Gagal';
    case 'queued': return 'Dalam Antrean';
    case 'opened': return 'Telah Dibuka';
    case 'clicked': return 'Tautan Diklik';
    default: return status || '-';
  }
};


export default function AdmissionManagement() {
  const router = useRouter();
  const { t } = useI18n();
  const { isDark } = useTheme();

  // Minimalist UI styling tokens (matching /data/pyp)
  const pageBg = isDark ? '#09090B' : '#FBFBFA';
  const cardBg = isDark ? '#18181B' : '#FFFFFF';
  const borderColor = isDark ? '#27272A' : '#EAEAEA';
  const textPrimary = isDark ? '#F4F4F5' : '#111111';
  const textSecondary = isDark ? '#A1A1AA' : '#787774';

  const inputStyle = {
    background: isDark ? '#27272A' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '6px',
    fontSize: '13px'
  };

  const selectStyle = {
    background: isDark ? '#27272A' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '6px',
    fontSize: '13px',
    padding: '6px 10px'
  };

  const statusLabels = {
    pending: t('admission.status.pending'),
    approved: t('admission.status.approved'),
    rejected: t('admission.status.rejected'),
  };

  const statusPillStyles = {
    pending: {
      background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FBF3DB',
      borderColor: isDark ? '#D97706' : '#FDE68A',
      color: isDark ? '#FBBF24' : '#956400'
    },
    approved: {
      background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#EDF3EC',
      borderColor: isDark ? '#059669' : '#A7F3D0',
      color: isDark ? '#34D399' : '#346538'
    },
    rejected: {
      background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC',
      borderColor: isDark ? '#DC2626' : '#FECACA',
      color: isDark ? '#F87171' : '#9F2F2D'
    }
  };

  const [applications, setApplications] = useState([]);
  const [units, setUnits] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [levels, setLevels] = useState([]); // admission_level with unit info
  
  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [actionType, setActionType] = useState(''); // 'approved', 'rejected'
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editCitySearch, setEditCitySearch] = useState('');
  const [showEditCityDropdown, setShowEditCityDropdown] = useState(false);
  const allCities = getCityList();
  
  // Notification modal states
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Fee data for table display
  const [allUdpDefs, setAllUdpDefs] = useState([]);
  const [allUsekDefs, setAllUsekDefs] = useState([]);
  const [allAppDiscounts, setAllAppDiscounts] = useState([]);

  // Discount states
  const [discounts, setDiscounts] = useState([]); // applied discounts for selected application
  const [masterDiscounts, setMasterDiscounts] = useState([]); // available fee_discount records
  const [udpDef, setUdpDef] = useState(null); // UDP definition for the application's unit+year
  const [usekDef, setUsekDef] = useState(null); // USEK definition
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountSaving, setDiscountSaving] = useState(false);
  const [showAddDiscount, setShowAddDiscount] = useState(false);
  const [addDiscountTarget, setAddDiscountTarget] = useState('udp'); // 'udp' or 'usek'

  // Installment states
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [installmentLoading, setInstallmentLoading] = useState(false);
  const [installmentSaving, setInstallmentSaving] = useState(false);
  const [allInstallments, setAllInstallments] = useState([]);
  const [installmentConfig, setInstallmentConfig] = useState({
    utj_percentage: 30,
    num_installments: 11,
    start_month: 7,
    start_year: new Date().getFullYear(),
    notes: ''
  });

  // Email Logs & Tab states
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' | 'email_logs'
  const [emailLogs, setEmailLogs] = useState([]);
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);
  const [emailLogSearch, setEmailLogSearch] = useState('');
  const [resendingEmailId, setResendingEmailId] = useState(null);
  const [detailApplicantLogs, setDetailApplicantLogs] = useState([]);
  const [detailLogsLoading, setDetailLogsLoading] = useState(false);

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // Format currency helper
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showNotification = (title, message, type = 'success') => {
    setNotification({ isOpen: true, title, message, type });
  };

  // ---- Discount Functions ----
  const fetchDiscountsForApplication = async (application) => {
    if (!application) return;
    setDiscountLoading(true);
    try {
      // 1. Fetch applied discounts
      const { data: appDiscounts, error: adErr } = await supabase
        .from('application_discount')
        .select('*, discount:discount_id(discount_id, discount_code, discount_name, discount_type, discount_value, applies_to)')
        .eq('application_id', application.application_id)
        .order('fee_target')
        .order('seq');
      if (adErr) throw adErr;
      setDiscounts(appDiscounts || []);

      // 2. Fetch master discounts matching this application's level (or unit-wide)
      const { data: masters, error: mErr } = await supabase
        .from('fee_discount')
        .select('*')
        .eq('unit_id', application.unit_id)
        .eq('year_id', application.year_id)
        .eq('is_active', true);
      if (mErr) throw mErr;
      // Filter: show discounts that match this level, or have no level (unit-wide)
      const filtered = (masters || []).filter(m =>
        !m.level_id || m.level_id === application.level_id
      );
      setMasterDiscounts(filtered);

      // 3. Fetch UDP definition (match by level, year, period, category)
      let matchedUdp = null;
      if (application.level_id) {
        const { data: udpList } = await supabase
          .from('udp_definition')
          .select('*')
          .eq('level_id', application.level_id)
          .eq('year_id', application.year_id)
          .eq('is_active', true)
          .eq('student_category', 'eksternal')
          .order('effective_from');
        const appDate = application.created_at ? application.created_at.slice(0, 10) : null;
        if (udpList && udpList.length > 0) {
          // Match by application date within period
          if (appDate) {
            matchedUdp = udpList.find(u => u.effective_from && u.effective_until && appDate >= u.effective_from && appDate <= u.effective_until);
          }
          if (!matchedUdp) matchedUdp = udpList[0]; // fallback to first
        }
      } else {
        const { data: udp } = await supabase
          .from('udp_definition')
          .select('*')
          .eq('unit_id', application.unit_id)
          .eq('year_id', application.year_id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        matchedUdp = udp;
      }
      setUdpDef(matchedUdp || null);

      // 4. Fetch USEK definition (by level_id if available, fallback to unit_id)
      let usekQuery = supabase.from('school_fee_definition').select('*').eq('year_id', application.year_id).eq('is_active', true);
      if (application.level_id) {
        usekQuery = usekQuery.eq('level_id', application.level_id);
      } else {
        usekQuery = usekQuery.eq('unit_id', application.unit_id);
      }
      const { data: usek } = await usekQuery.maybeSingle();
      setUsekDef(usek || null);

    } catch (err) {
      console.error('Error fetching discounts:', err);
    } finally {
      setDiscountLoading(false);
    }
  };

  const getBaseAmount = (feeTarget) => {
    if (feeTarget === 'udp') return udpDef?.total_amount || 0;
    if (feeTarget === 'usek') return usekDef?.default_amount || 0;
    return 0;
  };

  const calculateDiscounts = (discountList, feeTarget) => {
    const base = getBaseAmount(feeTarget);
    let subtotal = base;
    return discountList
      .filter(d => d.fee_target === feeTarget)
      .sort((a, b) => a.seq - b.seq)
      .map(d => {
        const before = subtotal;
        let amount = 0;
        if (d.value_type === 'percentage') {
          amount = Math.round(before * (d.value / 100));
        } else {
          amount = Math.min(d.value, before);
        }
        subtotal = Math.max(0, before - amount);
        return { ...d, base_before: before, calculated_amount: amount, subtotal_after: subtotal };
      });
  };

  const handleAddDiscount = async (discountId, feeTarget) => {
    if (!selectedApplication) return;
    const master = masterDiscounts.find(m => m.discount_id === parseInt(discountId));
    if (!master) return;

    const existing = discounts.filter(d => d.fee_target === feeTarget);
    const nextSeq = existing.length > 0 ? Math.max(...existing.map(d => d.seq)) + 1 : 1;

    // Check if already added
    if (existing.some(d => d.discount_id === master.discount_id)) {
      showNotification('Peringatan', 'Diskon ini sudah ditambahkan', 'error');
      return;
    }

    setDiscountSaving(true);
    try {
      const calcList = [...discounts, {
        fee_target: feeTarget,
        seq: nextSeq,
        value_type: master.discount_type,
        value: master.discount_value,
        discount_id: master.discount_id
      }];
      const calculated = calculateDiscounts(calcList, feeTarget);
      const thisCalc = calculated.find(c => c.seq === nextSeq);

      const { data, error } = await supabase
        .from('application_discount')
        .insert({
          application_id: selectedApplication.application_id,
          discount_id: master.discount_id,
          fee_target: feeTarget,
          seq: nextSeq,
          value_type: master.discount_type,
          value: master.discount_value,
          base_before: thisCalc?.base_before || 0,
          calculated_amount: thisCalc?.calculated_amount || 0,
          subtotal_after: thisCalc?.subtotal_after || 0,
        })
        .select('*, discount:discount_id(discount_id, discount_code, discount_name, discount_type, discount_value, applies_to)')
        .single();
      if (error) throw error;
      
      // Refresh all discounts and recalculate
      await fetchDiscountsForApplication(selectedApplication);
      setShowAddDiscount(false);
      showNotification('Berhasil', 'Potongan berhasil ditambahkan', 'success');
    } catch (err) {
      console.error('Error adding discount:', err);
      showNotification('Error', 'Gagal menambah potongan: ' + err.message, 'error');
    } finally {
      setDiscountSaving(false);
    }
  };

  const handleRemoveDiscount = async (appDiscountId, feeTarget) => {
    setDiscountSaving(true);
    try {
      const { error } = await supabase
        .from('application_discount')
        .delete()
        .eq('app_discount_id', appDiscountId);
      if (error) throw error;

      // Re-sequence remaining discounts
      const remaining = discounts
        .filter(d => d.app_discount_id !== appDiscountId && d.fee_target === feeTarget)
        .sort((a, b) => a.seq - b.seq);
      
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].seq !== i + 1) {
          await supabase
            .from('application_discount')
            .update({ seq: i + 1 })
            .eq('app_discount_id', remaining[i].app_discount_id);
        }
      }

      await recalculateAndSave(feeTarget);
      await fetchDiscountsForApplication(selectedApplication);
      showNotification('Berhasil', 'Potongan berhasil dihapus', 'success');
    } catch (err) {
      console.error('Error removing discount:', err);
      showNotification('Error', 'Gagal menghapus potongan: ' + err.message, 'error');
    } finally {
      setDiscountSaving(false);
    }
  };

  const handleMoveDiscount = async (appDiscountId, feeTarget, direction) => {
    const targetDiscounts = discounts
      .filter(d => d.fee_target === feeTarget)
      .sort((a, b) => a.seq - b.seq);
    
    const idx = targetDiscounts.findIndex(d => d.app_discount_id === appDiscountId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === targetDiscounts.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const currentItem = targetDiscounts[idx];
    const swapItem = targetDiscounts[swapIdx];

    setDiscountSaving(true);
    try {
      // Swap seq values
      await supabase
        .from('application_discount')
        .update({ seq: 9999 }) // temp to avoid unique constraint
        .eq('app_discount_id', currentItem.app_discount_id);
      
      await supabase
        .from('application_discount')
        .update({ seq: currentItem.seq })
        .eq('app_discount_id', swapItem.app_discount_id);

      await supabase
        .from('application_discount')
        .update({ seq: swapItem.seq })
        .eq('app_discount_id', currentItem.app_discount_id);

      await recalculateAndSave(feeTarget);
      await fetchDiscountsForApplication(selectedApplication);
    } catch (err) {
      console.error('Error reordering:', err);
      showNotification('Error', 'Gagal mengubah urutan: ' + err.message, 'error');
    } finally {
      setDiscountSaving(false);
    }
  };

  const recalculateAndSave = async (feeTarget) => {
    // Fetch fresh data
    const { data: fresh } = await supabase
      .from('application_discount')
      .select('*')
      .eq('application_id', selectedApplication.application_id)
      .eq('fee_target', feeTarget)
      .order('seq');

    if (!fresh || fresh.length === 0) return;

    const calculated = calculateDiscounts(fresh, feeTarget);
    for (const calc of calculated) {
      await supabase
        .from('application_discount')
        .update({
          base_before: calc.base_before,
          calculated_amount: calc.calculated_amount,
          subtotal_after: calc.subtotal_after,
        })
        .eq('app_discount_id', calc.app_discount_id);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch applications with related data
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('student_applications')
        .select(`
          *,
          unit:unit_id(unit_id, unit_name),
          level:level_id(level_id, level_name, level_order, unit_id),
          year:year_id(year_id, year_name),
          reviewer:reviewed_by(user_id, user_nama_depan, user_nama_belakang)
        `)
        .order('created_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      // Fetch units for filter (kept for backward compat)
      const { data: unitsData, error: unitsError } = await supabase
        .from('unit')
        .select('unit_id, unit_name')
        .eq('is_school', true)
        .order('unit_name');

      if (unitsError) throw unitsError;

      // Fetch admission levels
      const { data: levelsData } = await supabase
        .from('admission_level')
        .select('level_id, level_name, level_order, unit_id, unit:unit_id(unit_id, unit_name)')
        .eq('is_active', true)
        .order('level_order');
      setLevels(levelsData || []);

      // Fetch years for filter
      const { data: yearsData, error: yearsError } = await supabase
        .from('year')
        .select('year_id, year_name')
        .order('year_name', { ascending: false });

      if (yearsError) throw yearsError;

      setApplications(applicationsData || []);
      setUnits(unitsData || []);
      setYears(yearsData || []);

      // Fetch all UDP definitions
      const { data: udpData } = await supabase
        .from('udp_definition')
        .select('*')
        .eq('is_active', true);
      setAllUdpDefs(udpData || []);

      // Fetch all USEK definitions
      const { data: usekData } = await supabase
        .from('school_fee_definition')
        .select('*')
        .eq('is_active', true);
      setAllUsekDefs(usekData || []);

      // Fetch all application discounts
      const { data: appDiscData } = await supabase
        .from('application_discount')
        .select('*, discount:discount_id(discount_name, discount_code)')
        .order('fee_target')
        .order('seq');
      setAllAppDiscounts(appDiscData || []);

      // Fetch all application installments
      const { data: installData } = await supabase
        .from('application_installment')
        .select('*');
      setAllInstallments(installData || []);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Gagal memuat data: ' + err.message);
      showNotification('Error', 'Gagal memuat data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailLogs = async (search = '') => {
    setEmailLogsLoading(true);
    try {
      const url = `/api/email/admission/logs${search ? `?search=${encodeURIComponent(search)}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setEmailLogs(json.data || []);
      } else {
        console.warn('Gagal memuat log email:', json.message);
      }
    } catch (err) {
      console.error('Error fetching email logs:', err);
    } finally {
      setEmailLogsLoading(false);
    }
  };

  const fetchLogsForApplicant = async (email) => {
    if (!email) {
      setDetailApplicantLogs([]);
      return;
    }
    setDetailLogsLoading(true);
    try {
      const res = await fetch(`/api/email/admission/logs?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      if (json.success) {
        setDetailApplicantLogs(json.data || []);
      } else {
        setDetailApplicantLogs([]);
      }
    } catch (err) {
      console.error('Error fetching logs for applicant:', err);
      setDetailApplicantLogs([]);
    } finally {
      setDetailLogsLoading(false);
    }
  };

  const handleResendPaymentEmail = async (app) => {
    if (!app || !app.parent_email) {
      showNotification('Peringatan', 'Pendaftar ini belum memiliki alamat email orang tua yang terdaftar.', 'error');
      return;
    }
    setResendingEmailId(app.application_id);
    try {
      const res = await fetch('/api/email/admission/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: app.application_id,
          type: 'payment_instruction'
        })
      });
      const json = await res.json();
      if (json.success) {
        showNotification('Berhasil', json.message || `Email tagihan berhasil dikirim ulang ke ${app.parent_email}`, 'success');
        if (selectedApplication && selectedApplication.application_id === app.application_id) {
          fetchLogsForApplicant(app.parent_email);
        }
        if (activeTab === 'email_logs') {
          fetchEmailLogs(emailLogSearch);
        }
      } else {
        showNotification('Gagal', json.message || 'Gagal mengirim ulang email', 'error');
      }
    } catch (err) {
      console.error('Error resending payment email:', err);
      showNotification('Error', 'Gagal mengirim email: ' + err.message, 'error');
    } finally {
      setResendingEmailId(null);
    }
  };

  const handleViewDetail = (application) => {
    setSelectedApplication(application);
    setShowDetailModal(true);
    setIsEditing(false);
    fetchDiscountsForApplication(application);
    if (application?.parent_email) {
      fetchLogsForApplicant(application.parent_email);
    } else {
      setDetailApplicantLogs([]);
    }
  };

  const handleStartEdit = () => {
    const app = selectedApplication;
    setEditData({
      student_name: app.student_name || '',
      student_nickname: app.student_nickname || '',
      student_gender: app.student_gender || '',
      student_birth_place: app.student_birth_place || '',
      student_birth_date: app.student_birth_date || '',
      student_religion: app.student_religion || '',
      student_nationality: app.student_nationality || '',
      student_address: app.student_address || '',
      student_domicile_address: app.student_domicile_address || '',
      student_city: app.student_city || '',
      student_province: app.student_province || '',
      student_postal_code: app.student_postal_code || '',
      student_previous_school: app.student_previous_school || '',
      parent_nik: app.parent_nik || '',
      parent_name: app.parent_name || '',
      parent_phone: app.parent_phone || '',
      parent_email: app.parent_email || '',
      parent_occupation: app.parent_occupation || '',
      parent_address: app.parent_address || '',
    });
    setEditCitySearch(app.student_city || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedApplication || !editData.student_name?.trim() || !editData.parent_name?.trim()) {
      showNotification('Peringatan', 'Nama siswa dan nama orang tua wajib diisi', 'error');
      return;
    }
    setEditSaving(true);
    try {
      const updatePayload = {
        student_name: editData.student_name.trim(),
        student_nickname: editData.student_nickname.trim() || null,
        student_gender: editData.student_gender || null,
        student_birth_place: editData.student_birth_place.trim() || null,
        student_birth_date: editData.student_birth_date || null,
        student_religion: editData.student_religion.trim() || null,
        student_nationality: editData.student_nationality.trim() || null,
        student_address: editData.student_address.trim() || null,
        student_domicile_address: editData.student_domicile_address.trim() || null,
        student_city: editData.student_city.trim() || null,
        student_province: editData.student_province.trim() || null,
        student_postal_code: editData.student_postal_code.trim() || null,
        student_previous_school: editData.student_previous_school.trim() || null,
        parent_nik: editData.parent_nik.trim() || null,
        parent_name: editData.parent_name.trim(),
        parent_phone: editData.parent_phone.trim() || null,
        parent_email: editData.parent_email.trim() || null,
        parent_occupation: editData.parent_occupation.trim() || null,
        parent_address: editData.parent_address.trim() || null,
      };
      const { error } = await supabase
        .from('student_applications')
        .update(updatePayload)
        .eq('application_id', selectedApplication.application_id);
      if (error) throw error;

      // Update local state
      const updated = { ...selectedApplication, ...updatePayload };
      setSelectedApplication(updated);
      setApplications(prev => prev.map(a => a.application_id === updated.application_id ? { ...a, ...updatePayload } : a));
      setIsEditing(false);
      showNotification('Berhasil', 'Data pendaftaran berhasil diperbarui', 'success');
    } catch (err) {
      console.error('Error saving edit:', err);
      showNotification('Error', 'Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleActionClick = (application, action) => {
    setSelectedApplication(application);
    setActionType(action);
    setAdminNotes(application.admin_notes || '');
    setShowActionModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedApplication || !actionType) return;

    try {
      setProcessing(true);

      // Get current user ID from localStorage
      const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
      const reviewerId = userData.userID;

      const updateData = {
        status: actionType,
        admin_notes: adminNotes.trim() || null,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('student_applications')
        .update(updateData)
        .eq('application_id', selectedApplication.application_id);

      if (error) throw error;

      // Update local state
      setApplications(applications.map(app => 
        app.application_id === selectedApplication.application_id
          ? { ...app, ...updateData }
          : app
      ));

      const actionLabels = {
        approved: 'disetujui',
        rejected: 'ditolak'
      };

      showNotification('Berhasil', `Pendaftaran ${selectedApplication.application_number} berhasil ${actionLabels[actionType]}`, 'success');

      // Send WhatsApp notification to parent based on status change
      const waTemplateMap = {
        approved: 'admissionApproved',
        rejected: 'admissionRejected'
      };
      const waType = waTemplateMap[actionType];
      if (waType && selectedApplication.parent_phone) {
        try {
          await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: waType,
              parentName: selectedApplication.parent_name,
              studentName: selectedApplication.student_name,
              applicationNumber: selectedApplication.application_number,
              phone: selectedApplication.parent_phone
            })
          });
        } catch (waErr) {
          console.warn('WhatsApp notification failed:', waErr);
        }
      }

      // Send email notification if parent has email on file
      if (waType && selectedApplication.parent_email) {
        try {
          await fetch('/api/email/admission', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: waType,
              parentName: selectedApplication.parent_name,
              studentName: selectedApplication.student_name,
              applicationNumber: selectedApplication.application_number,
              email: selectedApplication.parent_email
            })
          });
        } catch (emailErr) {
          console.warn('Email notification failed:', emailErr);
        }
      }
      setShowActionModal(false);
      setSelectedApplication(null);
      setActionType('');
      setAdminNotes('');

      // Refresh data
      fetchData();

    } catch (err) {
      console.error('Error updating status:', err);
      showNotification('Error', 'Gagal mengubah status: ' + err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyFormFee = async (applicationId, newStatus) => {
    try {
      setProcessing(true);
      const updateData = {
        form_fee_status: newStatus,
        verified_at: newStatus === 'verified' ? new Date().toISOString() : null,
      };
      const { error } = await supabase
        .from('student_applications')
        .update(updateData)
        .eq('application_id', applicationId);
      if (error) throw error;

      if (selectedApplication && selectedApplication.application_id === applicationId) {
        setSelectedApplication({ ...selectedApplication, ...updateData });
      }
      setApplications(prev => prev.map(a => a.application_id === applicationId ? { ...a, ...updateData } : a));
      showNotification('Berhasil', `Status pembayaran formulir berhasil diubah menjadi ${newStatus === 'verified' ? 'Disetujui' : 'Ditolak'}`, 'success');
    } catch (err) {
      console.error('Error verifying form fee:', err);
      showNotification('Error', 'Gagal memverifikasi formulir: ' + err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ---- Installment Functions ----
  const handleOpenInstallment = async (app) => {
    setSelectedApplication(app);
    setInstallmentLoading(true);
    setShowInstallmentModal(true);

    try {
      // Check for existing plan
      const { data: existing } = await supabase
        .from('application_installment')
        .select('*')
        .eq('application_id', app.application_id)
        .maybeSingle();

      if (existing) {
        setInstallmentConfig({
          utj_percentage: parseFloat(existing.utj_percentage) || 30,
          num_installments: existing.num_installments || 11,
          start_month: existing.start_month || 7,
          start_year: existing.start_year || new Date().getFullYear(),
          notes: existing.notes || ''
        });
      } else {
        setInstallmentConfig({
          utj_percentage: 30,
          num_installments: 11,
          start_month: 7,
          start_year: new Date().getFullYear(),
          notes: ''
        });
      }
    } catch (err) {
      console.error('Error loading installment:', err);
    } finally {
      setInstallmentLoading(false);
    }
  };

  const calculateInstallmentSchedule = () => {
    if (!selectedApplication) return null;
    const feeInfo = getAppFeeInfo(selectedApplication);
    const udpFinal = feeInfo.udpFinal || 0;
    const sppFinal = feeInfo.usekFinal || 0;
    const totalEntry = udpFinal + sppFinal;
    const utjAmount = Math.round(totalEntry * installmentConfig.utj_percentage / 100);
    const remaining = totalEntry - utjAmount;
    const numInst = installmentConfig.num_installments;
    const monthlyAmount = Math.round(remaining / numInst / 1000) * 1000;
    const lastMonthAmount = remaining - (monthlyAmount * (numInst - 1));

    const items = [];

    // Monthly installments — UTJ is included in Cicilan 1
    for (let i = 0; i < numInst; i++) {
      const mIdx = (installmentConfig.start_month - 1 + i) % 12;
      const yVal = installmentConfig.start_year + Math.floor((installmentConfig.start_month - 1 + i) / 12);
      const baseAmt = i === numInst - 1 ? lastMonthAmount : monthlyAmount;
      const isFirst = i === 0;
      const amt = isFirst ? baseAmt + utjAmount : baseAmt;
      items.push({
        seq: i + 1,
        label: `Cicilan ${i + 1} (${monthNames[mIdx]} ${yVal})`,
        info: isFirst ? `Termasuk UTJ ${formatCurrency(utjAmount)} (${installmentConfig.utj_percentage}% dari ${formatCurrency(totalEntry)})` : null,
        month: mIdx + 1,
        year: yVal,
        amount: amt,
        utjIncluded: isFirst ? utjAmount : 0,
        baseInstallment: baseAmt
      });
    }

    return { udpFinal, sppFinal, totalEntry, utjAmount, remaining, numInst, monthlyAmount, lastMonthAmount, items };
  };

  const handleSaveInstallment = async () => {
    const calc = calculateInstallmentSchedule();
    if (!calc || !selectedApplication) return;

    setInstallmentSaving(true);
    try {
      const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
      const record = {
        application_id: selectedApplication.application_id,
        udp_amount: calc.udpFinal,
        spp_first_amount: calc.sppFinal,
        total_entry_cost: calc.totalEntry,
        utj_percentage: installmentConfig.utj_percentage,
        utj_amount: calc.utjAmount,
        remaining_amount: calc.remaining,
        num_installments: calc.numInst,
        monthly_installment: calc.monthlyAmount,
        start_month: installmentConfig.start_month,
        start_year: installmentConfig.start_year,
        notes: installmentConfig.notes?.trim() || null,
        created_by: userData.user_id || userData.userID || null
      };

      const { error } = await supabase
        .from('application_installment')
        .upsert(record, { onConflict: 'application_id' });
      if (error) throw error;

      // Refresh installments
      const { data: freshInst } = await supabase
        .from('application_installment')
        .select('*');
      setAllInstallments(freshInst || []);

      showNotification('Berhasil', 'Skema cicilan berhasil disimpan', 'success');
    } catch (err) {
      console.error('Error saving installment:', err);
      showNotification('Error', 'Gagal menyimpan skema cicilan: ' + err.message, 'error');
    } finally {
      setInstallmentSaving(false);
    }
  };

  const handleDeleteInstallment = async () => {
    if (!selectedApplication) return;
    setInstallmentSaving(true);
    try {
      const { error } = await supabase
        .from('application_installment')
        .delete()
        .eq('application_id', selectedApplication.application_id);
      if (error) throw error;

      const { data: freshInst } = await supabase
        .from('application_installment')
        .select('*');
      setAllInstallments(freshInst || []);

      setInstallmentConfig({
        utj_percentage: 30,
        num_installments: 11,
        start_month: 7,
        start_year: new Date().getFullYear(),
        notes: ''
      });

      showNotification('Berhasil', 'Skema cicilan berhasil dihapus', 'success');
    } catch (err) {
      console.error('Error deleting installment:', err);
      showNotification('Error', 'Gagal menghapus skema cicilan: ' + err.message, 'error');
    } finally {
      setInstallmentSaving(false);
    }
  };

  // Generate installment agreement PDF (returns jsPDF doc)
  const generateInstallmentPDF = async () => {
    if (!selectedApplication) return null;
    const calc = calculateInstallmentSchedule();
    if (!calc) return null;

    const app = selectedApplication;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const marginL = 20;
    const marginR = 20;
    const contentW = pageW - marginL - marginR;
    let y = 15;

    // Helper
    const fmtIDR = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);
    const centerText = (text, yPos, size = 12) => {
      doc.setFontSize(size);
      doc.text(text, pageW / 2, yPos, { align: 'center' });
    };

    // ===== LOGO =====
    try {
      const logoImg = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Logo not found'));
        img.src = '/images/login-logo.png';
      });
      // Non-square logo: compute proportional size, max height 18mm
      const maxH = 18;
      const ratio = logoImg.width / logoImg.height;
      const imgH = maxH;
      const imgW = imgH * ratio;
      doc.addImage(logoImg, 'PNG', (pageW - imgW) / 2, y, imgW, imgH);
      y += imgH + 8;
    } catch {
      // If logo fails to load, just skip and continue
      y += 4;
    }

    // ===== HEADER =====
    doc.setFont('helvetica', 'bold');
    centerText('CHUNG CHUNG CHRISTIAN SCHOOL', y, 16);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const addrLine1 = 'Jl. Raya Gn. Anyar Sawah No.18, Gn. Anyar, Kec. Gn. Anyar';
    const addrLine2 = 'Surabaya, Jawa Timur 60294';
    centerText(addrLine1, y, 8);
    y += 4;
    centerText(addrLine2, y, 8);
    y += 4;
    centerText('Telp: (031) 5017171 | Email: info@ccs.sch.id', y, 8);
    y += 4;

    // Line
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.8);
    doc.line(marginL, y, pageW - marginR, y);
    y += 2;
    doc.setLineWidth(0.3);
    doc.line(marginL, y, pageW - marginR, y);
    y += 8;

    // ===== TITLE =====
    doc.setFont('helvetica', 'bold');
    centerText('SURAT PERJANJIAN PEMBAYARAN', y, 14);
    y += 6;
    centerText('BIAYA PENDIDIKAN', y, 14);
    y += 5;

    // Document number & date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    centerText(`No. Ref: ${app.application_number} | Tanggal: ${today}`, y, 9);
    y += 10;

    // ===== PARTIES =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Yang bertanda tangan di bawah ini:', marginL, y);
    y += 7;

    // School party
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PIHAK PERTAMA', marginL, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const party1 = [
      ['Nama', ': Chung Chung Christian School'],
      ['Alamat', ': Jl. Raya Gn. Anyar Sawah No.18, Surabaya']
    ];
    party1.forEach(([label, val]) => {
      doc.text(label, marginL + 4, y);
      doc.text(val, marginL + 45, y);
      y += 4.5;
    });
    y += 4;

    // Parent party
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PIHAK KEDUA', marginL, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const party2 = [
      ['Nama Orang Tua', `: ${app.parent_name || '-'}`],
      ['No. Telepon', `: ${app.parent_phone || '-'}`],
      ['Nama Siswa', `: ${app.student_name || '-'}`],
      ['Jenjang', `: ${app.level?.level_name || app.unit?.unit_name || '-'}`],
      ['Tahun Ajaran', `: ${app.year?.year_name || '-'}`]
    ];
    party2.forEach(([label, val]) => {
      doc.text(label, marginL + 4, y);
      doc.text(val, marginL + 45, y);
      y += 4.5;
    });
    y += 6;

    // ===== AGREEMENT CONTENT =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Kedua belah pihak sepakat atas hal-hal sebagai berikut:', marginL, y);
    y += 8;

    // 1. Rincian Biaya
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1. Rincian Biaya Masuk', marginL, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: marginL, right: marginR },
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { halign: 'left', cellWidth: 90 },
        1: { halign: 'right', cellWidth: contentW - 90 }
      },
      head: [['Komponen', 'Jumlah']],
      body: [
        ['Uang Daftar / Pangkal (UDP)', fmtIDR(calc.udpFinal)],
        ['SPP Bulan Pertama', fmtIDR(calc.sppFinal)],
        [{ content: 'TOTAL BIAYA MASUK', styles: { fontStyle: 'bold' } }, { content: fmtIDR(calc.totalEntry), styles: { fontStyle: 'bold' } }]
      ]
    });
    y = doc.lastAutoTable.finalY + 8;

    // 2. Skema Cicilan Inhouse
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('2. Skema Cicilan Inhouse', marginL, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const skemaText = `Pihak Kedua setuju untuk membayar total biaya masuk sebesar ${fmtIDR(calc.totalEntry)} dengan skema pembayaran sebagai berikut:`;
    const splitSkema = doc.splitTextToSize(skemaText, contentW);
    doc.text(splitSkema, marginL, y);
    y += splitSkema.length * 4.5 + 4;

    // Payment schedule table
    const tableRows = calc.items.map(item => [
      String(item.seq),
      item.seq === 1 ? `${item.label}\n(Termasuk UTJ ${fmtIDR(calc.utjAmount)})` : item.label,
      fmtIDR(item.amount)
    ]);
    tableRows.push([{ content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'center' } }, { content: fmtIDR(calc.items.reduce((s, i) => s + i.amount, 0)), styles: { fontStyle: 'bold' } }]);

    autoTable(doc, {
      startY: y,
      margin: { left: marginL, right: marginR },
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 18 },
        1: { halign: 'left' },
        2: { halign: 'right', cellWidth: 45 }
      },
      head: [['No', 'Keterangan', 'Jumlah']],
      body: tableRows
    });
    y = doc.lastAutoTable.finalY + 8;

    // Check if we need a new page for the rest
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    // 3. Ketentuan Cicilan Inhouse
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('3. Ketentuan Cicilan Inhouse', marginL, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const clauses = [
      `Cicilan pertama sebesar ${fmtIDR(calc.items[0]?.amount || 0)} sudah termasuk UTJ (Uang Tanda Jadi) sebesar ${fmtIDR(calc.utjAmount)} dan wajib dibayarkan paling lambat 7 (tujuh) hari setelah surat perjanjian ini diterbitkan.`,
      'Cicilan selanjutnya wajib dibayarkan paling lambat tanggal 10 setiap bulannya.',
      'Keterlambatan pembayaran cicilan akan dikenakan denda administrasi sesuai ketentuan sekolah.',
      'UTJ yang telah dibayarkan tidak dapat dikembalikan jika Pihak Kedua membatalkan pendaftaran.',
      'Perjanjian ini berlaku sejak diterbitkan oleh pihak sekolah.'
    ];
    clauses.forEach((clause, idx) => {
      const lines = doc.splitTextToSize(`${idx + 1}. ${clause}`, contentW - 4);
      doc.text(lines, marginL + 2, y);
      y += lines.length * 4 + 2;
    });
    y += 6;

    // Footer
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(marginL, pageH - 15, pageW - marginR, pageH - 15);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Dokumen ini dicetak secara otomatis oleh sistem Chung Chung Christian School.', pageW / 2, pageH - 10, { align: 'center' });
    doc.text(`Ref: ${app.application_number} | Dicetak: ${new Date().toLocaleString('id-ID')}`, pageW / 2, pageH - 6, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    return doc;
  };

  // Print installment PDF (download)
  const handlePrintInstallment = async () => {
    const doc = await generateInstallmentPDF();
    if (!doc) return;
    const app = selectedApplication;
    doc.save(`Perjanjian_Cicilan_${app.application_number}_${app.student_name?.replace(/\s+/g, '_')}.pdf`);
  };

  // Email installment PDF to parent
  const [emailSending, setEmailSending] = useState(false);
  const handleEmailInstallment = async () => {
    const app = selectedApplication;
    if (!app) return;
    if (!app.parent_email) {
      showNotification('Email orang tua belum diisi. Silakan lengkapi data terlebih dahulu.', 'error');
      return;
    }
    setEmailSending(true);
    try {
      const doc = await generateInstallmentPDF();
      if (!doc) { setEmailSending(false); return; }

      // Send as FormData with binary blob (avoids base64 overhead hitting Vercel 4.5MB limit)
      const pdfBlob = doc.output('blob');
      const fileName = `Perjanjian_Cicilan_${app.application_number}_${app.student_name?.replace(/\s+/g, '_')}.pdf`;

      const formData = new FormData();
      formData.append('pdf', pdfBlob, fileName);
      formData.append('email', app.parent_email);
      formData.append('parentName', app.parent_name || '');
      formData.append('studentName', app.student_name || '');
      formData.append('applicationNumber', app.application_number || '');
      formData.append('unitName', app.level?.level_name || app.unit?.unit_name || '-');

      const res = await fetch('/api/email/installment', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`PDF perjanjian cicilan berhasil dikirim ke ${app.parent_email}`, 'success');
      } else {
        showNotification(data.message || 'Gagal mengirim email', 'error');
      }
    } catch (err) {
      console.error('Email installment error:', err);
      showNotification('Gagal mengirim email: ' + err.message, 'error');
    } finally {
      setEmailSending(false);
    }
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch = !searchTerm || 
      app.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.application_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.parent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.parent_phone?.includes(searchTerm);
    
    const matchesStatus = !filterStatus || app.status === filterStatus;
    const matchesLevel = !filterLevel || app.level_id === parseInt(filterLevel);
    const matchesYear = !filterYear || app.year_id === parseInt(filterYear);

    return matchesSearch && matchesStatus && matchesLevel && matchesYear;
  });

  // Helper: get fee amounts for an application
  const getAppFeeInfo = (app) => {
    // Find matching UDP by level, year, and application date within period
    const appDate = app.created_at ? app.created_at.slice(0, 10) : null;
    let udp = null;

    if (app.level_id) {
      // Find UDP entries for this level+year, default to 'eksternal'
      const candidates = allUdpDefs.filter(u => 
        u.level_id === app.level_id && u.year_id === app.year_id && 
        (u.student_category || 'eksternal') === 'eksternal'
      );
      // Match by application date falling within effective period
      if (appDate && candidates.length > 1) {
        udp = candidates.find(u => 
          u.effective_from && u.effective_until &&
          appDate >= u.effective_from && appDate <= u.effective_until
        );
      }
      // Fallback: first matching entry if no date match
      if (!udp) udp = candidates[0] || null;
    } else {
      // Legacy fallback by unit_id
      udp = allUdpDefs.find(u => u.unit_id === app.unit_id && u.year_id === app.year_id) || null;
    }

    // USEK lookup (unchanged — single entry per level per year)
    const usek = app.level_id
      ? allUsekDefs.find(u => u.level_id === app.level_id && u.year_id === app.year_id)
      : allUsekDefs.find(u => u.unit_id === app.unit_id && u.year_id === app.year_id);
    const appDiscs = allAppDiscounts.filter(d => d.application_id === app.application_id);
    
    // Calculate UDP final
    let udpBase = udp?.total_amount || 0;
    let udpFinal = udpBase;
    const udpDiscs = appDiscs.filter(d => d.fee_target === 'udp').sort((a, b) => a.seq - b.seq);
    for (const d of udpDiscs) {
      if (d.value_type === 'percentage') {
        udpFinal = Math.max(0, udpFinal - Math.round(udpFinal * (d.value / 100)));
      } else {
        udpFinal = Math.max(0, udpFinal - d.value);
      }
    }
    
    // Calculate USEK final
    let usekBase = usek?.default_amount || 0;
    let usekFinal = usekBase;
    const usekDiscs = appDiscs.filter(d => d.fee_target === 'usek').sort((a, b) => a.seq - b.seq);
    for (const d of usekDiscs) {
      if (d.value_type === 'percentage') {
        usekFinal = Math.max(0, usekFinal - Math.round(usekFinal * (d.value / 100)));
      } else {
        usekFinal = Math.max(0, usekFinal - d.value);
      }
    }
    
    return {
      udpBase, udpFinal, udpHasDiscount: udpDiscs.length > 0,
      usekBase, usekFinal, usekHasDiscount: usekDiscs.length > 0,
      udpDiscs, usekDiscs, udpPeriod: udp
    };
  };

  // Excel export
  const handleExportExcel = async () => {
    if (filteredApplications.length === 0) {
      showNotification('Informasi', 'Tidak ada data untuk diekspor', 'error');
      return;
    }

    const rows = filteredApplications.map((app, idx) => {
      const fee = getAppFeeInfo(app);
      
      // Build discount detail strings
      const udpDetail = fee.udpDiscs.map((d, i) => {
        const name = d.discount?.discount_name || d.discount?.discount_code || '-';
        const val = d.value_type === 'percentage' ? `${d.value}%` : formatCurrency(d.value);
        return `${i + 1}. ${name} (${val})`;
      }).join('; ');
      
      const usekDetail = fee.usekDiscs.map((d, i) => {
        const name = d.discount?.discount_name || d.discount?.discount_code || '-';
        const val = d.value_type === 'percentage' ? `${d.value}%` : formatCurrency(d.value);
        return `${i + 1}. ${name} (${val})`;
      }).join('; ');

      return {
        'No': idx + 1,
        'No. Pendaftaran': app.application_number || '',
        'Nama Siswa': app.student_name || '',
        'Nama Panggilan': app.student_nickname || '',
        'Jenis Kelamin': app.student_gender === 'male' ? 'Laki-laki' : app.student_gender === 'female' ? 'Perempuan' : '',
        'Tempat Lahir': app.birth_place || '',
        'Tanggal Lahir': app.birth_date || '',
        'Agama': app.religion || '',
        'Kewarganegaraan': app.nationality || '',
        'Alamat': app.address || '',
        'Kota': app.city || '',
        'Provinsi': app.province || '',
        'Kode Pos': app.postal_code || '',
        'NIK Orang Tua': app.parent_nik || '',
        'Nama Orang Tua': app.parent_name || '',
        'No. Telepon': app.parent_phone || '',
        'Email': app.parent_email || '',
        'Pekerjaan': app.parent_occupation || '',
        'Jenjang': app.level?.level_name || app.unit?.unit_name || '',
        'Tahun Ajaran': app.year?.year_name || '',
        'Tanggal Daftar': formatDate(app.created_at),
        'Status': statusLabels[app.status] || app.status,
        'UDP Pokok': fee.udpBase,
        'Detail Potongan UDP': udpDetail || '-',
        'Total Potongan UDP': fee.udpBase - fee.udpFinal,
        'UDP Akhir (Netto)': fee.udpFinal,
        'USEK/bln Pokok': fee.usekBase,
        'Detail Potongan USEK': usekDetail || '-',
        'Total Potongan USEK/bln': fee.usekBase - fee.usekFinal,
        'USEK/bln Akhir': fee.usekFinal,
        'Catatan Admin': app.admin_notes || '',
      };
    });

    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Pendaftaran')
    const colWidths = [4, 18, 22, 14, 12, 14, 12, 10, 14, 30, 14, 14, 8, 20, 22, 16, 22, 16, 12, 14, 14, 14, 16, 35, 16, 16, 16, 35, 18, 16, 20]
    if (rows.length > 0) {
      const keys = Object.keys(rows[0])
      ws.columns = keys.map((key, i) => ({ header: key, key, width: colWidths[i] || 15 }))
      ws.addRows(rows)
    }

    const filterLabel = filterStatus ? statusConfig[filterStatus]?.label : 'Semua';
    const filename = `Laporan_Pendaftaran_${filterLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
    showNotification('Berhasil', `Data pendaftaran berhasil diekspor (${filteredApplications.length} baris)`, 'success');
  };

  // Count by status
  const statusCounts = {
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length
  };

  if (loading) {
    return (
      <div style={{ background: pageBg, minHeight: '100%', padding: '48px 32px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: textSecondary }}>
        <FontAwesomeIcon icon={faSpinner} className="text-2xl animate-spin" style={{ color: isDark ? '#60A5FA' : '#0284C7' }} />
      </div>
    );
  }

  return (
    <div style={{ background: pageBg, minHeight: '100%', padding: '24px 32px', color: textPrimary, fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}>
      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      {/* ── HEADER & BREADCRUMBS (MATCHING /data/pyp LAYOUT) ─────────── */}
      <div className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6" style={{ borderColor }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: textSecondary }}>
            <span>[PENDAFTARAN]</span>
            <span>/</span>
            <span>[PENERIMAAN SISWA]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>[DATA PENDAFTARAN]</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded flex items-center justify-center border" style={{ background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', borderColor: isDark ? '#2563EB' : '#BAE6FD', color: isDark ? '#60A5FA' : '#0284C7' }}>
              <FontAwesomeIcon icon={faUserGraduate} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                {t('admission.title')}
              </h1>
              <p className="text-xs" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                {t('admission.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 text-xs h-9 px-3 border transition-colors hover:bg-black/5 dark:hover:bg-white/5 font-medium"
            style={{
              background: cardBg,
              borderColor,
              color: textPrimary,
              borderRadius: '6px'
            }}
          >
            <FontAwesomeIcon icon={faDownload} className="text-xs text-emerald-600" />
            <span>{t('admission.exportExcel')}</span>
          </button>

          <button
            onClick={() => router.push('/data/admission/discounts')}
            className="flex items-center gap-1.5 text-xs h-9 px-3.5 border transition-all font-medium"
            style={{
              background: isDark ? '#F4F4F5' : '#111111',
              color: isDark ? '#111111' : '#FFFFFF',
              borderColor: isDark ? '#F4F4F5' : '#111111',
              borderRadius: '6px'
            }}
          >
            <FontAwesomeIcon icon={faTag} className="text-xs" />
            <span>{t('admission.masterDiscountBtn')}</span>
          </button>
        </div>
      </div>

      {/* ── BENTO STATS CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {/* Total Pendaftar */}
        <div
          onClick={() => setFilterStatus('')}
          className="p-3.5 rounded border cursor-pointer transition-all hover:opacity-90"
          style={{
            background: cardBg,
            borderColor: filterStatus === '' ? (isDark ? '#60A5FA' : '#0284C7') : borderColor,
            borderRadius: '8px'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>
                Total Pendaftar
              </p>
              <p className="text-xl font-bold tracking-tight mt-0.5" style={{ color: textPrimary }}>
                {applications.length}
              </p>
            </div>
            <div className="w-8 h-8 rounded flex items-center justify-center border" style={{ background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', borderColor: isDark ? '#2563EB' : '#BAE6FD', color: isDark ? '#60A5FA' : '#1F6C9F' }}>
              <FontAwesomeIcon icon={faUserGraduate} className="text-xs" />
            </div>
          </div>
        </div>

        {/* Menunggu Review */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'pending' ? '' : 'pending')}
          className="p-3.5 rounded border cursor-pointer transition-all hover:opacity-90"
          style={{
            background: cardBg,
            borderColor: filterStatus === 'pending' ? (isDark ? '#F59E0B' : '#D97706') : borderColor,
            borderRadius: '8px'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>
                {statusLabels.pending}
              </p>
              <p className="text-xl font-bold tracking-tight mt-0.5" style={{ color: isDark ? '#FBBF24' : '#956400' }}>
                {statusCounts.pending}
              </p>
            </div>
            <div className="w-8 h-8 rounded flex items-center justify-center border" style={{ background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FBF3DB', borderColor: isDark ? '#D97706' : '#FDE68A', color: isDark ? '#FBBF24' : '#956400' }}>
              <FontAwesomeIcon icon={faClock} className="text-xs" />
            </div>
          </div>
        </div>

        {/* Diterima */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'approved' ? '' : 'approved')}
          className="p-3.5 rounded border cursor-pointer transition-all hover:opacity-90"
          style={{
            background: cardBg,
            borderColor: filterStatus === 'approved' ? (isDark ? '#10B981' : '#059669') : borderColor,
            borderRadius: '8px'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>
                {statusLabels.approved}
              </p>
              <p className="text-xl font-bold tracking-tight mt-0.5" style={{ color: isDark ? '#34D399' : '#346538' }}>
                {statusCounts.approved}
              </p>
            </div>
            <div className="w-8 h-8 rounded flex items-center justify-center border" style={{ background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#EDF3EC', borderColor: isDark ? '#059669' : '#A7F3D0', color: isDark ? '#34D399' : '#346538' }}>
              <FontAwesomeIcon icon={faCheck} className="text-xs" />
            </div>
          </div>
        </div>

        {/* Ditolak */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'rejected' ? '' : 'rejected')}
          className="p-3.5 rounded border cursor-pointer transition-all hover:opacity-90"
          style={{
            background: cardBg,
            borderColor: filterStatus === 'rejected' ? (isDark ? '#EF4444' : '#DC2626') : borderColor,
            borderRadius: '8px'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>
                {statusLabels.rejected}
              </p>
              <p className="text-xl font-bold tracking-tight mt-0.5" style={{ color: isDark ? '#F87171' : '#9F2F2D' }}>
                {statusCounts.rejected}
              </p>
            </div>
            <div className="w-8 h-8 rounded flex items-center justify-center border" style={{ background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC', borderColor: isDark ? '#DC2626' : '#FECACA', color: isDark ? '#F87171' : '#9F2F2D' }}>
              <FontAwesomeIcon icon={faTimes} className="text-xs" />
            </div>
          </div>
        </div>
      </div>

      {/* ── MINIMALIST TAB SWITCHER: DATA PENDAFTAR VS LOG PENGIRIMAN EMAIL ─── */}
      <div className="flex items-center gap-6 border-b mb-6" style={{ borderColor }}>
        <button
          onClick={() => setActiveTab('applications')}
          className="pb-2.5 text-xs font-mono uppercase tracking-wider font-semibold transition-all relative flex items-center gap-2"
          style={{
            color: activeTab === 'applications' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'applications' ? `2px solid ${textPrimary}` : '2px solid transparent'
          }}
        >
          <FontAwesomeIcon icon={faUserGraduate} className="text-[11px]" />
          <span>Data Pendaftar ({applications.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('email_logs');
            if (emailLogs.length === 0) fetchEmailLogs();
          }}
          className="pb-2.5 text-xs font-mono uppercase tracking-wider font-semibold transition-all relative flex items-center gap-2"
          style={{
            color: activeTab === 'email_logs' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'email_logs' ? `2px solid ${textPrimary}` : '2px solid transparent'
          }}
        >
          <FontAwesomeIcon icon={faEnvelope} className="text-[11px]" />
          <span>Log Pengiriman Email {emailLogs.length > 0 ? `(${emailLogs.length})` : ''}</span>
        </button>
      </div>

      {activeTab === 'applications' && (
        <>
          {/* ── PENDING FORM FEE PROOFS ALERT (MINIMALIST BANNER) ─────────────── */}
      {applications.filter(a => a.form_fee_status === 'proof_uploaded').length > 0 && (
        <div 
          className="p-3.5 rounded border mb-6 flex items-center justify-between flex-wrap gap-3"
          style={{
            background: isDark ? 'rgba(245, 158, 11, 0.10)' : '#FBF3DB',
            borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
            borderRadius: '8px'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded flex items-center justify-center border flex-shrink-0" style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor: isDark ? '#D97706' : '#FDE68A', color: isDark ? '#FBBF24' : '#956400' }}>
              <FontAwesomeIcon icon={faClock} className="text-xs" />
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: isDark ? '#FBBF24' : '#956400', margin: 0 }}>
                Ada {applications.filter(a => a.form_fee_status === 'proof_uploaded').length} bukti transfer formulir baru yang perlu diverifikasi!
              </p>
              <p className="text-[11px]" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                Pendaftar dari portal ccs.sch.id telah mengunggah bukti pembayaran formulir. Silakan verifikasi untuk membuka formulir biodata lengkap bagi orang tua.
              </p>
            </div>
          </div>
          <button
            className="text-xs h-7 px-3 border font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{
              background: isDark ? '#18181B' : '#FFFFFF',
              borderColor: isDark ? '#D97706' : '#D97706',
              color: isDark ? '#FBBF24' : '#956400',
              borderRadius: '6px'
            }}
            onClick={() => {
              const pendingApp = applications.find(a => a.form_fee_status === 'proof_uploaded');
              if (pendingApp) handleViewDetail(pendingApp);
            }}
          >
            Verifikasi Sekarang
          </button>
        </div>
      )}

      {/* ── BENTO CONTROLS & FILTERS (MATCHING /data/pyp) ──────────────────── */}
      <div className="p-3.5 rounded border mb-6" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search */}
          <div>
            <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
              {t('admission.filter.searchLabel')}
            </label>
            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: textSecondary }} />
              <input
                type="text"
                placeholder={t('admission.filter.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs font-mono rounded border outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Level */}
          <div>
            <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
              {t('admission.filter.levelLabel')}
            </label>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer"
              style={selectStyle}
            >
              <option value="">{t('admission.filter.allLevels')}</option>
              {(() => {
                const groups = {};
                levels.forEach(l => {
                  const uName = l.unit?.unit_name || 'Other';
                  if (!groups[uName]) groups[uName] = [];
                  groups[uName].push(l);
                });
                return Object.entries(groups).map(([unitName, unitLevels]) => (
                  <optgroup key={unitName} label={unitName}>
                    {unitLevels.map(l => (
                      <option key={l.level_id} value={l.level_id}>{l.level_name}</option>
                    ))}
                  </optgroup>
                ));
              })()}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
              {t('admission.filter.yearLabel')}
            </label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer"
              style={selectStyle}
            >
              <option value="">{t('admission.filter.allYears')}</option>
              {years.map(year => (
                <option key={year.year_id} value={year.year_id}>{year.year_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── TABS NAVIGATION (MATCHING /data/pyp EXACT STRUCTURE) ──────────── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}`, marginBottom: '20px', gap: '24px', flexWrap: 'wrap' }}>
        {/* TAB: Menunggu Review */}
        <button
          onClick={() => setFilterStatus('pending')}
          style={{
            padding: '10px 0',
            fontSize: '13px',
            fontWeight: filterStatus === 'pending' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: filterStatus === 'pending' ? textPrimary : textSecondary,
            borderBottom: filterStatus === 'pending' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faClock} style={{ fontSize: '12px' }} />
          {statusLabels.pending}
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{
              background: filterStatus === 'pending' ? (isDark ? '#27272A' : '#EAEAEA') : (isDark ? '#1C1C1F' : '#F4F4F5'),
              color: filterStatus === 'pending' ? textPrimary : textSecondary
            }}
          >
            {statusCounts.pending}
          </span>
        </button>

        {/* TAB: Semua Pendaftar */}
        <button
          onClick={() => setFilterStatus('')}
          style={{
            padding: '10px 0',
            fontSize: '13px',
            fontWeight: filterStatus === '' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: filterStatus === '' ? textPrimary : textSecondary,
            borderBottom: filterStatus === '' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faUserGraduate} style={{ fontSize: '12px' }} />
          {t('admission.table.tabAll')}
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{
              background: filterStatus === '' ? (isDark ? '#27272A' : '#EAEAEA') : (isDark ? '#1C1C1F' : '#F4F4F5'),
              color: filterStatus === '' ? textPrimary : textSecondary
            }}
          >
            {applications.length}
          </span>
        </button>

        {/* TAB: Diterima */}
        <button
          onClick={() => setFilterStatus('approved')}
          style={{
            padding: '10px 0',
            fontSize: '13px',
            fontWeight: filterStatus === 'approved' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: filterStatus === 'approved' ? textPrimary : textSecondary,
            borderBottom: filterStatus === 'approved' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faCheck} style={{ fontSize: '12px' }} />
          {statusLabels.approved}
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{
              background: filterStatus === 'approved' ? (isDark ? '#27272A' : '#EAEAEA') : (isDark ? '#1C1C1F' : '#F4F4F5'),
              color: filterStatus === 'approved' ? textPrimary : textSecondary
            }}
          >
            {statusCounts.approved}
          </span>
        </button>

        {/* TAB: Ditolak */}
        <button
          onClick={() => setFilterStatus('rejected')}
          style={{
            padding: '10px 0',
            fontSize: '13px',
            fontWeight: filterStatus === 'rejected' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: filterStatus === 'rejected' ? textPrimary : textSecondary,
            borderBottom: filterStatus === 'rejected' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faTimes} style={{ fontSize: '12px' }} />
          {statusLabels.rejected}
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{
              background: filterStatus === 'rejected' ? (isDark ? '#27272A' : '#EAEAEA') : (isDark ? '#1C1C1F' : '#F4F4F5'),
              color: filterStatus === 'rejected' ? textPrimary : textSecondary
            }}
          >
            {statusCounts.rejected}
          </span>
        </button>
      </div>

      {/* ── APPLICATIONS TABLE (EDITORIAL MINIMALIST STYLE) ───────────────── */}
      <div
        className="rounded border overflow-hidden mb-6"
        style={{
          background: cardBg,
          borderColor,
          borderRadius: '8px'
        }}
      >
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: textPrimary }}>
              {t('admission.table.title')}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border" style={{ background: isDark ? '#27272A' : '#F4F4F5', borderColor, color: textSecondary }}>
              {filteredApplications.length} pendaftar
            </span>
          </div>
        </div>

        {filteredApplications.length === 0 ? (
          <div className="text-center py-16" style={{ color: textSecondary }}>
            <FontAwesomeIcon icon={faUserGraduate} className="text-3xl mb-3 opacity-30" />
            <p className="text-xs">{t('admission.table.noData')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ background: isDark ? '#1F1F23' : '#F9F9F8', borderColor }}>
                  <th className="px-3.5 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.table.colAppNumber')}</th>
                  <th className="px-3.5 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.table.colStudentName')}</th>
                  <th className="px-3.5 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.table.colParent')}</th>
                  <th className="px-3.5 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.table.colLevel')}</th>
                  <th className="px-3.5 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.table.colYear')}</th>
                  <th className="px-3.5 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.table.colRegDate')}</th>
                  <th className="px-3.5 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider text-right" style={{ color: textSecondary }}>UDP Netto</th>
                  <th className="px-3.5 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider text-right" style={{ color: textSecondary }}>USEK/bln</th>
                  <th className="px-3.5 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.table.colStatus')}</th>
                  <th className="px-3.5 py-2.5 text-[10px] font-mono font-medium uppercase tracking-wider text-right" style={{ color: textSecondary }}>{t('admission.table.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor }}>
                {filteredApplications.map(app => {
                  const fee = getAppFeeInfo(app);
                  const hasInstallment = allInstallments.some(inst => inst.application_id === app.application_id);
                  return (
                    <tr key={app.application_id} className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                      <td className="px-3.5 py-2.5 text-xs font-mono">
                        <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
                          {app.application_number}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium" style={{ color: textPrimary }}>{app.student_name}</span>
                          {!hasInstallment && (
                            <span 
                              className="px-1.5 py-0.2 rounded text-[9px] font-mono border"
                              style={{ 
                                background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FBF3DB', 
                                borderColor: isDark ? '#D97706' : '#FDE68A', 
                                color: isDark ? '#FBBF24' : '#956400' 
                              }}
                              title={t('admission.tooltips.installmentPlan')}
                            >
                              <FontAwesomeIcon icon={faCalculator} className="mr-0.5 text-[8px]" />
                              {t('admission.table.noInstallmentBadge')}
                            </span>
                          )}
                        </div>
                        {app.student_nickname && (
                          <span className="text-[11px]" style={{ color: textSecondary }}>({app.student_nickname})</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="text-xs font-medium" style={{ color: textPrimary }}>{app.parent_name || '-'}</div>
                        <div className="text-[11px] font-mono" style={{ color: textSecondary }}>{app.parent_phone || '-'}</div>
                      </td>
                      <td className="px-3.5 py-2.5 text-xs" style={{ color: textSecondary }}>
                        {app.level?.level_name || app.unit?.unit_name || '-'}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs font-mono" style={{ color: textSecondary }}>
                        {app.year?.year_name || '-'}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs font-mono" style={{ color: textSecondary }}>
                        {formatDate(app.created_at)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right text-xs">
                        {fee.udpBase > 0 ? (
                          <div>
                            {fee.udpHasDiscount ? (
                              <>
                                <div className="text-[10px] line-through font-mono" style={{ color: textSecondary }}>{formatCurrency(fee.udpBase)}</div>
                                <div className="font-semibold font-mono" style={{ color: isDark ? '#34D399' : '#346538' }}>{formatCurrency(fee.udpFinal)}</div>
                              </>
                            ) : (
                              <div className="font-mono" style={{ color: textPrimary }}>{formatCurrency(fee.udpBase)}</div>
                            )}
                          </div>
                        ) : <span className="text-[11px]" style={{ color: textSecondary }}>-</span>}
                      </td>
                      <td className="px-3.5 py-2.5 text-right text-xs">
                        {fee.usekBase > 0 ? (
                          <div>
                            {fee.usekHasDiscount ? (
                              <>
                                <div className="text-[10px] line-through font-mono" style={{ color: textSecondary }}>{formatCurrency(fee.usekBase)}</div>
                                <div className="font-semibold font-mono" style={{ color: isDark ? '#60A5FA' : '#1F6C9F' }}>{formatCurrency(fee.usekFinal)}</div>
                              </>
                            ) : (
                              <div className="font-mono" style={{ color: textPrimary }}>{formatCurrency(fee.usekBase)}</div>
                            )}
                          </div>
                        ) : <span className="text-[11px]" style={{ color: textSecondary }}>-</span>}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wide uppercase border"
                            style={{
                              background: app.status === 'approved' ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#EDF3EC') :
                                          app.status === 'rejected' ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC') :
                                          (isDark ? 'rgba(245, 158, 11, 0.15)' : '#FBF3DB'),
                              borderColor: app.status === 'approved' ? (isDark ? '#059669' : '#A7F3D0') :
                                           app.status === 'rejected' ? (isDark ? '#DC2626' : '#FECACA') :
                                           (isDark ? '#D97706' : '#FDE68A'),
                              color: app.status === 'approved' ? (isDark ? '#34D399' : '#346538') :
                                     app.status === 'rejected' ? (isDark ? '#F87171' : '#9F2F2D') :
                                     (isDark ? '#FBBF24' : '#956400')
                            }}
                          >
                            <FontAwesomeIcon icon={app.status === 'approved' ? faCheck : app.status === 'rejected' ? faTimes : faClock} className="text-[8px]" />
                            {statusLabels[app.status]}
                          </span>

                          {app.form_fee_amount ? (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono border"
                              style={{
                                background: app.form_fee_status === 'verified' ? (isDark ? 'rgba(16, 185, 129, 0.12)' : '#EDF3EC') :
                                            app.form_fee_status === 'proof_uploaded' ? (isDark ? 'rgba(59, 130, 246, 0.12)' : '#E1F3FE') :
                                            app.form_fee_status === 'rejected' ? (isDark ? 'rgba(239, 68, 68, 0.12)' : '#FDEBEC') :
                                            (isDark ? 'rgba(245, 158, 11, 0.12)' : '#FBF3DB'),
                                borderColor: app.form_fee_status === 'verified' ? (isDark ? '#059669' : '#A7F3D0') :
                                             app.form_fee_status === 'proof_uploaded' ? (isDark ? '#2563EB' : '#BAE6FD') :
                                             app.form_fee_status === 'rejected' ? (isDark ? '#DC2626' : '#FECACA') :
                                             (isDark ? '#D97706' : '#FDE68A'),
                                color: app.form_fee_status === 'verified' ? (isDark ? '#34D399' : '#346538') :
                                       app.form_fee_status === 'proof_uploaded' ? (isDark ? '#60A5FA' : '#1F6C9F') :
                                       app.form_fee_status === 'rejected' ? (isDark ? '#F87171' : '#9F2F2D') :
                                       (isDark ? '#FBBF24' : '#956400')
                              }}
                            >
                              <FontAwesomeIcon icon={app.form_fee_status === 'verified' ? faCheck : (app.form_fee_status === 'rejected' ? faTimes : faClock)} className="text-[8px]" />
                              {app.form_fee_status === 'verified'
                                ? 'Formulir Lunas'
                                : app.form_fee_status === 'proof_uploaded'
                                ? 'Perlu Verifikasi Bukti'
                                : app.form_fee_status === 'rejected'
                                ? 'Bukti Ditolak'
                                : 'Belum Bayar Formulir'}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewDetail(app)}
                            className="p-1.5 rounded border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ borderColor, color: textSecondary }}
                            title={t('admission.tooltips.viewDetail')}
                          >
                            <FontAwesomeIcon icon={faEye} className="text-xs" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedApplication(app);
                              fetchDiscountsForApplication(app);
                              setShowDiscountModal(true);
                            }}
                            className="p-1.5 rounded border transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            style={{ borderColor, color: isDark ? '#34D399' : '#059669' }}
                            title={t('admission.tooltips.manageDiscount')}
                          >
                            <FontAwesomeIcon icon={faTag} className="text-xs" />
                          </button>

                          <button
                            onClick={() => handleOpenInstallment(app)}
                            className="p-1.5 rounded border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{
                              borderColor: hasInstallment ? (isDark ? '#8B5CF6' : '#7C3AED') : borderColor,
                              color: hasInstallment ? (isDark ? '#A78BFA' : '#7C3AED') : textSecondary
                            }}
                            title={t('admission.tooltips.installmentPlan')}
                          >
                            <FontAwesomeIcon icon={faCalculator} className="text-xs" />
                          </button>

                          <button
                            onClick={() => handleResendPaymentEmail(app)}
                            disabled={resendingEmailId === app.application_id || !app.parent_email}
                            className="p-1.5 rounded border transition-colors hover:bg-sky-50 dark:hover:bg-sky-950/30 disabled:opacity-30"
                            style={{ borderColor, color: isDark ? '#38BDF8' : '#0284C7' }}
                            title={app.parent_email ? `Kirim Ulang Email Tagihan & Rekening (${app.parent_email})` : 'Email orang tua belum terdaftar'}
                          >
                            <FontAwesomeIcon icon={resendingEmailId === app.application_id ? faSpinner : faEnvelope} className={`text-xs ${resendingEmailId === app.application_id ? 'animate-spin' : ''}`} />
                          </button>

                          {app.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleActionClick(app, 'approved')}
                                className="p-1.5 rounded border transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                style={{ borderColor: isDark ? '#059669' : '#A7F3D0', color: isDark ? '#34D399' : '#059669' }}
                                title={t('admission.tooltips.approve')}
                              >
                                <FontAwesomeIcon icon={faCheck} className="text-xs" />
                              </button>
                              <button
                                onClick={() => handleActionClick(app, 'rejected')}
                                className="p-1.5 rounded border transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                style={{ borderColor: isDark ? '#DC2626' : '#FECACA', color: isDark ? '#F87171' : '#DC2626' }}
                                title={t('admission.tooltips.reject')}
                              >
                                <FontAwesomeIcon icon={faTimes} className="text-xs" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* ── EMAIL LOGS VIEW (RESEND REAL-TIME AUDIT TRAIL) ───────────────── */}
      {activeTab === 'email_logs' && (
        <div className="space-y-6">
          {/* Email Logs Filter Bar */}
          <div className="p-3.5 rounded border" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: textSecondary }} />
                <input
                  type="text"
                  placeholder="Cari email penerima, subjek, atau REG-..."
                  value={emailLogSearch}
                  onChange={(e) => setEmailLogSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchEmailLogs(emailLogSearch)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs font-mono rounded border outline-none"
                  style={inputStyle}
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => fetchEmailLogs(emailLogSearch)}
                  disabled={emailLogsLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border rounded font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ background: cardBg, borderColor, color: textPrimary, borderRadius: '6px' }}
                >
                  <FontAwesomeIcon icon={faSync} className={`text-[10px] ${emailLogsLoading ? 'animate-spin' : ''}`} />
                  <span>Segarkan Log</span>
                </button>
              </div>
            </div>
          </div>

          {/* Email Logs Table */}
          <div className="border rounded overflow-hidden" style={{ borderColor, background: cardBg, borderRadius: '8px' }}>
            {emailLogsLoading ? (
              <div className="p-12 text-center" style={{ color: textSecondary }}>
                <FontAwesomeIcon icon={faSpinner} className="text-2xl animate-spin mb-3" style={{ color: isDark ? '#60A5FA' : '#0284C7' }} />
                <p className="text-xs font-mono">Memuat riwayat pengiriman email dari server...</p>
              </div>
            ) : emailLogs.length === 0 ? (
              <div className="p-12 text-center" style={{ color: textSecondary }}>
                <FontAwesomeIcon icon={faEnvelope} className="text-2xl mb-2 opacity-40" />
                <p className="text-xs font-mono font-medium">Tidak ada log pengiriman email ditemukan.</p>
                <p className="text-[11px] font-mono mt-1">Klik tombol &apos;Segarkan Log&apos; atau sesuaikan kata kunci pencarian Anda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left" style={{ borderColor, background: isDark ? '#1C1C1F' : '#F9F9F8' }}>
                      <th className="py-2.5 px-3.5 font-mono uppercase tracking-wider text-[10px]" style={{ color: textSecondary }}>Waktu Kirim</th>
                      <th className="py-2.5 px-3.5 font-mono uppercase tracking-wider text-[10px]" style={{ color: textSecondary }}>Penerima (Email)</th>
                      <th className="py-2.5 px-3.5 font-mono uppercase tracking-wider text-[10px]" style={{ color: textSecondary }}>No. Registrasi</th>
                      <th className="py-2.5 px-3.5 font-mono uppercase tracking-wider text-[10px]" style={{ color: textSecondary }}>Tipe / Subjek Email</th>
                      <th className="py-2.5 px-3.5 font-mono uppercase tracking-wider text-[10px]" style={{ color: textSecondary }}>Status Pengiriman</th>
                      <th className="py-2.5 px-3.5 font-mono uppercase tracking-wider text-[10px] text-right" style={{ color: textSecondary }}>Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailLogs.map((log) => {
                      const matchedApp = applications.find(a => 
                        (log.application_number && a.application_number === log.application_number) ||
                        (a.parent_email && log.to.includes(a.parent_email))
                      );

                      return (
                        <tr key={log.id} className="border-b transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ borderColor }}>
                          <td className="py-2.5 px-3.5 font-mono text-xs whitespace-nowrap" style={{ color: textSecondary }}>
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="py-2.5 px-3.5 font-medium whitespace-nowrap" style={{ color: textPrimary }}>
                            <div className="flex items-center gap-1.5">
                              <FontAwesomeIcon icon={faEnvelope} className="text-[10px]" style={{ color: textSecondary }} />
                              <span>{log.to.join(', ')}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 font-mono font-bold whitespace-nowrap" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
                            {log.application_number || '-'}
                          </td>
                          <td className="py-2.5 px-3.5 max-w-xs truncate" style={{ color: textPrimary }} title={log.subject}>
                            <span className="font-semibold block">{getEmailTypeLabel(log.email_type)}</span>
                            <span className="text-[11px] font-mono text-gray-400 block truncate">{log.subject}</span>
                          </td>
                          <td className="py-2.5 px-3.5 whitespace-nowrap">
                            <span
                              className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider border inline-flex items-center gap-1.5"
                              style={
                                log.status === 'delivered'
                                  ? { background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#EDF3EC', color: isDark ? '#34D399' : '#346538', borderColor: isDark ? '#059669' : '#A7F3D0' }
                                  : log.status === 'bounced' || log.status === 'failed'
                                  ? { background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC', color: isDark ? '#F87171' : '#9F2F2D', borderColor: isDark ? '#DC2626' : '#FECACA' }
                                  : { background: isDark ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE', color: isDark ? '#38BDF8' : '#0369A1', borderColor: isDark ? '#0284C7' : '#BAE6FD' }
                              }
                            >
                              <FontAwesomeIcon
                                icon={log.status === 'delivered' ? faCheck : (log.status === 'bounced' ? faTimes : faClock)}
                                className="text-[9px]"
                              />
                              <span>{getEmailStatusLabel(log.status)}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                            {matchedApp ? (
                              <button
                                onClick={() => handleResendPaymentEmail(matchedApp)}
                                disabled={resendingEmailId === matchedApp.application_id}
                                className="px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider border rounded font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
                                style={{ background: cardBg, borderColor, color: textPrimary, borderRadius: '6px' }}
                                title={`Kirim ulang ke ${matchedApp.parent_email}`}
                              >
                                {resendingEmailId === matchedApp.application_id ? (
                                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[10px]" />
                                ) : (
                                  <FontAwesomeIcon icon={faPaperPlane} className="text-[10px]" />
                                )}
                                <span className="ml-1.5">Kirim Ulang</span>
                              </button>
                            ) : (
                              <span className="text-[10px] font-mono text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setIsEditing(false); }}
        title={`${t('admission.detail.title')} - ${selectedApplication?.application_number}`}
        size="lg"
      >
        {selectedApplication && (
          <div className="space-y-6">
            {/* Status Badge + Edit Toggle */}
            <div className="flex items-center justify-between gap-3">
              <div
                className="flex-1 p-3 rounded border flex items-center gap-3"
                style={{
                  background: selectedApplication.status === 'approved' ? (isDark ? 'rgba(16, 185, 129, 0.12)' : '#EDF3EC') :
                              selectedApplication.status === 'rejected' ? (isDark ? 'rgba(239, 68, 68, 0.12)' : '#FDEBEC') :
                              (isDark ? 'rgba(245, 158, 11, 0.12)' : '#FBF3DB'),
                  borderColor: selectedApplication.status === 'approved' ? (isDark ? '#059669' : '#A7F3D0') :
                               selectedApplication.status === 'rejected' ? (isDark ? '#DC2626' : '#FECACA') :
                               (isDark ? '#D97706' : '#FDE68A'),
                  borderRadius: '6px'
                }}
              >
                <FontAwesomeIcon 
                  icon={statusConfig[selectedApplication.status]?.icon || faClock} 
                  className="text-base"
                  style={{
                    color: selectedApplication.status === 'approved' ? (isDark ? '#34D399' : '#346538') :
                           selectedApplication.status === 'rejected' ? (isDark ? '#F87171' : '#9F2F2D') :
                           (isDark ? '#FBBF24' : '#956400')
                  }}
                />
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.detail.statusLabel')}</p>
                  <p className="font-semibold text-xs mt-0.5" style={{
                    color: selectedApplication.status === 'approved' ? (isDark ? '#34D399' : '#346538') :
                           selectedApplication.status === 'rejected' ? (isDark ? '#F87171' : '#9F2F2D') :
                           (isDark ? '#FBBF24' : '#956400')
                  }}>
                    {statusLabels[selectedApplication.status] || selectedApplication.status || '-'}
                  </p>
                </div>
              </div>
              {!isEditing ? (
                <button
                  className="flex items-center gap-1.5 px-3 py-2 text-xs border rounded font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{
                    background: cardBg,
                    borderColor,
                    color: textPrimary,
                    borderRadius: '6px'
                  }}
                  onClick={handleStartEdit}
                >
                  <FontAwesomeIcon icon={faEdit} className="text-xs" />
                  {t('admission.detail.editDataBtn')}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded transition-colors"
                    style={{
                      background: isDark ? '#F4F4F5' : '#111111',
                      color: isDark ? '#111111' : '#FFFFFF',
                      borderRadius: '6px'
                    }}
                    onClick={handleSaveEdit}
                    disabled={editSaving}
                  >
                    {editSaving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" /> : <FontAwesomeIcon icon={faSave} className="text-xs" />}
                    {editSaving ? t('admission.detail.saving') : t('admission.detail.saveBtn')}
                  </button>
                  <button
                    className="px-3 py-2 text-xs border rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{
                      background: 'none',
                      borderColor,
                      color: textSecondary,
                      borderRadius: '6px'
                    }}
                    onClick={() => setIsEditing(false)}
                    disabled={editSaving}
                  >
                    {t('admission.detail.cancelBtn')}
                  </button>
                </div>
              )}
            </div>

            {/* PPDB Portal Payment & Verification Card */}
            {(selectedApplication.form_fee_amount || selectedApplication.form_fee_status || selectedApplication.payment_proof_file) && (
              <div
                className="p-3.5 rounded border space-y-3"
                style={{
                  background: isDark ? '#1C1C1F' : '#F9F9F8',
                  borderColor,
                  borderRadius: '8px'
                }}
              >
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b" style={{ borderColor }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded flex items-center justify-center border" style={{ background: isDark ? '#27272A' : '#FFFFFF', borderColor, color: isDark ? '#60A5FA' : '#0284C7' }}>
                      <FontAwesomeIcon icon={faFileInvoice} className="text-xs" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs" style={{ color: textPrimary }}>Pembayaran Formulir PPDB (Portal ccs.sch.id)</h4>
                      <p className="text-[11px] font-mono" style={{ color: textSecondary }}>
                        {selectedApplication.wave_name || 'Gelombang Pendaftaran'} &bull; Tagihan: <span className="font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>{formatCurrency(selectedApplication.form_fee_amount || 0)}</span>
                      </p>
                    </div>
                  </div>
                  <div>
                    {selectedApplication.form_fee_status === 'verified' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono border" style={{ background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#EDF3EC', borderColor: isDark ? '#059669' : '#A7F3D0', color: isDark ? '#34D399' : '#346538' }}>
                        <FontAwesomeIcon icon={faCheck} className="text-[8px]" />
                        Formulir Terverifikasi (Lunas)
                      </span>
                    )}
                    {selectedApplication.form_fee_status === 'proof_uploaded' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono border" style={{ background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FBF3DB', borderColor: isDark ? '#D97706' : '#FDE68A', color: isDark ? '#FBBF24' : '#956400' }}>
                        <FontAwesomeIcon icon={faClock} className="text-[8px]" />
                        Bukti Diunggah (Perlu Verifikasi)
                      </span>
                    )}
                    {selectedApplication.form_fee_status === 'pending_payment' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono border" style={{ background: isDark ? '#27272A' : '#F4F4F5', borderColor, color: textSecondary }}>
                        <FontAwesomeIcon icon={faClock} className="text-[8px]" />
                        Menunggu Pembayaran Orang Tua
                      </span>
                    )}
                    {selectedApplication.form_fee_status === 'rejected' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono border" style={{ background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC', borderColor: isDark ? '#DC2626' : '#FECACA', color: isDark ? '#F87171' : '#9F2F2D' }}>
                        <FontAwesomeIcon icon={faTimes} className="text-[8px]" />
                        Bukti Transfer Ditolak
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase block" style={{ color: textSecondary }}>Kelengkapan Formulir Siswa:</span>
                    {selectedApplication.is_form_completed ? (
                      <span className="font-medium" style={{ color: isDark ? '#34D399' : '#346538' }}>Sudah Dilengkapi oleh Orang Tua</span>
                    ) : (
                      <span className="font-medium" style={{ color: isDark ? '#FBBF24' : '#956400' }}>Belum Lengkap (Hanya Data Awal)</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase block" style={{ color: textSecondary }}>Waktu Verifikasi:</span>
                    <span className="font-medium font-mono" style={{ color: textPrimary }}>
                      {selectedApplication.verified_at ? formatDate(selectedApplication.verified_at) : '-'}
                    </span>
                  </div>
                </div>

                {/* Bukti Transfer Action / Preview */}
                <div className="pt-2 flex items-center justify-between flex-wrap gap-2 border-t" style={{ borderColor }}>
                  <div className="flex items-center gap-2">
                    {selectedApplication.payment_proof_file ? (
                      <a
                        href={`/api/admission/${selectedApplication.application_id}/proof`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ background: cardBg, borderColor, color: isDark ? '#60A5FA' : '#0284C7', borderRadius: '6px' }}
                      >
                        <FontAwesomeIcon icon={faEye} />
                        Lihat Bukti Transfer
                      </a>
                    ) : (
                      <span className="text-[11px] italic" style={{ color: textSecondary }}>Belum ada file bukti transfer</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedApplication.form_fee_status !== 'verified' && (
                      <button
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border rounded transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        style={{ background: cardBg, borderColor: isDark ? '#059669' : '#A7F3D0', color: isDark ? '#34D399' : '#059669', borderRadius: '6px' }}
                        onClick={() => handleVerifyFormFee(selectedApplication.application_id, 'verified')}
                        disabled={processing}
                      >
                        <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                        Setujui Pembayaran Formulir
                      </button>
                    )}
                    {selectedApplication.form_fee_status !== 'rejected' && (
                      <button
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border rounded transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        style={{ background: cardBg, borderColor: isDark ? '#DC2626' : '#FECACA', color: isDark ? '#F87171' : '#DC2626', borderRadius: '6px' }}
                        onClick={() => handleVerifyFormFee(selectedApplication.application_id, 'rejected')}
                        disabled={processing}
                      >
                        <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                        Tolak Bukti Transfer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Student Info */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-wider" style={{ color: textPrimary }}>
                <FontAwesomeIcon icon={faUser} style={{ color: textSecondary }} />
                {t('admission.studentData.title')}
              </h3>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', border: '1px solid ' + borderColor, borderRadius: '8px' }}>
                  <div>
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.fullNameRequired')}</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.student_name} onChange={(e) => setEditData(p => ({ ...p, student_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.nickname')}</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.student_nickname} onChange={(e) => setEditData(p => ({ ...p, student_nickname: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.gender')}</Label>
                    <select className="mt-1 w-full px-3 py-2 rounded-md focus:outline-none" style={selectStyle} value={editData.student_gender} onChange={(e) => setEditData(p => ({ ...p, student_gender: e.target.value }))}>
                      <option value="">{t('admission.studentData.selectGender')}</option>
                      <option value="male">{t('admission.studentData.male')}</option>
                      <option value="female">{t('admission.studentData.female')}</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.birthPlace')}</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.student_birth_place} onChange={(e) => setEditData(p => ({ ...p, student_birth_place: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.birthDate')}</Label>
                    <Input type="date" className="mt-1" style={inputStyle} value={editData.student_birth_date} onChange={(e) => setEditData(p => ({ ...p, student_birth_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.religion')}</Label>
                    <select
                      className="mt-1 w-full px-3 py-2 rounded-md focus:outline-none"
                      style={selectStyle}
                      value={editData.student_religion}
                      onChange={(e) => setEditData(p => ({ ...p, student_religion: e.target.value }))}
                    >
                      <option value="">{t('admission.studentData.selectReligion')}</option>
                      <option value="Islam">Islam</option>
                      <option value="Kristen">Kristen</option>
                      <option value="Katolik">Katolik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Buddha">Buddha</option>
                      <option value="Konghucu">Konghucu</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.nationality')}</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.student_nationality} onChange={(e) => setEditData(p => ({ ...p, student_nationality: e.target.value }))} />
                  </div>
                  <div className="relative">
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.city')}</Label>
                    <Input 
                      className="mt-1" 
                      style={inputStyle}
                      value={editCitySearch} 
                      onChange={(e) => {
                        setEditCitySearch(e.target.value);
                        setShowEditCityDropdown(e.target.value.length >= 1);
                        setEditData(p => ({ ...p, student_city: e.target.value, student_province: '' }));
                      }}
                      onFocus={() => editCitySearch.length >= 1 && setShowEditCityDropdown(true)}
                      placeholder={t('admission.studentData.typeCityPlaceholder')}
                    />
                    {showEditCityDropdown && (() => {
                      const filtered = allCities.filter(c => c.toLowerCase().includes(editCitySearch.toLowerCase())).slice(0, 8);
                      return filtered.length > 0 ? (
                        <div className="absolute z-50 w-full mt-1 border rounded-md shadow-lg max-h-48 overflow-y-auto" style={{ background: cardBg, borderColor }}>
                          {filtered.map(city => (
                            <button
                              key={city}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ color: textPrimary }}
                              onClick={() => {
                                const province = getProvinceByCity(city);
                                setEditData(p => ({ ...p, student_city: city, student_province: province }));
                                setEditCitySearch(city);
                                setShowEditCityDropdown(false);
                              }}
                            >
                              <span className="font-medium">{city}</span>
                              <span className="ml-2 text-xs" style={{ color: textSecondary }}>({getProvinceByCity(city)})</span>
                            </button>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div>
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.province')}</Label>
                    <Input className="mt-1" style={{ ...inputStyle, opacity: 0.7 }} value={editData.student_province} readOnly placeholder={t('admission.studentData.autoFilled')} />
                  </div>
                  <div>
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.postalCode')}</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.student_postal_code} onChange={(e) => setEditData(p => ({ ...p, student_postal_code: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.addressID')}</Label>
                    <textarea className="mt-1 w-full px-3 py-2 rounded-md focus:outline-none" style={inputStyle} rows={2} value={editData.student_address} onChange={(e) => setEditData(p => ({ ...p, student_address: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.domicileAddress')}</Label>
                    <textarea className="mt-1 w-full px-3 py-2 rounded-md focus:outline-none" style={inputStyle} rows={2} value={editData.student_domicile_address} onChange={(e) => setEditData(p => ({ ...p, student_domicile_address: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.prevSchool')}</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.student_previous_school} onChange={(e) => setEditData(p => ({ ...p, student_previous_school: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', border: '1px solid ' + borderColor, borderRadius: '8px' }}>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.fullName')}</p>
                    <p className="text-sm font-medium" style={{ color: textPrimary }}>{selectedApplication.student_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.nickname')}</p>
                    <p className="text-sm font-medium" style={{ color: textPrimary }}>{selectedApplication.student_nickname || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.gender')}</p>
                    <p className="text-sm font-medium" style={{ color: textPrimary }}>{selectedApplication.student_gender === 'male' ? t('admission.studentData.male') : selectedApplication.student_gender === 'female' ? t('admission.studentData.female') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.birthPlaceDate')}</p>
                    <p className="text-sm font-medium" style={{ color: textPrimary }}>
                      {selectedApplication.student_birth_place || '-'}, {formatDate(selectedApplication.student_birth_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.religion')}</p>
                    <p className="text-sm font-medium" style={{ color: textPrimary }}>{selectedApplication.student_religion || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.nationality')}</p>
                    <p className="text-sm font-medium" style={{ color: textPrimary }}>{selectedApplication.student_nationality || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.city')}</p>
                    <p className="text-sm font-medium" style={{ color: textPrimary }}>{selectedApplication.student_city || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.province')}</p>
                    <p className="text-sm font-medium" style={{ color: textPrimary }}>{selectedApplication.student_province || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.addressID')}</p>
                    <p className="text-sm font-medium" style={{ color: textPrimary }}>{selectedApplication.student_address || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.domicileAddress')}</p>
                    <p className="text-sm font-medium" style={{ color: textPrimary }}>{selectedApplication.student_domicile_address || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.studentData.prevSchool')}</p>
                    <p className="text-sm font-medium" style={{ color: textPrimary }}>{selectedApplication.student_previous_school || '-'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Parent Info */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-wider" style={{ color: textPrimary }}>
                <FontAwesomeIcon icon={faUser} style={{ color: textSecondary }} />
                {t('admission.parentData.title')}
              </h3>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', border: '1px solid ' + borderColor, borderRadius: '8px' }}>
                  <div>
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.parentData.nik')}</Label>
                    <Input className="mt-1 font-mono" style={inputStyle} value={editData.parent_nik} maxLength={16} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 16); setEditData(p => ({ ...p, parent_nik: val })); }} placeholder={t('admission.parentData.nikPlaceholder')} />
                  </div>
                  <div>
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.parentData.parentNameRequired')}</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.parent_name} onChange={(e) => setEditData(p => ({ ...p, parent_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.parentData.occupation')}</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.parent_occupation} onChange={(e) => setEditData(p => ({ ...p, parent_occupation: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.parentData.phone')}</Label>
                    <Input className="mt-1" style={inputStyle} value={editData.parent_phone} onChange={(e) => setEditData(p => ({ ...p, parent_phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Email</Label>
                    <Input type="email" className="mt-1" style={inputStyle} value={editData.parent_email} onChange={(e) => setEditData(p => ({ ...p, parent_email: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.parentData.address')}</Label>
                    <textarea className="mt-1 w-full px-3 py-2 rounded-md focus:outline-none" style={inputStyle} rows={2} value={editData.parent_address} onChange={(e) => setEditData(p => ({ ...p, parent_address: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', border: '1px solid ' + borderColor, borderRadius: '8px' }}>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.parentData.nik')}</p>
                    <p className="text-sm font-medium font-mono" style={{ color: textPrimary }}>{selectedApplication.parent_nik || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.parentData.parentNameLabel')}</p>
                    <p className="text-sm font-medium" style={{ color: textPrimary }}>{selectedApplication.parent_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.parentData.occupation')}</p>
                    <p className="text-sm font-medium" style={{ color: textPrimary }}>{selectedApplication.parent_occupation || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.parentData.phone')}</p>
                    <p className="text-sm font-medium flex items-center gap-2" style={{ color: textPrimary }}>
                      <FontAwesomeIcon icon={faPhone} style={{ color: textSecondary }} />
                      {selectedApplication.parent_phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>Email</p>
                    <p className="text-sm font-medium flex items-center gap-2" style={{ color: textPrimary }}>
                      <FontAwesomeIcon icon={faEnvelope} style={{ color: textSecondary }} />
                      {selectedApplication.parent_email || '-'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.parentData.address')}</p>
                    <p className="text-sm font-medium" style={{ color: textPrimary }}>{selectedApplication.parent_address || '-'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* School Selection */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-wider" style={{ color: textPrimary }}>
                <FontAwesomeIcon icon={faSchool} style={{ color: textSecondary }} />
                {t('admission.schoolSelection.title')}
              </h3>
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', border: '1px solid ' + borderColor, borderRadius: '8px' }}>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.schoolSelection.levelLabel')}</p>
                  <p className="text-sm font-medium" style={{ color: textPrimary }}>{selectedApplication.level?.level_name || selectedApplication.unit?.unit_name || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.schoolSelection.yearLabel')}</p>
                  <p className="text-sm font-medium" style={{ color: textPrimary }}>{selectedApplication.year?.year_name || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.schoolSelection.academicUnit')}</p>
                  <p className="text-sm font-medium" style={{ color: textPrimary }}>{selectedApplication.unit?.unit_name || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.schoolSelection.registrationDate')}</p>
                  <p className="text-sm font-medium font-mono" style={{ color: textPrimary }}>{formatDateTime(selectedApplication.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            {selectedApplication.additional_notes && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-wider" style={{ color: textPrimary }}>
                  <FontAwesomeIcon icon={faInfoCircle} style={{ color: isDark ? '#FBBF24' : '#B45309' }} />
                  Catatan dari Pendaftar
                </h3>
                <div className="p-4 rounded-lg" style={{ background: isDark ? 'rgba(251, 191, 36, 0.08)' : '#FDFBF7', border: '1px solid ' + (isDark ? 'rgba(251, 191, 36, 0.25)' : '#F3E8D2'), borderRadius: '8px' }}>
                  <p className="text-sm" style={{ color: textPrimary }}>{selectedApplication.additional_notes}</p>
                </div>
              </div>
            )}

            {/* Admin Notes */}
            {selectedApplication.admin_notes && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-wider" style={{ color: textPrimary }}>
                  <FontAwesomeIcon icon={faInfoCircle} style={{ color: isDark ? '#60A5FA' : '#0284C7' }} />
                  Catatan Admin
                </h3>
                <div className="p-4 rounded-lg" style={{ background: isDark ? 'rgba(96, 165, 250, 0.08)' : '#F8FAFC', border: '1px solid ' + (isDark ? 'rgba(96, 165, 250, 0.25)' : '#E2E8F0'), borderRadius: '8px' }}>
                  <p className="text-sm" style={{ color: textPrimary }}>{selectedApplication.admin_notes}</p>
                  {selectedApplication.reviewed_at && (
                    <p className="text-xs mt-2 font-mono" style={{ color: textSecondary }}>
                      {t('admission.notes.updatedAt')} {formatDateTime(selectedApplication.reviewed_at)}
                      {selectedApplication.reviewer && ` ${t('admission.notes.by')} ${selectedApplication.reviewer.user_nama_depan} ${selectedApplication.reviewer.user_nama_belakang}`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ===== Discount / Potongan Section ===== */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-wider" style={{ color: textPrimary }}>
                <FontAwesomeIcon icon={faTag} style={{ color: textSecondary }} />
                {t('admission.discount.title')}
              </h3>

              {discountLoading ? (
                <div className="text-center py-6" style={{ color: textSecondary }}>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl mb-2" />
                  <p className="text-xs font-mono">{t('admission.discount.loadingDiscount')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* UDP Discounts */}
                  {udpDef && (
                    <div className="border rounded-lg overflow-hidden" style={{ borderColor, background: cardBg }}>
                      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderBottom: '1px solid ' + borderColor }}>
                        <div>
                          <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: textPrimary }}>UDP</span>
                          <span className="text-xs font-mono ml-2" style={{ color: textSecondary }}>
                            Biaya Pokok: {formatCurrency(udpDef.total_amount)}
                          </span>
                        </div>
                        <button
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                          style={{ background: cardBg, borderColor, color: textPrimary, borderRadius: '6px' }}
                          onClick={() => { setAddDiscountTarget('udp'); setShowAddDiscount(true); }}
                          disabled={discountSaving}
                        >
                          <FontAwesomeIcon icon={faPlus} className="text-[10px]" /> {t('admission.discount.addBtn')}
                        </button>
                      </div>
                      
                      {(() => {
                        const udpDiscounts = calculateDiscounts(discounts, 'udp');
                        if (udpDiscounts.length === 0) {
                          return (
                            <div className="px-4 py-4 text-center text-xs font-mono" style={{ color: textSecondary }}>
                              {t('admission.discount.noUdpDiscount')}
                            </div>
                          );
                        }
                        return (
                          <div>
                            {udpDiscounts.map((d, idx) => (
                              <div key={d.app_discount_id} className="px-4 py-2.5 flex items-center gap-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5 border-t" style={{ borderColor }}>
                                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-semibold" style={{ background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary, border: '1px solid ' + borderColor }}>
                                  {d.seq}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-xs truncate" style={{ color: textPrimary }}>
                                    {d.discount?.discount_name || d.discount?.discount_code || '-'}
                                  </p>
                                  <p className="text-[11px] font-mono" style={{ color: textSecondary }}>
                                    {d.value_type === 'percentage' ? (
                                      <><FontAwesomeIcon icon={faPercent} className="mr-1" />{d.value}% dari {formatCurrency(d.base_before)}</>
                                    ) : (
                                      <><FontAwesomeIcon icon={faMoneyBill} className="mr-1" />{formatCurrency(d.value)} (nominal)</>
                                    )}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xs font-semibold font-mono" style={{ color: isDark ? '#F87171' : '#DC2626' }}>-{formatCurrency(d.calculated_amount)}</p>
                                  <p className="text-[11px] font-mono" style={{ color: textSecondary }}>→ {formatCurrency(d.subtotal_after)}</p>
                                </div>
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => handleMoveDiscount(d.app_discount_id, 'udp', 'up')}
                                    disabled={idx === 0 || discountSaving}
                                    className="p-1 hover:opacity-100 disabled:opacity-20"
                                    style={{ color: textSecondary }}
                                  >
                                    <FontAwesomeIcon icon={faArrowUp} className="text-[10px]" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveDiscount(d.app_discount_id, 'udp', 'down')}
                                    disabled={idx === udpDiscounts.length - 1 || discountSaving}
                                    className="p-1 hover:opacity-100 disabled:opacity-20"
                                    style={{ color: textSecondary }}
                                  >
                                    <FontAwesomeIcon icon={faArrowDown} className="text-[10px]" />
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleRemoveDiscount(d.app_discount_id, 'udp')}
                                  disabled={discountSaving}
                                  className="p-1 hover:opacity-100 disabled:opacity-20"
                                  style={{ color: isDark ? '#F87171' : '#DC2626' }}
                                >
                                  <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                                </button>
                              </div>
                            ))}
                            {/* Total */}
                            <div className="px-4 py-2.5 flex items-center justify-between border-t" style={{ background: isDark ? 'rgba(52, 211, 153, 0.08)' : '#EDF3EC', borderColor }}>
                              <span className="font-semibold text-xs font-mono uppercase" style={{ color: isDark ? '#34D399' : '#346538' }}>{t('admission.discount.totalUdpDiscount')}</span>
                              <div className="text-right">
                                <p className="font-bold text-xs font-mono" style={{ color: isDark ? '#F87171' : '#DC2626' }}>
                                  -{formatCurrency(udpDiscounts.reduce((sum, d) => sum + d.calculated_amount, 0))}
                                </p>
                                <p className="text-xs font-semibold font-mono" style={{ color: isDark ? '#34D399' : '#346538' }}>
                                  {t('admission.discount.final')} {formatCurrency(udpDiscounts[udpDiscounts.length - 1]?.subtotal_after || udpDef.total_amount)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* USEK Discounts */}
                  {usekDef && (
                    <div className="border rounded-lg overflow-hidden" style={{ borderColor, background: cardBg }}>
                      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderBottom: '1px solid ' + borderColor }}>
                        <div>
                          <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: textPrimary }}>USEK</span>
                          <span className="text-xs font-mono ml-2" style={{ color: textSecondary }}>
                            Biaya Pokok/bulan: {formatCurrency(usekDef.default_amount)}
                          </span>
                        </div>
                        <button
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                          style={{ background: cardBg, borderColor, color: textPrimary, borderRadius: '6px' }}
                          onClick={() => { setAddDiscountTarget('usek'); setShowAddDiscount(true); }}
                          disabled={discountSaving}
                        >
                          <FontAwesomeIcon icon={faPlus} className="text-[10px]" /> {t('admission.discount.addBtn')}
                        </button>
                      </div>
                      
                      {(() => {
                        const usekDiscounts = calculateDiscounts(discounts, 'usek');
                        if (usekDiscounts.length === 0) {
                          return (
                            <div className="px-4 py-4 text-center text-xs font-mono" style={{ color: textSecondary }}>
                              {t('admission.discount.noUsekDiscount')}
                            </div>
                          );
                        }
                        return (
                          <div>
                            {usekDiscounts.map((d, idx) => (
                              <div key={d.app_discount_id} className="px-4 py-2.5 flex items-center gap-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5 border-t" style={{ borderColor }}>
                                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-semibold" style={{ background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary, border: '1px solid ' + borderColor }}>
                                  {d.seq}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-xs truncate" style={{ color: textPrimary }}>
                                    {d.discount?.discount_name || d.discount?.discount_code || '-'}
                                  </p>
                                  <p className="text-[11px] font-mono" style={{ color: textSecondary }}>
                                    {d.value_type === 'percentage' ? (
                                      <><FontAwesomeIcon icon={faPercent} className="mr-1" />{d.value}% dari {formatCurrency(d.base_before)}</>
                                    ) : (
                                      <><FontAwesomeIcon icon={faMoneyBill} className="mr-1" />{formatCurrency(d.value)} (nominal)</>
                                    )}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xs font-semibold font-mono" style={{ color: isDark ? '#F87171' : '#DC2626' }}>-{formatCurrency(d.calculated_amount)}</p>
                                  <p className="text-[11px] font-mono" style={{ color: textSecondary }}>→ {formatCurrency(d.subtotal_after)}</p>
                                </div>
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => handleMoveDiscount(d.app_discount_id, 'usek', 'up')}
                                    disabled={idx === 0 || discountSaving}
                                    className="p-1 hover:opacity-100 disabled:opacity-20"
                                    style={{ color: textSecondary }}
                                  >
                                    <FontAwesomeIcon icon={faArrowUp} className="text-[10px]" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveDiscount(d.app_discount_id, 'usek', 'down')}
                                    disabled={idx === usekDiscounts.length - 1 || discountSaving}
                                    className="p-1 hover:opacity-100 disabled:opacity-20"
                                    style={{ color: textSecondary }}
                                  >
                                    <FontAwesomeIcon icon={faArrowDown} className="text-[10px]" />
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleRemoveDiscount(d.app_discount_id, 'usek')}
                                  disabled={discountSaving}
                                  className="p-1 hover:opacity-100 disabled:opacity-20"
                                  style={{ color: isDark ? '#F87171' : '#DC2626' }}
                                >
                                  <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                                </button>
                              </div>
                            ))}
                            {/* Total */}
                            <div className="px-4 py-2.5 flex items-center justify-between border-t" style={{ background: isDark ? 'rgba(96, 165, 250, 0.08)' : '#E1F3FE', borderColor }}>
                              <span className="font-semibold text-xs font-mono uppercase" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>{t('admission.discount.totalUsekDiscount')}</span>
                              <div className="text-right">
                                <p className="font-bold text-xs font-mono" style={{ color: isDark ? '#F87171' : '#DC2626' }}>
                                  -{formatCurrency(usekDiscounts.reduce((sum, d) => sum + d.calculated_amount, 0))}
                                </p>
                                <p className="text-xs font-semibold font-mono" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
                                  {t('admission.discount.finalPerMonth')} {formatCurrency(usekDiscounts[usekDiscounts.length - 1]?.subtotal_after || usekDef.default_amount)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* No fee definitions */}
                  {!udpDef && !usekDef && (
                    <div className="text-center py-6 border rounded-lg" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor, color: textSecondary }}>
                      <FontAwesomeIcon icon={faInfoCircle} className="text-xl mb-2" />
                      <p className="text-xs font-mono">{t('admission.discount.noFeeDef')}</p>
                      <p className="text-[11px] mt-1 font-mono">{t('admission.discount.setFeeFirst')}</p>
                    </div>
                  )}

                  {/* Add Discount Dropdown */}
                  {showAddDiscount && (
                    <div className="border rounded-lg p-4" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-mono text-xs font-semibold uppercase tracking-wider" style={{ color: textPrimary }}>
                          {t('admission.discount.addDiscountTitle')} {addDiscountTarget === 'udp' ? 'DPP / UDP' : 'SPP / USEK'}
                        </h4>
                        <button onClick={() => setShowAddDiscount(false)} className="hover:opacity-100" style={{ color: textSecondary }}>
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {masterDiscounts
                          .filter(m => m.applies_to === addDiscountTarget || m.applies_to === 'both')
                          .filter(m => !discounts.some(d => d.discount_id === m.discount_id && d.fee_target === addDiscountTarget))
                          .map(m => (
                            <button
                              key={m.discount_id}
                              onClick={() => handleAddDiscount(m.discount_id, addDiscountTarget)}
                              disabled={discountSaving}
                              className="w-full flex items-center justify-between p-2.5 rounded-lg border transition-colors text-left disabled:opacity-50 hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor }}
                            >
                              <div>
                                <p className="font-medium text-xs" style={{ color: textPrimary }}>{m.discount_name}</p>
                                <p className="text-[10px] font-mono" style={{ color: textSecondary }}>{m.discount_code}</p>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border" style={m.discount_type === 'percentage' ? {
                                background: isDark ? 'rgba(168, 85, 247, 0.15)' : '#F3E8FF',
                                color: isDark ? '#C084FC' : '#7E22CE',
                                borderColor: isDark ? '#7E22CE' : '#E9D5FF'
                              } : {
                                background: isDark ? 'rgba(52, 211, 153, 0.15)' : '#EDF3EC',
                                color: isDark ? '#34D399' : '#346538',
                                borderColor: isDark ? '#059669' : '#D1E7DD'
                              }}>
                                {m.discount_type === 'percentage' ? `${m.discount_value}%` : formatCurrency(m.discount_value)}
                              </span>
                            </button>
                          ))
                        }
                        {masterDiscounts
                          .filter(m => m.applies_to === addDiscountTarget || m.applies_to === 'both')
                          .filter(m => !discounts.some(d => d.discount_id === m.discount_id && d.fee_target === addDiscountTarget))
                          .length === 0 && (
                          <p className="text-center text-xs font-mono py-3" style={{ color: textSecondary }}>
                            Tidak ada potongan tersedia untuk {addDiscountTarget === 'udp' ? 'DPP / UDP' : 'SPP / USEK'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Riwayat Pengiriman Email */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2 text-xs font-mono uppercase tracking-wider" style={{ color: textPrimary }}>
                  <FontAwesomeIcon icon={faEnvelope} style={{ color: textSecondary }} />
                  Riwayat Pengiriman Email
                </h3>
                {selectedApplication.parent_email && (
                  <button
                    onClick={() => handleResendPaymentEmail(selectedApplication)}
                    disabled={resendingEmailId === selectedApplication.application_id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium border rounded transition-colors disabled:opacity-50 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                    style={{
                      background: isDark ? 'rgba(56, 189, 248, 0.12)' : '#F0F9FF',
                      borderColor: isDark ? '#0284C7' : '#BAE6FD',
                      color: isDark ? '#38BDF8' : '#0369A1',
                      borderRadius: '6px'
                    }}
                  >
                    {resendingEmailId === selectedApplication.application_id ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[10px]" />
                        <span>Mengirim Ulang...</span>
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faPaperPlane} className="text-[10px]" />
                        <span>Kirim Ulang Email Tagihan & Rekening</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {detailLogsLoading ? (
                <div className="p-4 rounded-lg text-center" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', border: '1px solid ' + borderColor }}>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm" style={{ color: textSecondary }} />
                  <span className="text-xs font-mono ml-2" style={{ color: textSecondary }}>Memeriksa status pengiriman email...</span>
                </div>
              ) : detailApplicantLogs.length > 0 ? (
                <div className="space-y-2">
                  {detailApplicantLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold" style={{ color: textPrimary }}>{getEmailTypeLabel(log.email_type)}</span>
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
                        <p className="text-[11px] font-mono mt-0.5" style={{ color: textSecondary }}>
                          Subjek: {log.subject}
                        </p>
                      </div>
                      <div className="text-right sm:self-center">
                        <span className="text-[11px] font-mono" style={{ color: textSecondary }}>
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg text-center" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', border: '1px solid ' + borderColor }}>
                  <p className="text-xs font-mono" style={{ color: textSecondary }}>
                    {selectedApplication.parent_email 
                      ? `Belum ada riwayat email tercatat untuk ${selectedApplication.parent_email}` 
                      : 'Pendaftar ini belum memiliki alamat email'}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5 pt-4 border-t" style={{ borderColor }}>
              <button
                className="px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider border rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor, color: textSecondary, borderRadius: '6px' }}
                onClick={() => setShowDetailModal(false)}
              >
                {t('admission.detail.closeBtn')}
              </button>
              {selectedApplication.status === 'pending' && (
                <>
                  <button
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider border rounded transition-colors"
                    style={{ background: isDark ? '#059669' : '#10B981', color: '#FFFFFF', borderColor: isDark ? '#047857' : '#059669', borderRadius: '6px' }}
                    onClick={() => {
                      setShowDetailModal(false);
                      handleActionClick(selectedApplication, 'approved');
                    }}
                  >
                    <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                    {t('admission.detail.approveBtn')}
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider border rounded transition-colors"
                    style={{ background: isDark ? '#DC2626' : '#EF4444', color: '#FFFFFF', borderColor: isDark ? '#B91C1C' : '#DC2626', borderRadius: '6px' }}
                    onClick={() => {
                      setShowDetailModal(false);
                      handleActionClick(selectedApplication, 'rejected');
                    }}
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                    {t('admission.detail.rejectBtn')}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        title={actionType === 'approved' ? t('admission.action.approvalTitle') : t('admission.action.rejectionTitle')}
      >
        {selectedApplication && (
          <div className="space-y-4">
            <p className="text-xs font-mono" style={{ color: textSecondary }}>
              {actionType === 'approved' && t('admission.action.willApprove')}
              {actionType === 'rejected' && t('admission.action.willReject')}
            </p>

            <div className="p-3.5 rounded-lg border" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor }}>
              <p className="font-semibold text-sm" style={{ color: textPrimary }}>{selectedApplication.student_name}</p>
              <p className="text-xs font-mono mt-0.5" style={{ color: textSecondary }}>{selectedApplication.application_number}</p>
            </div>

            <div>
              <Label htmlFor="admin_notes" className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.notes.notesOptional')}</Label>
              <textarea
                id="admin_notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                placeholder={t('admission.notes.notesPlaceholder')}
                className="mt-1.5 w-full px-3 py-2 rounded-md focus:outline-none"
                style={inputStyle}
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t" style={{ borderColor }}>
              <button
                className="px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider border rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
                style={{ borderColor, color: textSecondary, borderRadius: '6px' }}
                onClick={() => setShowActionModal(false)}
                disabled={processing}
              >
                {t('admission.detail.cancelBtn')}
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={processing}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider border rounded transition-colors disabled:opacity-50"
                style={actionType === 'approved' ? {
                  background: isDark ? '#059669' : '#10B981',
                  borderColor: isDark ? '#047857' : '#059669',
                  color: '#FFFFFF',
                  borderRadius: '6px'
                } : {
                  background: isDark ? '#DC2626' : '#EF4444',
                  borderColor: isDark ? '#B91C1C' : '#DC2626',
                  color: '#FFFFFF',
                  borderRadius: '6px'
                }}
              >
                {processing ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[10px]" />
                    {t('admission.action.processing')}
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon 
                      icon={actionType === 'approved' ? faCheck : faTimes} 
                      className="text-[10px]" 
                    />
                    {actionType === 'approved' ? t('admission.action.confirmApprove') : t('admission.action.confirmReject')}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Discount Modal */}
      <Modal
        isOpen={showDiscountModal}
        onClose={() => { 
          setShowDiscountModal(false); 
          setShowAddDiscount(false);
          // Refresh discounts for table display
          supabase.from('application_discount').select('*, discount:discount_id(discount_name, discount_code)').order('fee_target').order('seq').then(({ data }) => setAllAppDiscounts(data || []));
        }}
        title={`${t('admission.discountModal.title')} - ${selectedApplication?.student_name || ''}`}
        size="lg"
      >
        {selectedApplication && (
          <div className="space-y-4">
            {/* Application Info */}
            <div className="p-3.5 rounded-lg border flex items-center justify-between" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor }}>
              <div>
                <p className="font-semibold text-sm" style={{ color: textPrimary }}>{selectedApplication.student_name}</p>
                <p className="text-xs font-mono mt-0.5" style={{ color: textSecondary }}>
                  {selectedApplication.application_number} • {selectedApplication.level?.level_name || selectedApplication.unit?.unit_name || '-'} • {selectedApplication.year?.year_name || '-'}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border" style={statusPillStyles[selectedApplication?.status] || statusPillStyles.pending}>
                <FontAwesomeIcon icon={statusConfig[selectedApplication?.status]?.icon || faClock} className="text-[10px]" />
                {statusLabels[selectedApplication?.status] || selectedApplication?.status || '-'}
              </span>
            </div>

            {discountLoading ? (
              <div className="flex justify-center py-8" style={{ color: textSecondary }}>
                <FontAwesomeIcon icon={faSpinner} className="text-xl animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* UDP Discounts */}
                {udpDef && (
                  <div className="border rounded-lg overflow-hidden" style={{ borderColor, background: cardBg }}>
                    <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderBottom: '1px solid ' + borderColor }}>
                      <div>
                        <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: textPrimary }}>UDP</span>
                        <span className="text-xs font-mono ml-2" style={{ color: textSecondary }}>
                          Biaya Pokok: {formatCurrency(udpDef.total_amount)}
                        </span>
                      </div>
                      <button
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ background: cardBg, borderColor, color: textPrimary, borderRadius: '6px' }}
                        onClick={() => { setAddDiscountTarget('udp'); setShowAddDiscount(true); }}
                        disabled={discountSaving}
                      >
                        <FontAwesomeIcon icon={faPlus} className="text-[10px]" /> {t('admission.discount.addBtn')}
                      </button>
                    </div>
                    {(() => {
                      const udpDiscounts = calculateDiscounts(discounts, 'udp');
                      if (udpDiscounts.length === 0) {
                        return <div className="px-4 py-4 text-center text-xs font-mono" style={{ color: textSecondary }}>{t('admission.discount.noUdpDiscount')}</div>;
                      }
                      return (
                        <div>
                          {udpDiscounts.map((d, idx) => (
                            <div key={d.app_discount_id} className="px-4 py-2.5 flex items-center gap-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5 border-t" style={{ borderColor }}>
                              <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-semibold" style={{ background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary, border: '1px solid ' + borderColor }}>{d.seq}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-xs truncate" style={{ color: textPrimary }}>{d.discount?.discount_name || '-'}</p>
                                <p className="text-[11px] font-mono" style={{ color: textSecondary }}>
                                  {d.value_type === 'percentage' ? <><FontAwesomeIcon icon={faPercent} className="mr-1" />{d.value}% dari {formatCurrency(d.base_before)}</> : <><FontAwesomeIcon icon={faMoneyBill} className="mr-1" />{formatCurrency(d.value)} (nominal)</>}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs font-semibold font-mono" style={{ color: isDark ? '#F87171' : '#DC2626' }}>-{formatCurrency(d.calculated_amount)}</p>
                                <p className="text-[11px] font-mono" style={{ color: textSecondary }}>→ {formatCurrency(d.subtotal_after)}</p>
                              </div>
                              <div className="flex flex-col gap-1 flex-shrink-0">
                                <button onClick={() => handleMoveDiscount(d.app_discount_id, 'udp', 'up')} disabled={idx === 0 || discountSaving} className="p-1 hover:opacity-100 disabled:opacity-20" style={{ color: textSecondary }}><FontAwesomeIcon icon={faArrowUp} className="text-[10px]" /></button>
                                <button onClick={() => handleMoveDiscount(d.app_discount_id, 'udp', 'down')} disabled={idx === udpDiscounts.length - 1 || discountSaving} className="p-1 hover:opacity-100 disabled:opacity-20" style={{ color: textSecondary }}><FontAwesomeIcon icon={faArrowDown} className="text-[10px]" /></button>
                              </div>
                              <button onClick={() => handleRemoveDiscount(d.app_discount_id, 'udp')} disabled={discountSaving} className="p-1 hover:opacity-100 disabled:opacity-20" style={{ color: isDark ? '#F87171' : '#DC2626' }}><FontAwesomeIcon icon={faTrash} className="text-[10px]" /></button>
                            </div>
                          ))}
                          <div className="px-4 py-2.5 flex items-center justify-between border-t" style={{ background: isDark ? 'rgba(52, 211, 153, 0.08)' : '#EDF3EC', borderColor }}>
                            <span className="font-semibold text-xs font-mono uppercase" style={{ color: isDark ? '#34D399' : '#346538' }}>{t('admission.discount.totalUdpDiscount')}</span>
                            <div className="text-right">
                              <p className="font-bold text-xs font-mono" style={{ color: isDark ? '#F87171' : '#DC2626' }}>-{formatCurrency(udpDiscounts.reduce((sum, d) => sum + d.calculated_amount, 0))}</p>
                              <p className="text-xs font-semibold font-mono" style={{ color: isDark ? '#34D399' : '#346538' }}>{t('admission.discount.final')}: {formatCurrency(udpDiscounts[udpDiscounts.length - 1]?.subtotal_after || udpDef.total_amount)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* USEK Discounts */}
                {usekDef && (
                  <div className="border rounded-lg overflow-hidden" style={{ borderColor, background: cardBg }}>
                    <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderBottom: '1px solid ' + borderColor }}>
                      <div>
                        <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: textPrimary }}>USEK</span>
                        <span className="text-xs font-mono ml-2" style={{ color: textSecondary }}>
                          Biaya Pokok/bulan: {formatCurrency(usekDef.default_amount)}
                        </span>
                      </div>
                      <button
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ background: cardBg, borderColor, color: textPrimary, borderRadius: '6px' }}
                        onClick={() => { setAddDiscountTarget('usek'); setShowAddDiscount(true); }}
                        disabled={discountSaving}
                      >
                        <FontAwesomeIcon icon={faPlus} className="text-[10px]" /> {t('admission.discount.addBtn')}
                      </button>
                    </div>
                    {(() => {
                      const usekDiscounts = calculateDiscounts(discounts, 'usek');
                      if (usekDiscounts.length === 0) {
                        return <div className="px-4 py-4 text-center text-xs font-mono" style={{ color: textSecondary }}>{t('admission.discount.noUsekDiscount')}</div>;
                      }
                      return (
                        <div>
                          {usekDiscounts.map((d, idx) => (
                            <div key={d.app_discount_id} className="px-4 py-2.5 flex items-center gap-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5 border-t" style={{ borderColor }}>
                              <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-semibold" style={{ background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary, border: '1px solid ' + borderColor }}>{d.seq}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-xs truncate" style={{ color: textPrimary }}>{d.discount?.discount_name || '-'}</p>
                                <p className="text-[11px] font-mono" style={{ color: textSecondary }}>
                                  {d.value_type === 'percentage' ? <><FontAwesomeIcon icon={faPercent} className="mr-1" />{d.value}% dari {formatCurrency(d.base_before)}</> : <><FontAwesomeIcon icon={faMoneyBill} className="mr-1" />{formatCurrency(d.value)} (nominal)</>}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs font-semibold font-mono" style={{ color: isDark ? '#F87171' : '#DC2626' }}>-{formatCurrency(d.calculated_amount)}</p>
                                <p className="text-[11px] font-mono" style={{ color: textSecondary }}>→ {formatCurrency(d.subtotal_after)}</p>
                              </div>
                              <div className="flex flex-col gap-1 flex-shrink-0">
                                <button onClick={() => handleMoveDiscount(d.app_discount_id, 'usek', 'up')} disabled={idx === 0 || discountSaving} className="p-1 hover:opacity-100 disabled:opacity-20" style={{ color: textSecondary }}><FontAwesomeIcon icon={faArrowUp} className="text-[10px]" /></button>
                                <button onClick={() => handleMoveDiscount(d.app_discount_id, 'usek', 'down')} disabled={idx === usekDiscounts.length - 1 || discountSaving} className="p-1 hover:opacity-100 disabled:opacity-20" style={{ color: textSecondary }}><FontAwesomeIcon icon={faArrowDown} className="text-[10px]" /></button>
                              </div>
                              <button onClick={() => handleRemoveDiscount(d.app_discount_id, 'usek')} disabled={discountSaving} className="p-1 hover:opacity-100 disabled:opacity-20" style={{ color: isDark ? '#F87171' : '#DC2626' }}><FontAwesomeIcon icon={faTrash} className="text-[10px]" /></button>
                            </div>
                          ))}
                          <div className="px-4 py-2.5 flex items-center justify-between border-t" style={{ background: isDark ? 'rgba(96, 165, 250, 0.08)' : '#E1F3FE', borderColor }}>
                            <span className="font-semibold text-xs font-mono uppercase" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>{t('admission.discount.totalUsekDiscount')}</span>
                            <div className="text-right">
                              <p className="font-bold text-xs font-mono" style={{ color: isDark ? '#F87171' : '#DC2626' }}>-{formatCurrency(usekDiscounts.reduce((sum, d) => sum + d.calculated_amount, 0))}</p>
                              <p className="text-xs font-semibold font-mono" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>{t('admission.discount.finalPerMonth')}: {formatCurrency(usekDiscounts[usekDiscounts.length - 1]?.subtotal_after || usekDef.default_amount)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* No fee definitions */}
                {!udpDef && !usekDef && (
                  <div className="text-center py-6 border rounded-lg" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor, color: textSecondary }}>
                    <FontAwesomeIcon icon={faInfoCircle} className="text-xl mb-2" />
                    <p className="text-xs font-mono">{t('admission.discount.noFeeDef')}</p>
                    <p className="text-[11px] mt-1 font-mono">{t('admission.discount.setFeeFirst')}</p>
                  </div>
                )}

                {/* Add Discount Picker */}
                {showAddDiscount && (
                  <div className="border rounded-lg p-4" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-mono text-xs font-semibold uppercase tracking-wider" style={{ color: textPrimary }}>
                        {t('admission.discount.addDiscountTitle')} {addDiscountTarget === 'udp' ? 'DPP / UDP' : 'SPP / USEK'}
                      </h4>
                      <button onClick={() => setShowAddDiscount(false)} className="hover:opacity-100" style={{ color: textSecondary }}>
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {masterDiscounts
                        .filter(m => m.applies_to === addDiscountTarget || m.applies_to === 'both')
                        .filter(m => !discounts.some(d => d.discount_id === m.discount_id && d.fee_target === addDiscountTarget))
                        .map(m => (
                          <button
                            key={m.discount_id}
                            onClick={() => handleAddDiscount(m.discount_id, addDiscountTarget)}
                            disabled={discountSaving}
                            className="w-full flex items-center justify-between p-2.5 rounded-lg border transition-colors text-left disabled:opacity-50 hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor }}
                          >
                            <div>
                              <p className="font-medium text-xs" style={{ color: textPrimary }}>{m.discount_name}</p>
                              <p className="text-[10px] font-mono" style={{ color: textSecondary }}>{m.discount_code}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border" style={m.discount_type === 'percentage' ? {
                              background: isDark ? 'rgba(168, 85, 247, 0.15)' : '#F3E8FF',
                              color: isDark ? '#C084FC' : '#7E22CE',
                              borderColor: isDark ? '#7E22CE' : '#E9D5FF'
                            } : {
                              background: isDark ? 'rgba(52, 211, 153, 0.15)' : '#EDF3EC',
                              color: isDark ? '#34D399' : '#346538',
                              borderColor: isDark ? '#059669' : '#D1E7DD'
                            }}>
                              {m.discount_type === 'percentage' ? `${m.discount_value}%` : formatCurrency(m.discount_value)}
                            </span>
                          </button>
                        ))
                      }
                      {masterDiscounts
                        .filter(m => m.applies_to === addDiscountTarget || m.applies_to === 'both')
                        .filter(m => !discounts.some(d => d.discount_id === m.discount_id && d.fee_target === addDiscountTarget))
                        .length === 0 && (
                        <p className="text-center text-xs font-mono py-3" style={{ color: textSecondary }}>
                          Tidak ada potongan tersedia untuk {addDiscountTarget === 'udp' ? 'DPP / UDP' : 'SPP / USEK'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Installment Modal */}
      <Modal
        isOpen={showInstallmentModal}
        onClose={() => setShowInstallmentModal(false)}
        title={`${t('admission.installment.title')} - ${selectedApplication?.student_name || ''}`}
        size="lg"
      >
        {selectedApplication && (
          <div className="space-y-4">
            {/* Application Info */}
            <div className="p-3.5 rounded-lg border flex items-center justify-between" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor }}>
              <div>
                <p className="font-semibold text-sm" style={{ color: textPrimary }}>{selectedApplication.student_name}</p>
                <p className="text-xs font-mono mt-0.5" style={{ color: textSecondary }}>
                  {selectedApplication.application_number} • {selectedApplication.level?.level_name || selectedApplication.unit?.unit_name || '-'} • {selectedApplication.year?.year_name || '-'}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border" style={statusPillStyles[selectedApplication?.status] || statusPillStyles.pending}>
                <FontAwesomeIcon icon={statusConfig[selectedApplication?.status]?.icon || faClock} className="text-[10px]" />
                {statusLabels[selectedApplication?.status] || selectedApplication?.status || '-'}
              </span>
            </div>

            {installmentLoading ? (
              <div className="flex justify-center py-8" style={{ color: textSecondary }}>
                <FontAwesomeIcon icon={faSpinner} className="text-xl animate-spin" />
              </div>
            ) : (() => {
              const feeInfo = getAppFeeInfo(selectedApplication);
              const hasAnyFee = feeInfo.udpFinal > 0 || feeInfo.usekFinal > 0;
              if (!hasAnyFee) {
                return (
                  <div className="text-center py-6 border rounded-lg" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor, color: textSecondary }}>
                    <FontAwesomeIcon icon={faInfoCircle} className="text-xl mb-2" />
                    <p className="text-xs font-mono">{t('admission.installment.noFeeDef')}</p>
                    <p className="text-[11px] mt-1 font-mono">{t('admission.installment.setFeeFirst')}</p>
                  </div>
                );
              }

              const calc = calculateInstallmentSchedule();
              if (!calc) return null;
              const existingPlan = allInstallments.find(inst => inst.application_id === selectedApplication.application_id);

              return (
                <div className="space-y-4">
                  {/* Fee Summary */}
                  <div className="border rounded-lg overflow-hidden" style={{ borderColor, background: cardBg }}>
                    <div className="px-4 py-2.5" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderBottom: '1px solid ' + borderColor }}>
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider" style={{ color: textPrimary }}>{t('admission.installment.feeSummary')}</span>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span style={{ color: textSecondary }}>{t('admission.installment.udpAfterDiscount')}</span>
                        <span className="font-medium" style={{ color: textPrimary }}>{formatCurrency(calc.udpFinal)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span style={{ color: textSecondary }}>{t('admission.installment.sppFirstMonth')}</span>
                        <span className="font-medium" style={{ color: textPrimary }}>{formatCurrency(calc.sppFinal)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between text-xs font-mono font-bold" style={{ borderColor }}>
                        <span className="uppercase" style={{ color: textPrimary }}>{t('admission.installment.totalEntryFee')}</span>
                        <span style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>{formatCurrency(calc.totalEntry)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Configuration */}
                  <div className="border rounded-lg p-4 space-y-3" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor }}>
                    <h4 className="font-mono text-xs font-semibold uppercase tracking-wider" style={{ color: textPrimary }}>{t('admission.installment.settings')}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.installment.utjPercentage')}</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          className="mt-1"
                          style={inputStyle}
                          value={installmentConfig.utj_percentage}
                          onChange={(e) => setInstallmentConfig(p => ({ ...p, utj_percentage: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) }))}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.installment.numInstallments')}</Label>
                        <Input
                          type="number"
                          min="1"
                          max="24"
                          className="mt-1"
                          style={inputStyle}
                          value={installmentConfig.num_installments}
                          onChange={(e) => setInstallmentConfig(p => ({ ...p, num_installments: Math.min(24, Math.max(1, parseInt(e.target.value) || 1)) }))}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.installment.startMonth')}</Label>
                        <select
                          className="mt-1 w-full px-3 py-2 rounded-md text-xs font-mono focus:outline-none"
                          style={selectStyle}
                          value={installmentConfig.start_month}
                          onChange={(e) => setInstallmentConfig(p => ({ ...p, start_month: parseInt(e.target.value) }))}
                        >
                          {monthNames.map((m, idx) => (
                            <option key={idx} value={idx + 1}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.installment.startYear')}</Label>
                        <Input
                          type="number"
                          min="2020"
                          max="2040"
                          className="mt-1"
                          style={inputStyle}
                          value={installmentConfig.start_year}
                          onChange={(e) => setInstallmentConfig(p => ({ ...p, start_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.installment.notesLabel')}</Label>
                      <Input
                        className="mt-1"
                        style={inputStyle}
                        placeholder={t('admission.installment.notesPlaceholder')}
                        value={installmentConfig.notes}
                        onChange={(e) => setInstallmentConfig(p => ({ ...p, notes: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* UTJ Info */}
                  <div className="rounded-lg overflow-hidden" style={{ background: isDark ? 'rgba(251, 191, 36, 0.08)' : '#FBF3DB', border: '1px solid ' + (isDark ? 'rgba(251, 191, 36, 0.25)' : '#F5E8B7') }}>
                    <div className="px-4 py-2.5 flex items-center justify-between">
                      <span className="font-mono text-xs uppercase font-semibold" style={{ color: isDark ? '#FBBF24' : '#956400' }}>{t('admission.installment.utjSection')}</span>
                      <span className="font-mono text-sm font-bold" style={{ color: isDark ? '#FBBF24' : '#956400' }}>{formatCurrency(calc.utjAmount)}</span>
                    </div>
                    <div className="px-4 pb-2.5 text-[11px] font-mono" style={{ color: isDark ? 'rgba(251, 191, 36, 0.8)' : '#956400' }}>
                      {installmentConfig.utj_percentage}% {t('admission.installment.utjInfoOf')} {formatCurrency(calc.totalEntry)} — {t('admission.installment.utjInfoIncluded')}
                    </div>
                  </div>

                  {/* Remaining & Monthly */}
                  <div className="rounded-lg overflow-hidden" style={{ background: isDark ? 'rgba(96, 165, 250, 0.08)' : '#E1F3FE', border: '1px solid ' + (isDark ? 'rgba(96, 165, 250, 0.25)' : '#C9E7FE') }}>
                    <div className="px-4 py-2.5 flex items-center justify-between">
                      <span className="font-mono text-xs uppercase font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>{t('admission.installment.remainingSection')}</span>
                      <span className="font-mono text-sm font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>{formatCurrency(calc.remaining)}</span>
                    </div>
                    <div className="px-4 pb-2.5 text-[11px] font-mono" style={{ color: isDark ? 'rgba(96, 165, 250, 0.8)' : '#0284C7' }}>
                      {t('admission.installment.remainingInfoDivided')} {calc.numInst} {t('admission.installment.remainingInfoMonths')} — {formatCurrency(calc.monthlyAmount)}{t('admission.installment.remainingInfoPerMonth')}
                      {calc.lastMonthAmount !== calc.monthlyAmount && (
                        <span className="ml-1">({t('admission.installment.lastInstallment')}: {formatCurrency(calc.lastMonthAmount)})</span>
                      )}
                    </div>
                  </div>

                  {/* Schedule Table */}
                  <div className="border rounded-lg overflow-hidden" style={{ borderColor, background: cardBg }}>
                    <div className="px-4 py-2.5" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderBottom: '1px solid ' + borderColor }}>
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider" style={{ color: textPrimary }}>{t('admission.installment.scheduleTitle')}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b" style={{ background: isDark ? '#18181B' : '#FAFAF9', borderColor }}>
                            <th className="px-4 py-2 text-left w-12 text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>No</th>
                            <th className="px-4 py-2 text-left text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.installment.scheduleColDescription')}</th>
                            <th className="px-4 py-2 text-right text-[10px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>{t('admission.installment.scheduleColAmount')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor }}>
                          {calc.items.map((item) => (
                            <tr key={item.seq} className="transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={item.seq === 1 ? { background: isDark ? 'rgba(251, 191, 36, 0.06)' : 'rgba(251, 243, 219, 0.5)' } : {}}>
                              <td className="px-4 py-2 font-mono" style={{ color: textSecondary }}>{item.seq}</td>
                              <td className="px-4 py-2">
                                <span className="font-medium" style={{ color: item.seq === 1 ? (isDark ? '#FBBF24' : '#956400') : textPrimary }}>{item.label}</span>
                                {item.info && <p className="text-[10px] font-mono mt-0.5" style={{ color: textSecondary }}>{item.info}</p>}
                              </td>
                              <td className="px-4 py-2 text-right font-mono font-semibold" style={{ color: item.seq === 1 ? (isDark ? '#FBBF24' : '#956400') : textPrimary }}>
                                {formatCurrency(item.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="font-bold border-t" style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor }}>
                            <td className="px-4 py-2.5 font-mono text-xs uppercase" colSpan="2" style={{ color: textPrimary }}>{t('admission.installment.total')}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-xs" style={{ color: textPrimary }}>{formatCurrency(calc.items.reduce((sum, i) => sum + i.amount, 0))}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      {existingPlan && (
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border rounded transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50"
                          style={{ borderColor: isDark ? '#DC2626' : '#FECACA', color: isDark ? '#F87171' : '#DC2626', borderRadius: '6px' }}
                          onClick={handleDeleteInstallment}
                          disabled={installmentSaving}
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-[10px]" /> {t('admission.installment.deleteScheme')}
                        </button>
                      )}
                      {existingPlan && (
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border rounded transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          style={{ borderColor: isDark ? '#2563EB' : '#BFDBFE', color: isDark ? '#60A5FA' : '#2563EB', borderRadius: '6px' }}
                          onClick={handlePrintInstallment}
                        >
                          <FontAwesomeIcon icon={faPrint} className="text-[10px]" /> {t('admission.installment.printPdf')}
                        </button>
                      )}
                      {existingPlan && (
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border rounded transition-colors hover:bg-purple-50 dark:hover:bg-purple-950/30 disabled:opacity-50"
                          style={{ borderColor: isDark ? '#7E22CE' : '#E9D5FF', color: isDark ? '#C084FC' : '#7E22CE', borderRadius: '6px' }}
                          onClick={handleEmailInstallment}
                          disabled={emailSending || !selectedApplication?.parent_email}
                          title={!selectedApplication?.parent_email ? t('admission.installment.emailNoParent') : t('admission.installment.emailToParent')}
                        >
                          {emailSending ? (
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[10px]" />
                          ) : (
                            <FontAwesomeIcon icon={faEnvelope} className="text-[10px]" />
                          )}
                          {emailSending ? t('admission.installment.sendingEmail') : t('admission.installment.sendEmail')}
                        </button>
                      )}
                    </div>
                    <button
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono uppercase tracking-wider border rounded transition-colors disabled:opacity-50"
                      style={{ background: textPrimary, color: cardBg, borderColor: textPrimary, borderRadius: '6px' }}
                      onClick={handleSaveInstallment}
                      disabled={installmentSaving}
                    >
                      {installmentSaving ? (
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[10px]" />
                      ) : (
                        <FontAwesomeIcon icon={faSave} className="text-[10px]" />
                      )}
                      {existingPlan ? t('admission.installment.updateScheme') : t('admission.installment.saveScheme')}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
}
