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
import * as XLSX from 'xlsx';
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
  faPrint
} from '@fortawesome/free-solid-svg-icons';

const statusConfig = {
  pending: {
    label: 'Menunggu Review',
    icon: faClock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300'
  },
  approved: {
    label: 'Diterima',
    icon: faCheck,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300'
  },
  rejected: {
    label: 'Ditolak',
    icon: faTimes,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300'
  }
};

export default function AdmissionManagement() {
  const router = useRouter();
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

  const handleViewDetail = (application) => {
    setSelectedApplication(application);
    setShowDetailModal(true);
    setIsEditing(false);
    fetchDiscountsForApplication(application);
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
    const monthlyAmount = Math.floor(remaining / numInst);
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
  const handleExportExcel = () => {
    if (filteredApplications.length === 0) {
      showNotification('Info', 'Tidak ada data untuk di-export', 'error');
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
        'Status': statusConfig[app.status]?.label || app.status,
        'UDP (Base)': fee.udpBase,
        'Detail Potongan UDP': udpDetail || '-',
        'Total Potongan UDP': fee.udpBase - fee.udpFinal,
        'UDP (Final)': fee.udpFinal,
        'USEK/bln (Base)': fee.usekBase,
        'Detail Potongan USEK': usekDetail || '-',
        'Total Potongan USEK/bln': fee.usekBase - fee.usekFinal,
        'USEK/bln (Final)': fee.usekFinal,
        'Catatan Admin': app.admin_notes || '',
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 4 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 12 },
      { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 30 },
      { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 20 }, { wch: 22 },
      { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 35 }, { wch: 16 },
      { wch: 16 }, { wch: 16 }, { wch: 35 }, { wch: 18 }, { wch: 16 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Pendaftaran');

    const filterLabel = filterStatus ? statusConfig[filterStatus]?.label : 'Semua';
    const filename = `Laporan_Pendaftaran_${filterLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    showNotification('Berhasil', `Data berhasil di-export (${filteredApplications.length} baris)`, 'success');
  };

  // Count by status
  const statusCounts = {
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FontAwesomeIcon icon={faSpinner} className="text-3xl text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Pendaftaran Siswa</h1>
          <p className="text-gray-600">Review dan kelola pendaftaran siswa baru</p>
        </div>
        <Button
          onClick={() => router.push('/data/admission/discounts')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <FontAwesomeIcon icon={faTag} className="mr-2" />
          Master Potongan
        </Button>
      </div>

      {/* Status Tabs */}
      {/* Status Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(statusConfig).map(([status, config]) => (
          <Card 
            key={status}
            className={`cursor-pointer transition-all hover:shadow-md ${filterStatus === status ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{config.label}</p>
                  <p className={`text-2xl font-bold ${config.color}`}>{statusCounts[status]}</p>
                </div>
                <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
                  <FontAwesomeIcon icon={config.icon} className={config.color} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FontAwesomeIcon icon={faFilter} className="text-gray-500" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Cari</Label>
              <div className="relative mt-1">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Nama, No. Pendaftaran, Telepon..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Jenjang</Label>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Jenjang</option>
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
            <div>
              <Label>Tahun Ajaran</Label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Tahun</option>
                {years.map(year => (
                  <option key={year.year_id} value={year.year_id}>{year.year_name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 mb-4">
            <FontAwesomeIcon icon={faUserGraduate} className="text-blue-600" />
            Daftar Pendaftaran ({filteredApplications.length})
            <div className="ml-auto">
              <Button
                size="sm"
                className="bg-green-700 hover:bg-green-800 text-white"
                onClick={handleExportExcel}
              >
                <FontAwesomeIcon icon={faDownload} className="mr-2" />
                Export Excel
              </Button>
            </div>
          </CardTitle>
          {/* Status Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-0 -mb-px overflow-x-auto" aria-label="Tabs">
              {/* Menunggu Review tab first */}
              <button
                onClick={() => setFilterStatus('pending')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  filterStatus === 'pending' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FontAwesomeIcon icon={faClock} className="text-xs" />
                Menunggu Review
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  filterStatus === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>{statusCounts.pending}</span>
              </button>
              {/* Semua tab second */}
              <button
                onClick={() => setFilterStatus('')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  filterStatus === '' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Semua
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  filterStatus === '' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>{applications.length}</span>
              </button>
              {/* Remaining status tabs (skip pending since it's first) */}
              {Object.entries(statusConfig)
                .filter(([status]) => status !== 'pending')
                .map(([status, config]) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    filterStatus === status 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FontAwesomeIcon icon={config.icon} className="text-xs" />
                  {config.label}
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    filterStatus === status ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>{statusCounts[status]}</span>
                </button>
              ))}
            </nav>
          </div>
        </CardHeader>
        <CardContent>
          {filteredApplications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FontAwesomeIcon icon={faUserGraduate} className="text-4xl mb-4 text-gray-300" />
              <p>Tidak ada data pendaftaran</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Pendaftaran</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Siswa</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orang Tua</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jenjang</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tahun</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal Daftar</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">UDP</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">USEK/bln</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredApplications.map(app => (
                    <tr key={app.application_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-blue-600">{app.application_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-gray-900">{app.student_name}</p>
                            {!allInstallments.some(inst => inst.application_id === app.application_id) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-200" title="Skema cicilan belum diatur">
                                <FontAwesomeIcon icon={faCalculator} className="mr-0.5 text-[8px]" />
                                Belum cicilan
                              </span>
                            )}
                          </div>
                          {app.student_nickname && (
                            <p className="text-sm text-gray-500">({app.student_nickname})</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-gray-900">{app.parent_name}</p>
                          <p className="text-sm text-gray-500">{app.parent_phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{app.level?.level_name || app.unit?.unit_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{app.year?.year_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{formatDate(app.created_at)}</td>
                      {(() => {
                        const fee = getAppFeeInfo(app);
                        return (
                          <>
                            <td className="px-4 py-3 text-right">
                              {fee.udpBase > 0 ? (
                                <div>
                                  {fee.udpHasDiscount ? (
                                    <>
                                      <p className="text-xs text-gray-400 line-through">{formatCurrency(fee.udpBase)}</p>
                                      <p className="text-sm font-semibold text-emerald-700">{formatCurrency(fee.udpFinal)}</p>
                                    </>
                                  ) : (
                                    <p className="text-sm text-gray-700">{formatCurrency(fee.udpBase)}</p>
                                  )}
                                </div>
                              ) : <span className="text-xs text-gray-400">-</span>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {fee.usekBase > 0 ? (
                                <div>
                                  {fee.usekHasDiscount ? (
                                    <>
                                      <p className="text-xs text-gray-400 line-through">{formatCurrency(fee.usekBase)}</p>
                                      <p className="text-sm font-semibold text-blue-700">{formatCurrency(fee.usekFinal)}</p>
                                    </>
                                  ) : (
                                    <p className="text-sm text-gray-700">{formatCurrency(fee.usekBase)}</p>
                                  )}
                                </div>
                              ) : <span className="text-xs text-gray-400">-</span>}
                            </td>
                          </>
                        );
                      })()}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[app.status]?.bgColor} ${statusConfig[app.status]?.color}`}>
                          <FontAwesomeIcon icon={statusConfig[app.status]?.icon} className="text-xs" />
                          {statusConfig[app.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetail(app)}
                            title="Lihat Detail"
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => {
                              setSelectedApplication(app);
                              fetchDiscountsForApplication(app);
                              setShowDiscountModal(true);
                            }}
                            title="Kelola Potongan"
                          >
                            <FontAwesomeIcon icon={faTag} />
                          </Button>
                          <Button
                            size="sm"
                            className={`text-white ${allInstallments.some(inst => inst.application_id === app.application_id) ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-500 hover:bg-gray-600'}`}
                            onClick={() => handleOpenInstallment(app)}
                            title="Skema Cicilan"
                          >
                            <FontAwesomeIcon icon={faCalculator} />
                          </Button>
                          {app.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleActionClick(app, 'approved')}
                                title="Setujui"
                              >
                                <FontAwesomeIcon icon={faCheck} />
                              </Button>
                              <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleActionClick(app, 'rejected')}
                                title="Tolak"
                              >
                                <FontAwesomeIcon icon={faTimes} />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setIsEditing(false); }}
        title={`Detail Pendaftaran - ${selectedApplication?.application_number}`}
        size="lg"
      >
        {selectedApplication && (
          <div className="space-y-6">
            {/* Status Badge + Edit Toggle */}
            <div className="flex items-center justify-between">
              <div className={`flex-1 p-4 rounded-lg ${statusConfig[selectedApplication.status]?.bgColor} ${statusConfig[selectedApplication.status]?.borderColor} border`}>
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon 
                    icon={statusConfig[selectedApplication.status]?.icon} 
                    className={`text-2xl ${statusConfig[selectedApplication.status]?.color}`} 
                  />
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className={`font-semibold ${statusConfig[selectedApplication.status]?.color}`}>
                      {statusConfig[selectedApplication.status]?.label}
                    </p>
                  </div>
                </div>
              </div>
              {!isEditing ? (
                <Button
                  className="ml-3 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleStartEdit}
                >
                  <FontAwesomeIcon icon={faEdit} className="mr-2" />
                  Edit Data
                </Button>
              ) : (
                <div className="ml-3 flex gap-2">
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleSaveEdit}
                    disabled={editSaving}
                  >
                    {editSaving ? <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" /> : <FontAwesomeIcon icon={faSave} className="mr-2" />}
                    Simpan
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={editSaving}>
                    Batal
                  </Button>
                </div>
              )}
            </div>

            {/* Student Info */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="text-blue-600" />
                Data Siswa
              </h3>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div>
                    <Label>Nama Lengkap *</Label>
                    <Input className="mt-1" value={editData.student_name} onChange={(e) => setEditData(p => ({ ...p, student_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Nama Panggilan</Label>
                    <Input className="mt-1" value={editData.student_nickname} onChange={(e) => setEditData(p => ({ ...p, student_nickname: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Jenis Kelamin</Label>
                    <select className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={editData.student_gender} onChange={(e) => setEditData(p => ({ ...p, student_gender: e.target.value }))}>
                      <option value="">Pilih</option>
                      <option value="male">Laki-laki</option>
                      <option value="female">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <Label>Tempat Lahir</Label>
                    <Input className="mt-1" value={editData.student_birth_place} onChange={(e) => setEditData(p => ({ ...p, student_birth_place: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Tanggal Lahir</Label>
                    <Input type="date" className="mt-1" value={editData.student_birth_date} onChange={(e) => setEditData(p => ({ ...p, student_birth_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Agama</Label>
                    <select
                      className="mt-1 w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editData.student_religion}
                      onChange={(e) => setEditData(p => ({ ...p, student_religion: e.target.value }))}
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
                  </div>
                  <div>
                    <Label>Kewarganegaraan</Label>
                    <Input className="mt-1" value={editData.student_nationality} onChange={(e) => setEditData(p => ({ ...p, student_nationality: e.target.value }))} />
                  </div>
                  <div className="relative">
                    <Label>Kota</Label>
                    <Input 
                      className="mt-1" 
                      value={editCitySearch} 
                      onChange={(e) => {
                        setEditCitySearch(e.target.value);
                        setShowEditCityDropdown(e.target.value.length >= 1);
                        setEditData(p => ({ ...p, student_city: e.target.value, student_province: '' }));
                      }}
                      onFocus={() => editCitySearch.length >= 1 && setShowEditCityDropdown(true)}
                      placeholder="Ketik nama kota..."
                    />
                    {showEditCityDropdown && (() => {
                      const filtered = allCities.filter(c => c.toLowerCase().includes(editCitySearch.toLowerCase())).slice(0, 8);
                      return filtered.length > 0 ? (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {filtered.map(city => (
                            <button
                              key={city}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm transition-colors"
                              onClick={() => {
                                const province = getProvinceByCity(city);
                                setEditData(p => ({ ...p, student_city: city, student_province: province }));
                                setEditCitySearch(city);
                                setShowEditCityDropdown(false);
                              }}
                            >
                              <span className="font-medium">{city}</span>
                              <span className="text-gray-400 ml-2 text-xs">({getProvinceByCity(city)})</span>
                            </button>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div>
                    <Label>Provinsi</Label>
                    <Input className="mt-1 bg-gray-100" value={editData.student_province} readOnly placeholder="Otomatis terisi" />
                  </div>
                  <div>
                    <Label>Kode Pos</Label>
                    <Input className="mt-1" value={editData.student_postal_code} onChange={(e) => setEditData(p => ({ ...p, student_postal_code: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <Label>Alamat KTP</Label>
                    <textarea className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} value={editData.student_address} onChange={(e) => setEditData(p => ({ ...p, student_address: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <Label>Alamat Domisili</Label>
                    <textarea className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} value={editData.student_domicile_address} onChange={(e) => setEditData(p => ({ ...p, student_domicile_address: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <Label>Asal Sekolah</Label>
                    <Input className="mt-1" value={editData.student_previous_school} onChange={(e) => setEditData(p => ({ ...p, student_previous_school: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Nama Lengkap</p>
                    <p className="font-medium">{selectedApplication.student_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nama Panggilan</p>
                    <p className="font-medium">{selectedApplication.student_nickname || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Jenis Kelamin</p>
                    <p className="font-medium">{selectedApplication.student_gender === 'male' ? 'Laki-laki' : selectedApplication.student_gender === 'female' ? 'Perempuan' : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tempat, Tanggal Lahir</p>
                    <p className="font-medium">
                      {selectedApplication.student_birth_place || '-'}, {formatDate(selectedApplication.student_birth_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Agama</p>
                    <p className="font-medium">{selectedApplication.student_religion || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Kewarganegaraan</p>
                    <p className="font-medium">{selectedApplication.student_nationality || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Kota</p>
                    <p className="font-medium">{selectedApplication.student_city || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Provinsi</p>
                    <p className="font-medium">{selectedApplication.student_province || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Alamat KTP</p>
                    <p className="font-medium">{selectedApplication.student_address || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Alamat Domisili</p>
                    <p className="font-medium">{selectedApplication.student_domicile_address || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Asal Sekolah</p>
                    <p className="font-medium">{selectedApplication.student_previous_school || '-'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Parent Info */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="text-green-600" />
                Data Orang Tua / Wali
              </h3>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4 bg-green-50 p-4 rounded-lg border border-green-200">
                  <div>
                    <Label>NIK</Label>
                    <Input className="mt-1" value={editData.parent_nik} maxLength={16} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 16); setEditData(p => ({ ...p, parent_nik: val })); }} placeholder="16 digit NIK" />
                  </div>
                  <div>
                    <Label>Nama Orang Tua *</Label>
                    <Input className="mt-1" value={editData.parent_name} onChange={(e) => setEditData(p => ({ ...p, parent_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Pekerjaan</Label>
                    <Input className="mt-1" value={editData.parent_occupation} onChange={(e) => setEditData(p => ({ ...p, parent_occupation: e.target.value }))} />
                  </div>
                  <div>
                    <Label>No. Telepon</Label>
                    <Input className="mt-1" value={editData.parent_phone} onChange={(e) => setEditData(p => ({ ...p, parent_phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" className="mt-1" value={editData.parent_email} onChange={(e) => setEditData(p => ({ ...p, parent_email: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <Label>Alamat</Label>
                    <textarea className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} value={editData.parent_address} onChange={(e) => setEditData(p => ({ ...p, parent_address: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">NIK</p>
                    <p className="font-medium font-mono">{selectedApplication.parent_nik || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nama</p>
                    <p className="font-medium">{selectedApplication.parent_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pekerjaan</p>
                    <p className="font-medium">{selectedApplication.parent_occupation || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Telepon</p>
                    <p className="font-medium flex items-center gap-2">
                      <FontAwesomeIcon icon={faPhone} className="text-gray-400" />
                      {selectedApplication.parent_phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium flex items-center gap-2">
                      <FontAwesomeIcon icon={faEnvelope} className="text-gray-400" />
                      {selectedApplication.parent_email || '-'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Alamat</p>
                    <p className="font-medium">{selectedApplication.parent_address || '-'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* School Selection */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faSchool} className="text-purple-600" />
                Pilihan Sekolah
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Jenjang</p>
                  <p className="font-medium">{selectedApplication.level?.level_name || selectedApplication.unit?.unit_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tahun Ajaran</p>
                  <p className="font-medium">{selectedApplication.year?.year_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Unit Akademik</p>
                  <p className="font-medium">{selectedApplication.unit?.unit_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tanggal Daftar</p>
                  <p className="font-medium">{formatDateTime(selectedApplication.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            {selectedApplication.additional_notes && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faInfoCircle} className="text-orange-600" />
                  Catatan dari Pendaftar
                </h3>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-gray-700">{selectedApplication.additional_notes}</p>
                </div>
              </div>
            )}

            {/* Admin Notes */}
            {selectedApplication.admin_notes && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600" />
                  Catatan Admin
                </h3>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-gray-700">{selectedApplication.admin_notes}</p>
                  {selectedApplication.reviewed_at && (
                    <p className="text-sm text-gray-500 mt-2">
                      Diupdate: {formatDateTime(selectedApplication.reviewed_at)}
                      {selectedApplication.reviewer && ` oleh ${selectedApplication.reviewer.user_nama_depan} ${selectedApplication.reviewer.user_nama_belakang}`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ===== Discount / Potongan Section ===== */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faTag} className="text-emerald-600" />
                Potongan / Diskon
              </h3>

              {discountLoading ? (
                <div className="text-center py-6 text-gray-400">
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl mb-2" />
                  <p className="text-sm">Memuat data potongan...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* UDP Discounts */}
                  {udpDef && (
                    <div className="border border-emerald-200 rounded-lg overflow-hidden">
                      <div className="bg-emerald-50 px-4 py-3 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-emerald-800">UDP</span>
                          <span className="text-sm text-emerald-600 ml-2">
                            Base: {formatCurrency(udpDef.total_amount)}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                          onClick={() => { setAddDiscountTarget('udp'); setShowAddDiscount(true); }}
                          disabled={discountSaving}
                        >
                          <FontAwesomeIcon icon={faPlus} className="mr-1" /> Tambah
                        </Button>
                      </div>
                      
                      {(() => {
                        const udpDiscounts = calculateDiscounts(discounts, 'udp');
                        if (udpDiscounts.length === 0) {
                          return (
                            <div className="px-4 py-4 text-center text-gray-400 text-sm">
                              Belum ada potongan UDP
                            </div>
                          );
                        }
                        return (
                          <div className="divide-y divide-emerald-100">
                            {udpDiscounts.map((d, idx) => (
                              <div key={d.app_discount_id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                                  {d.seq}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-gray-900 truncate">
                                    {d.discount?.discount_name || d.discount?.discount_code || '-'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {d.value_type === 'percentage' ? (
                                      <><FontAwesomeIcon icon={faPercent} className="mr-1" />{d.value}% dari {formatCurrency(d.base_before)}</>
                                    ) : (
                                      <><FontAwesomeIcon icon={faMoneyBill} className="mr-1" />{formatCurrency(d.value)} (fixed)</>
                                    )}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-semibold text-red-600">-{formatCurrency(d.calculated_amount)}</p>
                                  <p className="text-xs text-gray-400">→ {formatCurrency(d.subtotal_after)}</p>
                                </div>
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => handleMoveDiscount(d.app_discount_id, 'udp', 'up')}
                                    disabled={idx === 0 || discountSaving}
                                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                                  >
                                    <FontAwesomeIcon icon={faArrowUp} className="text-xs" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveDiscount(d.app_discount_id, 'udp', 'down')}
                                    disabled={idx === udpDiscounts.length - 1 || discountSaving}
                                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                                  >
                                    <FontAwesomeIcon icon={faArrowDown} className="text-xs" />
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleRemoveDiscount(d.app_discount_id, 'udp')}
                                  disabled={discountSaving}
                                  className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                                >
                                  <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                </button>
                              </div>
                            ))}
                            {/* Total */}
                            <div className="px-4 py-3 bg-emerald-50 flex items-center justify-between">
                              <span className="font-semibold text-emerald-800 text-sm">Total Potongan UDP</span>
                              <div className="text-right">
                                <p className="font-bold text-red-600">
                                  -{formatCurrency(udpDiscounts.reduce((sum, d) => sum + d.calculated_amount, 0))}
                                </p>
                                <p className="text-sm font-semibold text-emerald-700">
                                  Final: {formatCurrency(udpDiscounts[udpDiscounts.length - 1]?.subtotal_after || udpDef.total_amount)}
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
                    <div className="border border-blue-200 rounded-lg overflow-hidden">
                      <div className="bg-blue-50 px-4 py-3 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-blue-800">USEK</span>
                          <span className="text-sm text-blue-600 ml-2">
                            Base/bulan: {formatCurrency(usekDef.default_amount)}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                          onClick={() => { setAddDiscountTarget('usek'); setShowAddDiscount(true); }}
                          disabled={discountSaving}
                        >
                          <FontAwesomeIcon icon={faPlus} className="mr-1" /> Tambah
                        </Button>
                      </div>
                      
                      {(() => {
                        const usekDiscounts = calculateDiscounts(discounts, 'usek');
                        if (usekDiscounts.length === 0) {
                          return (
                            <div className="px-4 py-4 text-center text-gray-400 text-sm">
                              Belum ada potongan USEK
                            </div>
                          );
                        }
                        return (
                          <div className="divide-y divide-blue-100">
                            {usekDiscounts.map((d, idx) => (
                              <div key={d.app_discount_id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                                  {d.seq}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-gray-900 truncate">
                                    {d.discount?.discount_name || d.discount?.discount_code || '-'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {d.value_type === 'percentage' ? (
                                      <><FontAwesomeIcon icon={faPercent} className="mr-1" />{d.value}% dari {formatCurrency(d.base_before)}</>
                                    ) : (
                                      <><FontAwesomeIcon icon={faMoneyBill} className="mr-1" />{formatCurrency(d.value)} (fixed)</>
                                    )}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-semibold text-red-600">-{formatCurrency(d.calculated_amount)}</p>
                                  <p className="text-xs text-gray-400">→ {formatCurrency(d.subtotal_after)}</p>
                                </div>
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => handleMoveDiscount(d.app_discount_id, 'usek', 'up')}
                                    disabled={idx === 0 || discountSaving}
                                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                                  >
                                    <FontAwesomeIcon icon={faArrowUp} className="text-xs" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveDiscount(d.app_discount_id, 'usek', 'down')}
                                    disabled={idx === usekDiscounts.length - 1 || discountSaving}
                                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                                  >
                                    <FontAwesomeIcon icon={faArrowDown} className="text-xs" />
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleRemoveDiscount(d.app_discount_id, 'usek')}
                                  disabled={discountSaving}
                                  className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                                >
                                  <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                </button>
                              </div>
                            ))}
                            {/* Total */}
                            <div className="px-4 py-3 bg-blue-50 flex items-center justify-between">
                              <span className="font-semibold text-blue-800 text-sm">Total Potongan USEK/bulan</span>
                              <div className="text-right">
                                <p className="font-bold text-red-600">
                                  -{formatCurrency(usekDiscounts.reduce((sum, d) => sum + d.calculated_amount, 0))}
                                </p>
                                <p className="text-sm font-semibold text-blue-700">
                                  Final/bulan: {formatCurrency(usekDiscounts[usekDiscounts.length - 1]?.subtotal_after || usekDef.default_amount)}
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
                    <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg">
                      <FontAwesomeIcon icon={faInfoCircle} className="text-2xl mb-2" />
                      <p className="text-sm">Belum ada definisi biaya (UDP/USEK) untuk unit & tahun ajaran ini.</p>
                      <p className="text-xs mt-1">Silakan atur di menu Fee Management terlebih dahulu.</p>
                    </div>
                  )}

                  {/* Add Discount Dropdown */}
                  {showAddDiscount && (
                    <div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm text-gray-900">
                          Tambah Potongan {addDiscountTarget.toUpperCase()}
                        </h4>
                        <button onClick={() => setShowAddDiscount(false)} className="text-gray-400 hover:text-gray-600">
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
                              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left disabled:opacity-50"
                            >
                              <div>
                                <p className="font-medium text-sm text-gray-900">{m.discount_name}</p>
                                <p className="text-xs text-gray-500">{m.discount_code}</p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${m.discount_type === 'percentage' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                {m.discount_type === 'percentage' ? `${m.discount_value}%` : formatCurrency(m.discount_value)}
                              </span>
                            </button>
                          ))
                        }
                        {masterDiscounts
                          .filter(m => m.applies_to === addDiscountTarget || m.applies_to === 'both')
                          .filter(m => !discounts.some(d => d.discount_id === m.discount_id && d.fee_target === addDiscountTarget))
                          .length === 0 && (
                          <p className="text-center text-gray-400 text-sm py-3">
                            Tidak ada potongan tersedia untuk {addDiscountTarget.toUpperCase()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Tutup
              </Button>
              {selectedApplication.status === 'pending' && (
                <>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      setShowDetailModal(false);
                      handleActionClick(selectedApplication, 'approved');
                    }}
                  >
                    <FontAwesomeIcon icon={faCheck} className="mr-2" />
                    Setujui
                  </Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => {
                      setShowDetailModal(false);
                      handleActionClick(selectedApplication, 'rejected');
                    }}
                  >
                    <FontAwesomeIcon icon={faTimes} className="mr-2" />
                    Tolak
                  </Button>
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
        title={`Konfirmasi ${actionType === 'approved' ? 'Persetujuan' : 'Penolakan'}`}
      >
        {selectedApplication && (
          <div className="space-y-4">
            <p className="text-gray-600">
              {actionType === 'approved' && 'Anda akan menyetujui pendaftaran siswa ini.'}
              {actionType === 'rejected' && 'Anda akan menolak pendaftaran siswa ini.'}
            </p>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium">{selectedApplication.student_name}</p>
              <p className="text-sm text-gray-500">{selectedApplication.application_number}</p>
            </div>

            <div>
              <Label htmlFor="admin_notes">Catatan (Opsional)</Label>
              <textarea
                id="admin_notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                placeholder="Tambahkan catatan untuk pendaftaran ini..."
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowActionModal(false)} disabled={processing}>
                Batal
              </Button>
              <Button
                onClick={handleUpdateStatus}
                disabled={processing}
                className={
                  actionType === 'approved' ? 'bg-green-600 hover:bg-green-700 text-white' :
                  'bg-red-600 hover:bg-red-700 text-white'
                }
              >
                {processing ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon 
                      icon={actionType === 'approved' ? faCheck : faTimes} 
                      className="mr-2" 
                    />
                    {actionType === 'approved' ? 'Ya, Setujui' : 'Ya, Tolak'}
                  </>
                )}
              </Button>
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
        title={`Kelola Potongan - ${selectedApplication?.student_name || ''}`}
        size="lg"
      >
        {selectedApplication && (
          <div className="space-y-4">
            {/* Application Info */}
            <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{selectedApplication.student_name}</p>
                <p className="text-sm text-gray-500">{selectedApplication.application_number} • {selectedApplication.level?.level_name || selectedApplication.unit?.unit_name || '-'} • {selectedApplication.year?.year_name || '-'}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[selectedApplication.status]?.bgColor} ${statusConfig[selectedApplication.status]?.color}`}>
                <FontAwesomeIcon icon={statusConfig[selectedApplication.status]?.icon} className="text-xs" />
                {statusConfig[selectedApplication.status]?.label}
              </span>
            </div>

            {discountLoading ? (
              <div className="flex justify-center py-8">
                <FontAwesomeIcon icon={faSpinner} className="text-2xl text-blue-600 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* UDP Discounts */}
                {udpDef && (
                  <div className="border border-emerald-200 rounded-lg overflow-hidden">
                    <div className="bg-emerald-50 px-4 py-3 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-emerald-800">UDP</span>
                        <span className="text-sm text-emerald-600 ml-2">
                          Base: {formatCurrency(udpDef.total_amount)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                        onClick={() => { setAddDiscountTarget('udp'); setShowAddDiscount(true); }}
                        disabled={discountSaving}
                      >
                        <FontAwesomeIcon icon={faPlus} className="mr-1" /> Tambah
                      </Button>
                    </div>
                    {(() => {
                      const udpDiscounts = calculateDiscounts(discounts, 'udp');
                      if (udpDiscounts.length === 0) {
                        return <div className="px-4 py-4 text-center text-gray-400 text-sm">Belum ada potongan UDP</div>;
                      }
                      return (
                        <div className="divide-y divide-emerald-100">
                          {udpDiscounts.map((d, idx) => (
                            <div key={d.app_discount_id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">{d.seq}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900 truncate">{d.discount?.discount_name || '-'}</p>
                                <p className="text-xs text-gray-500">
                                  {d.value_type === 'percentage' ? <><FontAwesomeIcon icon={faPercent} className="mr-1" />{d.value}% dari {formatCurrency(d.base_before)}</> : <><FontAwesomeIcon icon={faMoneyBill} className="mr-1" />{formatCurrency(d.value)} (fixed)</>}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-semibold text-red-600">-{formatCurrency(d.calculated_amount)}</p>
                                <p className="text-xs text-gray-400">→ {formatCurrency(d.subtotal_after)}</p>
                              </div>
                              <div className="flex flex-col gap-1 flex-shrink-0">
                                <button onClick={() => handleMoveDiscount(d.app_discount_id, 'udp', 'up')} disabled={idx === 0 || discountSaving} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><FontAwesomeIcon icon={faArrowUp} className="text-xs" /></button>
                                <button onClick={() => handleMoveDiscount(d.app_discount_id, 'udp', 'down')} disabled={idx === udpDiscounts.length - 1 || discountSaving} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><FontAwesomeIcon icon={faArrowDown} className="text-xs" /></button>
                              </div>
                              <button onClick={() => handleRemoveDiscount(d.app_discount_id, 'udp')} disabled={discountSaving} className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"><FontAwesomeIcon icon={faTrash} className="text-xs" /></button>
                            </div>
                          ))}
                          <div className="px-4 py-3 bg-emerald-50 flex items-center justify-between">
                            <span className="font-semibold text-emerald-800 text-sm">Total Potongan UDP</span>
                            <div className="text-right">
                              <p className="font-bold text-red-600">-{formatCurrency(udpDiscounts.reduce((sum, d) => sum + d.calculated_amount, 0))}</p>
                              <p className="text-sm font-semibold text-emerald-700">Final: {formatCurrency(udpDiscounts[udpDiscounts.length - 1]?.subtotal_after || udpDef.total_amount)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* USEK Discounts */}
                {usekDef && (
                  <div className="border border-blue-200 rounded-lg overflow-hidden">
                    <div className="bg-blue-50 px-4 py-3 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-blue-800">USEK</span>
                        <span className="text-sm text-blue-600 ml-2">
                          Base/bulan: {formatCurrency(usekDef.default_amount)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                        onClick={() => { setAddDiscountTarget('usek'); setShowAddDiscount(true); }}
                        disabled={discountSaving}
                      >
                        <FontAwesomeIcon icon={faPlus} className="mr-1" /> Tambah
                      </Button>
                    </div>
                    {(() => {
                      const usekDiscounts = calculateDiscounts(discounts, 'usek');
                      if (usekDiscounts.length === 0) {
                        return <div className="px-4 py-4 text-center text-gray-400 text-sm">Belum ada potongan USEK</div>;
                      }
                      return (
                        <div className="divide-y divide-blue-100">
                          {usekDiscounts.map((d, idx) => (
                            <div key={d.app_discount_id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{d.seq}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900 truncate">{d.discount?.discount_name || '-'}</p>
                                <p className="text-xs text-gray-500">
                                  {d.value_type === 'percentage' ? <><FontAwesomeIcon icon={faPercent} className="mr-1" />{d.value}% dari {formatCurrency(d.base_before)}</> : <><FontAwesomeIcon icon={faMoneyBill} className="mr-1" />{formatCurrency(d.value)} (fixed)</>}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-semibold text-red-600">-{formatCurrency(d.calculated_amount)}</p>
                                <p className="text-xs text-gray-400">→ {formatCurrency(d.subtotal_after)}</p>
                              </div>
                              <div className="flex flex-col gap-1 flex-shrink-0">
                                <button onClick={() => handleMoveDiscount(d.app_discount_id, 'usek', 'up')} disabled={idx === 0 || discountSaving} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><FontAwesomeIcon icon={faArrowUp} className="text-xs" /></button>
                                <button onClick={() => handleMoveDiscount(d.app_discount_id, 'usek', 'down')} disabled={idx === usekDiscounts.length - 1 || discountSaving} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><FontAwesomeIcon icon={faArrowDown} className="text-xs" /></button>
                              </div>
                              <button onClick={() => handleRemoveDiscount(d.app_discount_id, 'usek')} disabled={discountSaving} className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"><FontAwesomeIcon icon={faTrash} className="text-xs" /></button>
                            </div>
                          ))}
                          <div className="px-4 py-3 bg-blue-50 flex items-center justify-between">
                            <span className="font-semibold text-blue-800 text-sm">Total Potongan USEK/bulan</span>
                            <div className="text-right">
                              <p className="font-bold text-red-600">-{formatCurrency(usekDiscounts.reduce((sum, d) => sum + d.calculated_amount, 0))}</p>
                              <p className="text-sm font-semibold text-blue-700">Final/bulan: {formatCurrency(usekDiscounts[usekDiscounts.length - 1]?.subtotal_after || usekDef.default_amount)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* No fee definitions */}
                {!udpDef && !usekDef && (
                  <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-2xl mb-2" />
                    <p className="text-sm">Belum ada definisi biaya (UDP/USEK) untuk unit & tahun ajaran ini.</p>
                    <p className="text-xs mt-1">Silakan atur di menu Fee Management terlebih dahulu.</p>
                  </div>
                )}

                {/* Add Discount Picker */}
                {showAddDiscount && (
                  <div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm text-gray-900">
                        Tambah Potongan {addDiscountTarget.toUpperCase()}
                      </h4>
                      <button onClick={() => setShowAddDiscount(false)} className="text-gray-400 hover:text-gray-600">
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
                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left disabled:opacity-50"
                          >
                            <div>
                              <p className="font-medium text-sm text-gray-900">{m.discount_name}</p>
                              <p className="text-xs text-gray-500">{m.discount_code}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${m.discount_type === 'percentage' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                              {m.discount_type === 'percentage' ? `${m.discount_value}%` : formatCurrency(m.discount_value)}
                            </span>
                          </button>
                        ))
                      }
                      {masterDiscounts
                        .filter(m => m.applies_to === addDiscountTarget || m.applies_to === 'both')
                        .filter(m => !discounts.some(d => d.discount_id === m.discount_id && d.fee_target === addDiscountTarget))
                        .length === 0 && (
                        <p className="text-center text-gray-400 text-sm py-3">
                          Tidak ada potongan tersedia untuk {addDiscountTarget.toUpperCase()}
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
        title={`Skema Cicilan - ${selectedApplication?.student_name || ''}`}
        size="lg"
      >
        {selectedApplication && (
          <div className="space-y-4">
            {/* Application Info */}
            <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{selectedApplication.student_name}</p>
                <p className="text-sm text-gray-500">{selectedApplication.application_number} • {selectedApplication.level?.level_name || selectedApplication.unit?.unit_name || '-'} • {selectedApplication.year?.year_name || '-'}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[selectedApplication.status]?.bgColor} ${statusConfig[selectedApplication.status]?.color}`}>
                <FontAwesomeIcon icon={statusConfig[selectedApplication.status]?.icon} className="text-xs" />
                {statusConfig[selectedApplication.status]?.label}
              </span>
            </div>

            {installmentLoading ? (
              <div className="flex justify-center py-8">
                <FontAwesomeIcon icon={faSpinner} className="text-2xl text-purple-600 animate-spin" />
              </div>
            ) : (() => {
              const feeInfo = getAppFeeInfo(selectedApplication);
              const hasAnyFee = feeInfo.udpFinal > 0 || feeInfo.usekFinal > 0;
              if (!hasAnyFee) {
                return (
                  <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-2xl mb-2" />
                    <p className="text-sm">Belum ada definisi biaya (UDP/USEK) untuk unit & tahun ajaran ini.</p>
                    <p className="text-xs mt-1">Silakan atur biaya dan potongan terlebih dahulu.</p>
                  </div>
                );
              }

              const calc = calculateInstallmentSchedule();
              if (!calc) return null;
              const existingPlan = allInstallments.find(inst => inst.application_id === selectedApplication.application_id);

              return (
                <div className="space-y-4">
                  {/* Fee Summary */}
                  <div className="border border-purple-200 rounded-lg overflow-hidden">
                    <div className="bg-purple-50 px-4 py-3">
                      <span className="font-semibold text-purple-800">Ringkasan Biaya Masuk</span>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">UDP (setelah potongan)</span>
                        <span className="font-medium">{formatCurrency(calc.udpFinal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">SPP bulan pertama (setelah potongan)</span>
                        <span className="font-medium">{formatCurrency(calc.sppFinal)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-semibold text-purple-800">
                        <span>Total Biaya Masuk</span>
                        <span>{formatCurrency(calc.totalEntry)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Configuration */}
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-sm text-gray-800">Pengaturan Cicilan</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-600">Persentase UTJ (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          className="mt-1"
                          value={installmentConfig.utj_percentage}
                          onChange={(e) => setInstallmentConfig(p => ({ ...p, utj_percentage: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) }))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Jumlah Cicilan (bulan)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="24"
                          className="mt-1"
                          value={installmentConfig.num_installments}
                          onChange={(e) => setInstallmentConfig(p => ({ ...p, num_installments: Math.min(24, Math.max(1, parseInt(e.target.value) || 1)) }))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Bulan Mulai</Label>
                        <select
                          className="mt-1 w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          value={installmentConfig.start_month}
                          onChange={(e) => setInstallmentConfig(p => ({ ...p, start_month: parseInt(e.target.value) }))}
                        >
                          {monthNames.map((m, idx) => (
                            <option key={idx} value={idx + 1}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Tahun Mulai</Label>
                        <Input
                          type="number"
                          min="2020"
                          max="2040"
                          className="mt-1"
                          value={installmentConfig.start_year}
                          onChange={(e) => setInstallmentConfig(p => ({ ...p, start_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Catatan (opsional)</Label>
                      <Input
                        className="mt-1"
                        placeholder="Catatan tambahan..."
                        value={installmentConfig.notes}
                        onChange={(e) => setInstallmentConfig(p => ({ ...p, notes: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* UTJ Info */}
                  <div className="border border-amber-200 rounded-lg overflow-hidden">
                    <div className="bg-amber-50 px-4 py-3 flex items-center justify-between">
                      <span className="font-semibold text-amber-800">UTJ (Uang Tanda Jadi)</span>
                      <span className="font-bold text-amber-700 text-lg">{formatCurrency(calc.utjAmount)}</span>
                    </div>
                    <div className="px-4 py-2 text-xs text-gray-500">
                      {installmentConfig.utj_percentage}% dari total {formatCurrency(calc.totalEntry)} — sudah termasuk dalam Cicilan 1
                    </div>
                  </div>

                  {/* Remaining & Monthly */}
                  <div className="border border-blue-200 rounded-lg overflow-hidden">
                    <div className="bg-blue-50 px-4 py-3 flex items-center justify-between">
                      <span className="font-semibold text-blue-800">Sisa Cicilan</span>
                      <span className="font-bold text-blue-700">{formatCurrency(calc.remaining)}</span>
                    </div>
                    <div className="px-4 py-2 text-xs text-gray-500">
                      Dibagi {calc.numInst} bulan — {formatCurrency(calc.monthlyAmount)}/bulan
                      {calc.lastMonthAmount !== calc.monthlyAmount && (
                        <span className="ml-1">(cicilan terakhir: {formatCurrency(calc.lastMonthAmount)})</span>
                      )}
                    </div>
                  </div>

                  {/* Schedule Table */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3">
                      <span className="font-semibold text-gray-800">Jadwal Pembayaran</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-gray-600 text-xs">
                            <th className="px-4 py-2 text-left w-12">No</th>
                            <th className="px-4 py-2 text-left">Keterangan</th>
                            <th className="px-4 py-2 text-right">Jumlah</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {calc.items.map((item) => (
                            <tr key={item.seq} className={item.seq === 1 ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                              <td className="px-4 py-2 text-gray-500">{item.seq}</td>
                              <td className="px-4 py-2">
                                <span className={`font-medium ${item.seq === 1 ? 'text-amber-800' : 'text-gray-900'}`}>{item.label}</span>
                                {item.info && <p className="text-xs text-gray-400">{item.info}</p>}
                              </td>
                              <td className="px-4 py-2 text-right font-semibold">{formatCurrency(item.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-purple-50 font-bold text-purple-800">
                            <td className="px-4 py-3" colSpan="2">Total</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(calc.items.reduce((sum, i) => sum + i.amount, 0))}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      {existingPlan && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={handleDeleteInstallment}
                          disabled={installmentSaving}
                        >
                          <FontAwesomeIcon icon={faTrash} className="mr-1" /> Hapus Skema
                        </Button>
                      )}
                      {existingPlan && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                          onClick={handlePrintInstallment}
                        >
                          <FontAwesomeIcon icon={faPrint} className="mr-1" /> Cetak PDF
                        </Button>
                      )}
                      {existingPlan && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-purple-600 border-purple-300 hover:bg-purple-50"
                          onClick={handleEmailInstallment}
                          disabled={emailSending || !selectedApplication?.parent_email}
                          title={!selectedApplication?.parent_email ? 'Email orang tua belum diisi' : 'Kirim PDF ke email orang tua'}
                        >
                          {emailSending ? (
                            <FontAwesomeIcon icon={faSpinner} className="mr-1 animate-spin" />
                          ) : (
                            <FontAwesomeIcon icon={faEnvelope} className="mr-1" />
                          )}
                          {emailSending ? 'Mengirim...' : 'Kirim Email'}
                        </Button>
                      )}
                    </div>
                    <Button
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={handleSaveInstallment}
                      disabled={installmentSaving}
                    >
                      {installmentSaving ? (
                        <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />
                      ) : (
                        <FontAwesomeIcon icon={faSave} className="mr-2" />
                      )}
                      {existingPlan ? 'Perbarui Skema' : 'Simpan Skema'}
                    </Button>
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
