"use client";

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faEdit, faTrash, faSpinner, faChalkboardTeacher,
  faCalendarXmark, faBan, faCalendarAlt, faClock, faLayerGroup,
  faBookOpen, faCoffee, faSun, faUtensils, faBell, faCheck,
  faTable, faThLarge, faFilter, faCalendarDay, faGraduationCap
} from '@fortawesome/free-solid-svg-icons';

const BASE_DATE = '2000-01-01';
const formatRangeForInsert = (startTime, endTime) =>
  `[${BASE_DATE} ${startTime},${BASE_DATE} ${endTime})`;

const parseRange = (pgRange) => {
  if (!pgRange) return { start: '', end: '' };
  const m = pgRange.match(/^[\[(](.*),(.*)[)\]]$/);
  if (!m) return { start: '', end: '' };
  const clean = (raw) => {
    let v = raw.trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v)) v += ':00';
    return v;
  };
  return { start: clean(m[1]), end: clean(m[2]) };
};

const extractHM = (ts) => {
  if (!ts) return '';
  const parts = ts.split(' ');
  if (parts.length < 2) return '';
  return parts[1].slice(0, 5);
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const TODAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

// Helper for exception date formatting
const fmtDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export default function TimetablePage() {
  const { t } = useI18n();
  const { theme, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'exceptions'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Timetable data
  const [rows, setRows] = useState([]);
  const [detailKelasAll, setDetailKelasAll] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [units, setUnits] = useState([]);
  const [years, setYears] = useState([]);
  const [filters, setFilters] = useState({ year: '', kelas: '', day: '' });

  // Form state (schedule)
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formBlockType, setFormBlockType] = useState('subject'); // 'subject' | 'custom'
  const [formCustomLabel, setFormCustomLabel] = useState('');
  const [formCustomColor, setFormCustomColor] = useState('F3E8FF'); // hex without #
  const [formDays, setFormDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [formYear, setFormYear] = useState('');
  const [formKelas, setFormKelas] = useState('');
  const [formDetailKelasId, setFormDetailKelasId] = useState('');
  const [formDay, setFormDay] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, row: null });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Exceptions state
  const [exceptions, setExceptions] = useState([]);
  const [loadingExceptions, setLoadingExceptions] = useState(false);
  const [showExForm, setShowExForm] = useState(false);
  const [editingEx, setEditingEx] = useState(null);
  const [exForm, setExForm] = useState({
    exception_date: '',
    exception_label: '',
    exception_type: 'holiday',
    start_time: '',
    end_time: '',
    affects_all_kelas: true,
    affected_kelas_ids: [],
    note: '',
  });
  const [exFormErrors, setExFormErrors] = useState({});
  const [confirmDeleteEx, setConfirmDeleteEx] = useState({ open: false, row: null });

  // Notifications
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showNotification = (title, message, type = 'success') =>
    setNotification({ isOpen: true, title, message, type });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true); setError('');
      const [ttRes, dkRes, kelasRes, yearRes, subjRes, usersRes, unitRes] = await Promise.all([
        supabase.from('timetable').select('timetable_id, timetable_detail_kelas_id, timetable_day, timetable_time, custom_label, kelas_id, custom_color'),
        supabase.from('detail_kelas').select('detail_kelas_id, detail_kelas_subject_id, detail_kelas_kelas_id, teacher_user_id'),
        supabase.from('kelas').select('kelas_id, kelas_nama, kelas_year_id, kelas_unit_id').order('kelas_nama'),
        supabase.from('year').select('year_id, year_name, start_date, end_date').order('year_name', { ascending: false }),
        supabase.from('subject').select('subject_id, subject_name, subject_code'),
        supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang').eq('is_active', true),
        supabase.from('unit').select('unit_id, unit_name, is_pyp, is_myp, is_dp'),
      ]);
      if (ttRes.error) throw ttRes.error;
      const subjMap = new Map((subjRes.data || []).map(s => [s.subject_id, s]));
      const kelasMap = new Map((kelasRes.data || []).map(k => [k.kelas_id, k]));
      const userMap = new Map((usersRes.data || []).map(u => [
        u.user_id, `${u.user_nama_depan} ${u.user_nama_belakang}`.trim()
      ]));
      const dkEnriched = (dkRes.data || []).map(d => ({
        ...d,
        subject_name: subjMap.get(d.detail_kelas_subject_id)?.subject_name || '',
        subject_code: subjMap.get(d.detail_kelas_subject_id)?.subject_code || '',
        kelas_nama: kelasMap.get(d.detail_kelas_kelas_id)?.kelas_nama || '',
        kelas_year_id: kelasMap.get(d.detail_kelas_kelas_id)?.kelas_year_id || null,
        teacher_name: d.teacher_user_id ? (userMap.get(d.teacher_user_id) || '') : '',
      }));
      setRows(ttRes.data || []);
      setDetailKelasAll(dkEnriched);
      setKelasList(kelasRes.data || []);
      setUnits(unitRes.data || []);
      setYears(yearRes.data || []);

      if (yearRes.data && yearRes.data.length > 0) {
        const today = new Date();
        const currentYear = yearRes.data.find(y => {
          if (!y.start_date || !y.end_date) return false;
          const s = new Date(y.start_date + 'T00:00:00');
          const e = new Date(y.end_date + 'T23:59:59');
          return s <= today && today <= e;
        });

        const defaultYear = String(currentYear ? currentYear.year_id : yearRes.data[0].year_id);
        const availableKelas = (kelasRes.data || []).filter(k => String(k.kelas_year_id) === defaultYear);
        const defaultKelas = availableKelas.length > 0 ? String(availableKelas[0].kelas_id) : '';
        setFilters({ year: defaultYear, kelas: defaultKelas, day: '' });
      }
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const loadExceptions = async () => {
    try {
      setLoadingExceptions(true);
      const { data, error } = await supabase
        .from('timetable_exception')
        .select('*')
        .order('exception_date', { ascending: false });
      if (error) throw error;
      setExceptions(data || []);
    } catch (e) { showNotification('Error', e.message, 'error'); }
    finally { setLoadingExceptions(false); }
  };

  useEffect(() => { if (activeTab === 'exceptions') loadExceptions(); }, [activeTab]);

  // ── Derived maps & Unit grouping ─────────────────────────────────────────
  const dkMap = useMemo(() => new Map(detailKelasAll.map(d => [d.detail_kelas_id, d])), [detailKelasAll]);
  const kelasMap = useMemo(() => new Map(kelasList.map(k => [k.kelas_id, k])), [kelasList]);
  const unitMap = useMemo(() => new Map(units.map(u => [u.unit_id, u])), [units]);

  const kelasForViewFilter = useMemo(() => {
    if (!filters.year) return kelasList;
    return kelasList.filter(k => String(k.kelas_year_id) === String(filters.year));
  }, [kelasList, filters.year]);

  // Separate classes into PYP and MYP (and Other/DP)
  const groupedKelasForViewFilter = useMemo(() => {
    const pyp = [];
    const myp = [];
    const other = [];

    kelasForViewFilter.forEach(k => {
      const u = unitMap.get(k.kelas_unit_id);
      if (u?.is_pyp || (u?.unit_name && u.unit_name.toUpperCase().includes('PYP'))) {
        pyp.push(k);
      } else if (u?.is_myp || (u?.unit_name && u.unit_name.toUpperCase().includes('MYP'))) {
        myp.push(k);
      } else {
        other.push(k);
      }
    });

    const sortFn = (a, b) => (a.kelas_nama || '').localeCompare(b.kelas_nama || '', undefined, { numeric: true, sensitivity: 'base' });
    pyp.sort(sortFn);
    myp.sort(sortFn);
    other.sort(sortFn);

    return { pyp, myp, other };
  }, [kelasForViewFilter, unitMap]);

  const filtered = useMemo(() => rows.filter(r => {
    let rowKelasId = null;
    let rowYearId = null;

    if (r.timetable_detail_kelas_id) {
      const dk = dkMap.get(r.timetable_detail_kelas_id);
      if (dk) {
        rowKelasId = dk.detail_kelas_kelas_id;
        rowYearId = dk.kelas_year_id;
      }
    } else if (r.kelas_id) {
      rowKelasId = r.kelas_id;
      const k = kelasMap.get(r.kelas_id);
      if (k) rowYearId = k.kelas_year_id;
    }

    if (!rowKelasId) return false;
    if (!filters.year || String(rowYearId) !== String(filters.year)) return false;
    if (!filters.kelas || String(rowKelasId) !== String(filters.kelas)) return false;
    if (filters.day && r.timetable_day !== filters.day) return false;
    return true;
  }), [rows, filters, dkMap, kelasMap]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const dayIdx = d => DAYS.indexOf(d);
    const da = dayIdx(a.timetable_day), db = dayIdx(b.timetable_day);
    if (da !== db) return da - db;
    const { start: saRaw } = parseRange(a.timetable_time);
    const { start: sbRaw } = parseRange(b.timetable_time);
    return extractHM(saRaw).localeCompare(extractHM(sbRaw));
  }), [filtered]);

  // ── Calculated Weekly Statistics ──────────────────────────────────────────
  const stats = useMemo(() => {
    let totalMinutes = 0;
    const subjectSet = new Set();
    let subjectBlockCount = 0;
    let customBlockCount = 0;

    sorted.forEach(r => {
      const { start, end } = parseRange(r.timetable_time);
      const s = new Date(start.replace(' ', 'T'));
      const e = new Date(end.replace(' ', 'T'));
      if (!isNaN(s) && !isNaN(e) && e > s) {
        totalMinutes += (e - s) / 60000;
      }
      if (r.custom_label) {
        customBlockCount++;
      } else {
        subjectBlockCount++;
        const dk = dkMap.get(r.timetable_detail_kelas_id);
        if (dk?.subject_name) subjectSet.add(dk.subject_name);
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    return {
      totalBlocks: sorted.length,
      subjectBlocks: subjectBlockCount,
      customBlocks: customBlockCount,
      uniqueSubjects: subjectSet.size,
      formattedTime: hours > 0 ? (mins > 0 ? `${hours}h ${mins}m` : `${hours}h`) : `${mins}m`
    };
  }, [sorted, dkMap]);

  const formKelasOptions = useMemo(() => {
    if (!formYear) return kelasList;
    return kelasList.filter(k => String(k.kelas_year_id) === String(formYear));
  }, [kelasList, formYear]);

  const groupedFormKelasOptions = useMemo(() => {
    const pyp = [];
    const myp = [];
    const other = [];

    formKelasOptions.forEach(k => {
      const u = unitMap.get(k.kelas_unit_id);
      if (u?.is_pyp || (u?.unit_name && u.unit_name.toUpperCase().includes('PYP'))) {
        pyp.push(k);
      } else if (u?.is_myp || (u?.unit_name && u.unit_name.toUpperCase().includes('MYP'))) {
        myp.push(k);
      } else {
        other.push(k);
      }
    });

    const sortFn = (a, b) => (a.kelas_nama || '').localeCompare(b.kelas_nama || '', undefined, { numeric: true, sensitivity: 'base' });
    pyp.sort(sortFn);
    myp.sort(sortFn);
    other.sort(sortFn);

    return { pyp, myp, other };
  }, [formKelasOptions, unitMap]);

  const formSubjectOptions = useMemo(() => {
    if (!formKelas) return [];
    return [...detailKelasAll.filter(d => String(d.detail_kelas_kelas_id) === String(formKelas))]
      .sort((a, b) => (a.subject_name || '').localeCompare(b.subject_name || '', 'id'));
  }, [detailKelasAll, formKelas]);

  const selectedDk = useMemo(() =>
    formDetailKelasId ? dkMap.get(parseInt(formDetailKelasId)) : null,
    [dkMap, formDetailKelasId]);

  const selectedKelasObj = useMemo(() =>
    kelasList.find(k => String(k.kelas_id) === String(filters.kelas)),
    [kelasList, filters.kelas]);

  // ── Group exceptions by month ─────────────────────────────────────────────
  const exByMonth = useMemo(() => {
    const groups = {};
    exceptions.forEach(ex => {
      const m = ex.exception_date?.slice(0, 7) || 'unknown';
      if (!groups[m]) groups[m] = [];
      groups[m].push(ex);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [exceptions]);

  // ── Schedule form helpers ─────────────────────────────────────────────────
  const resetForm = () => {
    setFormBlockType('subject'); setFormCustomLabel(''); setFormCustomColor('F3E8FF');
    setFormYear(filters.year || ''); setFormKelas(filters.kelas || ''); setFormDetailKelasId('');
    setFormDay(filters.day || 'Monday'); setFormDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    setFormStart(''); setFormEnd(''); setFormErrors({});
  };
  const openCreate = () => { setEditing(null); resetForm(); setShowForm(true); };
  const openEdit = (row) => {
    const { start, end } = parseRange(row.timetable_time);
    const dk = dkMap.get(row.timetable_detail_kelas_id);
    const kId = row.kelas_id || (dk ? dk.detail_kelas_kelas_id : null);
    const kObj = kId ? kelasMap.get(kId) : null;
    setEditing(row);

    if (row.custom_label) {
      setFormBlockType('custom');
      setFormCustomLabel(row.custom_label);
      setFormCustomColor(row.custom_color || 'F3E8FF');
      setFormDetailKelasId('');
    } else {
      setFormBlockType('subject');
      setFormCustomLabel('');
      setFormCustomColor('F3E8FF');
      setFormDetailKelasId(row.timetable_detail_kelas_id ? String(row.timetable_detail_kelas_id) : '');
    }

    setFormYear(kObj ? String(kObj.kelas_year_id) : (dk ? String(dk.kelas_year_id || '') : ''));
    setFormKelas(kId ? String(kId) : '');
    setFormDay(row.timetable_day || '');
    setFormDays([row.timetable_day || 'Monday']);
    setFormStart(extractHM(start)); setFormEnd(extractHM(end));
    setFormErrors({}); setShowForm(true);
  };

  const validate = () => {
    const e = {};
    if (formBlockType === 'subject' && !formDetailKelasId) e.subject = 'Subject class required';
    if (formBlockType === 'custom' && !formCustomLabel.trim()) e.customLabel = 'Custom label required';
    if (formBlockType === 'custom' && !formKelas) e.kelas = 'Class required';
    if (formBlockType === 'subject' && !formDay) e.day = 'Day required';
    if (formBlockType === 'custom' && !editing && formDays.length === 0) e.day = 'Select at least one day';
    if (formBlockType === 'custom' && editing && !formDay) e.day = 'Day required';
    if (!formStart) e.startTime = 'Start time required';
    if (!formEnd) e.endTime = 'End time required';
    if (formStart && formEnd && formStart >= formEnd) e.endTime = 'End must be after start';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);

      if (formBlockType === 'custom' && !editing) {
        const payloads = formDays.map(day => ({
          timetable_detail_kelas_id: null,
          custom_label: formCustomLabel.trim(),
          custom_color: formCustomColor || 'F3E8FF',
          kelas_id: parseInt(formKelas),
          timetable_day: day,
          timetable_time: formatRangeForInsert(formStart, formEnd),
        }));

        const { data, error } = await supabase.from('timetable').insert(payloads).select();
        if (error) throw error;
        if (data) setRows(prev => [...data, ...prev]);
        showNotification('Success', `Created ${payloads.length} routine blocks`);
      } else {
        const payload = {
          timetable_detail_kelas_id: formBlockType === 'subject' ? parseInt(formDetailKelasId) : null,
          custom_label: formBlockType === 'custom' ? formCustomLabel.trim() : null,
          custom_color: formBlockType === 'custom' ? (formCustomColor || 'F3E8FF') : null,
          kelas_id: formBlockType === 'custom' ? parseInt(formKelas) : null,
          timetable_day: formDay,
          timetable_time: formatRangeForInsert(formStart, formEnd),
        };
        if (editing) {
          const { data, error } = await supabase.from('timetable').update(payload).eq('timetable_id', editing.timetable_id).select();
          if (error) throw error;
          if (data?.[0]) setRows(prev => prev.map(r => r.timetable_id === editing.timetable_id ? data[0] : r));
          showNotification('Success', 'Block updated successfully');
        } else {
          const { data, error } = await supabase.from('timetable').insert([payload]).select();
          if (error) throw error;
          if (data?.[0]) setRows(prev => [data[0], ...prev]);
          showNotification('Success', 'Block created successfully');
        }
      }
      setShowForm(false);
    } catch (e) { showNotification('Error', 'Failed: ' + e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const onDelete = async () => {
    if (!confirmDelete.row) return;
    try {
      setSubmitting(true);
      const { error } = await supabase.from('timetable').delete().eq('timetable_id', confirmDelete.row.timetable_id);
      if (error) throw error;
      setRows(prev => prev.filter(r => r.timetable_id !== confirmDelete.row.timetable_id));
      showNotification('Success', 'Block deleted successfully');
      setConfirmDelete({ open: false, row: null });
    } catch (e) { showNotification('Error', 'Delete failed: ' + e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  // ── Exception form helpers ────────────────────────────────────────────────
  const resetExForm = () => setExForm({
    exception_date: '', exception_label: '', exception_type: 'holiday',
    start_time: '', end_time: '', affects_all_kelas: true, affected_kelas_ids: [], note: '',
  });
  const openCreateEx = () => { setEditingEx(null); resetExForm(); setExFormErrors({}); setShowExForm(true); };
  const openEditEx = (ex) => {
    setEditingEx(ex);
    setExForm({
      exception_date: ex.exception_date || '',
      exception_label: ex.exception_label || '',
      exception_type: ex.exception_type || 'holiday',
      start_time: ex.start_time || '',
      end_time: ex.end_time || '',
      affects_all_kelas: ex.affects_all_kelas !== false,
      affected_kelas_ids: ex.affected_kelas_ids || [],
      note: ex.note || '',
    });
    setExFormErrors({});
    setShowExForm(true);
  };
  const validateEx = () => {
    const e = {};
    if (!exForm.exception_date) e.date = 'Date is required';
    if (!exForm.exception_label.trim()) e.label = 'Label is required';
    if (exForm.exception_type === 'event') {
      if (!exForm.start_time) e.start_time = 'Start time is required for event';
      if (!exForm.end_time) e.end_time = 'End time is required for event';
      if (exForm.start_time && exForm.end_time && exForm.start_time >= exForm.end_time)
        e.end_time = 'End time must be after start time';
    }
    setExFormErrors(e);
    return Object.keys(e).length === 0;
  };
  const onSubmitEx = async (ev) => {
    ev.preventDefault();
    if (!validateEx()) return;
    try {
      setSubmitting(true);
      const payload = {
        exception_date: exForm.exception_date,
        exception_label: exForm.exception_label.trim(),
        exception_type: exForm.exception_type,
        start_time: exForm.exception_type === 'event' ? exForm.start_time : null,
        end_time: exForm.exception_type === 'event' ? exForm.end_time : null,
        affects_all_kelas: exForm.affects_all_kelas,
        affected_kelas_ids: exForm.affects_all_kelas ? null : exForm.affected_kelas_ids,
        note: exForm.note || null,
      };
      if (editingEx) {
        const { error } = await supabase.from('timetable_exception').update(payload).eq('exception_id', editingEx.exception_id);
        if (error) throw error;
        setExceptions(prev => prev.map(e => e.exception_id === editingEx.exception_id ? { ...e, ...payload } : e));
        showNotification('Success', 'Exception updated successfully');
      } else {
        const { data, error } = await supabase.from('timetable_exception').insert([payload]).select();
        if (error) throw error;
        if (data?.[0]) setExceptions(prev => [data[0], ...prev]);
        showNotification('Success', 'Exception created successfully');
      }
      setShowExForm(false);
    } catch (e) { showNotification('Error', 'Failed: ' + e.message, 'error'); }
    finally { setSubmitting(false); }
  };
  const onDeleteEx = async () => {
    if (!confirmDeleteEx.row) return;
    try {
      setSubmitting(true);
      const { error } = await supabase.from('timetable_exception').delete().eq('exception_id', confirmDeleteEx.row.exception_id);
      if (error) throw error;
      setExceptions(prev => prev.filter(e => e.exception_id !== confirmDeleteEx.row.exception_id));
      showNotification('Success', 'Exception deleted successfully');
      setConfirmDeleteEx({ open: false, row: null });
    } catch (e) { showNotification('Error', 'Delete failed: ' + e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  // ── Early Loading Screen ──────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', background: theme?.pageBg }}>
      <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '24px', color: theme?.textSecondary }} />
      <span style={{ fontSize: '13px', color: theme?.textSecondary, fontFamily: 'ui-monospace, monospace' }}>Loading timetable schedule...</span>
    </div>
  );

  // Styling helpers based on minimalist-ui warm monochrome & muted pastels
  const cardBorder = `1px solid ${theme?.border || '#EAEAEA'}`;
  const inputStyle = {
    background: theme?.inputBg || '#FFFFFF',
    border: `1px solid ${theme?.border || '#EAEAEA'}`,
    color: theme?.textPrimary || '#111111',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  };

  return (
    <div style={{ minHeight: '100vh', background: theme?.pageBg, padding: '24px 0', color: theme?.textPrimary }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── TOP EDITORIAL HEADER ────────────────────────────────────────────── */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', paddingBottom: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em', margin: 0, color: theme?.textPrimary }}>
                Timetable
              </h1>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '2px 8px',
                borderRadius: '9999px',
                background: theme?.blueBg,
                color: theme?.blueText
              }}>
                Academic Matrix
              </span>
            </div>
            <p style={{ fontSize: '13px', color: theme?.textSecondary, margin: 0 }}>
              Weekly lesson schedules, custom routine blocks, and academic calendar exceptions
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeTab === 'schedule' ? (
              <Button
                onClick={openCreate}
                style={{
                  background: isDark ? '#FFFFFF' : '#111111',
                  color: isDark ? '#111111' : '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  padding: '9px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: 'none',
                  transition: 'opacity 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <FontAwesomeIcon icon={faPlus} style={{ fontSize: '12px' }} />
                <span>New Block</span>
              </Button>
            ) : (
              <Button
                onClick={openCreateEx}
                style={{
                  background: isDark ? '#FFFFFF' : '#111111',
                  color: isDark ? '#111111' : '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  padding: '9px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: 'none',
                  transition: 'opacity 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <FontAwesomeIcon icon={faPlus} style={{ fontSize: '12px' }} />
                <span>Add Exception</span>
              </Button>
            )}
          </div>
        </header>

        {error && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: theme?.redBg,
            color: theme?.redText,
            border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.2)' : '#FCA5A5'}`,
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        {/* ── BENTO SEGMENTED TABS ────────────────────────────────────────────── */}
        <div style={{
          display: 'inline-flex',
          background: theme?.cardBgAlt,
          border: cardBorder,
          borderRadius: '8px',
          padding: '4px',
          gap: '4px',
          width: 'fit-content'
        }}>
          {[
            { id: 'schedule', label: 'Weekly Schedule', icon: faCalendarAlt, count: filtered.length },
            { id: 'exceptions', label: 'Academic Exceptions', icon: faCalendarXmark, count: exceptions.length }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? theme?.textPrimary : theme?.textSecondary,
                  background: isActive ? theme?.cardBg : 'transparent',
                  border: isActive ? cardBorder : '1px solid transparent',
                  boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <FontAwesomeIcon icon={tab.icon} style={{ fontSize: '12px', opacity: isActive ? 1 : 0.7 }} />
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '11px',
                  fontFamily: 'ui-monospace, monospace',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  background: isActive ? (isDark ? 'rgba(255,255,255,0.08)' : '#F0EFE9') : 'transparent',
                  color: theme?.textSecondary
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* ── SCHEDULE TAB CONTENT ────────────────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* ── BENTO CONTROLS & FILTER BAR ─────────────────────────────────── */}
            <div style={{
              background: theme?.cardBg,
              border: cardBorder,
              borderRadius: '10px',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                
                {/* Left: Filter Inputs */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', flex: 1 }}>
                  
                  {/* Academic Year */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '170px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Academic Year
                    </label>
                    <select
                      value={filters.year}
                      onChange={e => {
                        const yr = e.target.value;
                        const availableKelas = kelasList.filter(k => String(k.kelas_year_id) === String(yr));
                        const defaultKl = availableKelas.length > 0 ? String(availableKelas[0].kelas_id) : '';
                        setFilters(prev => ({ ...prev, year: yr, kelas: defaultKl }));
                      }}
                      style={{ ...inputStyle, padding: '8px 12px' }}
                    >
                      <option value="">-- Select Year --</option>
                      {years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
                    </select>
                  </div>

                  {/* Class (Separated by PYP and MYP) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Class
                    </label>
                    <select
                      value={filters.kelas}
                      disabled={!filters.year}
                      onChange={e => setFilters(prev => ({ ...prev, kelas: e.target.value }))}
                      style={{ ...inputStyle, padding: '8px 12px', opacity: !filters.year ? 0.6 : 1 }}
                    >
                      <option value="">-- Select Class --</option>
                      {groupedKelasForViewFilter.pyp.length > 0 && (
                        <optgroup label="── PYP Classes ──">
                          {groupedKelasForViewFilter.pyp.map(k => (
                            <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>
                          ))}
                        </optgroup>
                      )}
                      {groupedKelasForViewFilter.myp.length > 0 && (
                        <optgroup label="── MYP Classes ──">
                          {groupedKelasForViewFilter.myp.map(k => (
                            <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>
                          ))}
                        </optgroup>
                      )}
                      {groupedKelasForViewFilter.other.length > 0 && (
                        <optgroup label="── Other Classes ──">
                          {groupedKelasForViewFilter.other.map(k => (
                            <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>

                  {/* Day Filter */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '140px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Day
                    </label>
                    <select
                      value={filters.day}
                      onChange={e => setFilters(prev => ({ ...prev, day: e.target.value }))}
                      style={{ ...inputStyle, padding: '8px 12px' }}
                    >
                      <option value="">All Weekdays</option>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  {/* Reset Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (years.length > 0) {
                        const defaultYear = String(years[0].year_id);
                        const availableKelas = kelasList.filter(k => String(k.kelas_year_id) === defaultYear);
                        const defaultKelas = availableKelas.length > 0 ? String(availableKelas[0].kelas_id) : '';
                        setFilters({ year: defaultYear, kelas: defaultKelas, day: '' });
                      } else {
                        setFilters({ year: '', kelas: '', day: '' });
                      }
                    }}
                    style={{
                      alignSelf: 'flex-end',
                      background: 'transparent',
                      border: cardBorder,
                      borderRadius: '6px',
                      color: theme?.textSecondary,
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = theme?.textPrimary; e.currentTarget.style.borderColor = theme?.textPrimary; }}
                    onMouseLeave={e => { e.currentTarget.style.color = theme?.textSecondary; e.currentTarget.style.borderColor = theme?.border || '#EAEAEA'; }}
                  >
                    Reset
                  </button>
                </div>

                {/* Right: View Mode Segmented Switcher */}
                <div style={{
                  display: 'inline-flex',
                  background: theme?.cardBgAlt,
                  border: cardBorder,
                  borderRadius: '6px',
                  padding: '3px',
                  gap: '2px',
                  alignSelf: 'flex-end'
                }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: viewMode === 'grid' ? 600 : 500,
                      color: viewMode === 'grid' ? theme?.textPrimary : theme?.textSecondary,
                      background: viewMode === 'grid' ? theme?.cardBg : 'transparent',
                      border: viewMode === 'grid' ? cardBorder : '1px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <FontAwesomeIcon icon={faThLarge} style={{ fontSize: '11px' }} />
                    <span>Grid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: viewMode === 'table' ? 600 : 500,
                      color: viewMode === 'table' ? theme?.textPrimary : theme?.textSecondary,
                      background: viewMode === 'table' ? theme?.cardBg : 'transparent',
                      border: viewMode === 'table' ? cardBorder : '1px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <FontAwesomeIcon icon={faTable} style={{ fontSize: '11px' }} />
                    <span>Table</span>
                  </button>
                </div>

              </div>

              {/* Quick Summary Strip if Class Selected */}
              {filters.year && filters.kelas && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  paddingTop: '12px',
                  borderTop: cardBorder,
                  fontSize: '12px',
                  color: theme?.textSecondary
                }}>
                  <span style={{ fontWeight: 600, color: theme?.textPrimary }}>
                    {selectedKelasObj?.kelas_nama || 'Selected Class'}
                  </span>
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span><strong>{stats.totalBlocks}</strong> Total Blocks</span>
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span><strong>{stats.subjectBlocks}</strong> Lesson Subjects ({stats.uniqueSubjects} unique)</span>
                  {stats.customBlocks > 0 && (
                    <>
                      <span style={{ opacity: 0.4 }}>•</span>
                      <span><strong>{stats.customBlocks}</strong> Routines / Breaks</span>
                    </>
                  )}
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span style={{ fontFamily: 'ui-monospace, monospace' }}><strong>{stats.formattedTime}</strong> Total Scheduled</span>
                </div>
              )}
            </div>

            {/* ── SCHEDULE DISPLAY CONTAINER ──────────────────────────────────── */}
            {!filters.year || !filters.kelas ? (
              <div style={{
                background: theme?.cardBg,
                border: cardBorder,
                borderRadius: '10px',
                padding: '40px 24px',
                textAlign: 'center',
                color: theme?.textSecondary,
                fontSize: '13px'
              }}>
                Please select an Academic Year and Class to view the schedule.
              </div>
            ) : viewMode === 'grid' ? (
              
              /* ── 5-COLUMN BENTO WEEKLY GRID ────────────────────────────────── */
              <div style={{
                display: 'grid',
                gridTemplateColumns: filters.day ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px'
              }}>
                {(filters.day ? [filters.day] : DAYS).map(day => {
                  const items = sorted.filter(r => r.timetable_day === day);
                  const isToday = day === TODAY_NAME;

                  return (
                    <div
                      key={day}
                      style={{
                        background: theme?.cardBg,
                        border: isToday ? `1.5px solid ${isDark ? '#52525B' : '#18181B'}` : cardBorder,
                        borderRadius: '10px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      {/* Day Column Header */}
                      <div style={{
                        padding: '12px 14px',
                        background: isToday ? (isDark ? 'rgba(255,255,255,0.06)' : '#F7F6F3') : theme?.cardBgAlt,
                        borderBottom: cardBorder,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: theme?.textPrimary }}>
                            {day}
                          </span>
                          {isToday && (
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              padding: '1px 6px',
                              borderRadius: '9999px',
                              background: theme?.todayBg,
                              color: theme?.todayText
                            }}>
                              Today
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: theme?.textSecondary }}>
                          {items.length} {items.length === 1 ? 'block' : 'blocks'}
                        </span>
                      </div>

                      {/* Day Cards List */}
                      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: '100px' }}>
                        {items.length === 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: theme?.textSecondary, fontSize: '12px', fontStyle: 'italic', padding: '24px 0' }}>
                            No data
                          </div>
                        ) : items.map(r => {
                          const { start, end } = parseRange(r.timetable_time);
                          const startTime = extractHM(start);
                          const endTime = extractHM(end);
                          const durationMin = (() => {
                            const s = new Date(start.replace(' ', 'T'));
                            const e = new Date(end.replace(' ', 'T'));
                            return (!isNaN(s) && !isNaN(e) && e > s) ? (e - s) / 60000 : null;
                          })();

                          const dk = dkMap.get(r.timetable_detail_kelas_id);
                          const isCustom = Boolean(r.custom_label);

                          // Pastel background calculation for custom routine block
                          const customHex = r.custom_color || 'F3E8FF';
                          const blockBg = isCustom 
                            ? (isDark ? `rgba(147, 51, 234, 0.15)` : `#${customHex}`)
                            : (isDark ? '#27272A' : '#FAF9F5');
                          const blockBorder = isCustom
                            ? (isDark ? `rgba(168, 85, 247, 0.3)` : `rgba(0, 0, 0, 0.08)`)
                            : cardBorder;

                          return (
                            <div
                              key={r.timetable_id}
                              style={{
                                background: blockBg,
                                border: blockBorder,
                                borderRadius: '8px',
                                padding: '10px 12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                transition: 'all 0.15s ease',
                                position: 'relative'
                              }}
                            >
                              {/* Top Bar: Time Monospace Tag & Action Buttons */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    fontFamily: 'ui-monospace, monospace',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: isCustom ? (isDark ? '#D8B4FE' : '#6B21A8') : (isDark ? '#93C5FD' : '#1D4ED8'),
                                    background: isCustom ? (isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.6)') : (isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF'),
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: `1px solid ${isCustom ? (isDark ? 'rgba(168, 85, 247, 0.3)' : 'rgba(0,0,0,0.06)') : (isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE')}`
                                  }}>
                                    {startTime} – {endTime}
                                  </span>
                                  {durationMin && (
                                    <span style={{ fontSize: '10px', color: theme?.textSecondary, fontFamily: 'ui-monospace, monospace' }}>
                                      {durationMin}m
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <button
                                    type="button"
                                    onClick={() => openEdit(r)}
                                    title="Edit Block"
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: theme?.textSecondary,
                                      padding: '3px 5px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      cursor: 'pointer'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.color = theme?.textPrimary}
                                    onMouseLeave={e => e.currentTarget.style.color = theme?.textSecondary}
                                  >
                                    <FontAwesomeIcon icon={faEdit} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDelete({ open: true, row: r })}
                                    title="Delete Block"
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: theme?.textSecondary,
                                      padding: '3px 5px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      cursor: 'pointer'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                                    onMouseLeave={e => e.currentTarget.style.color = theme?.textSecondary}
                                  >
                                    <FontAwesomeIcon icon={faTrash} />
                                  </button>
                                </div>
                              </div>

                              {/* Block Content */}
                              {isCustom ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: isDark ? '#F4F4F5' : '#111111' }}>
                                    ☕ {r.custom_label}
                                  </span>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    {dk?.subject_code && (
                                      <span style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        background: theme?.blueBg,
                                        color: theme?.blueText,
                                        textTransform: 'uppercase'
                                      }}>
                                        {dk.subject_code}
                                      </span>
                                    )}
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: theme?.textPrimary }}>
                                      {dk?.subject_name || 'Subject'}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: theme?.textSecondary, marginTop: '2px' }}>
                                    <FontAwesomeIcon icon={faChalkboardTeacher} style={{ fontSize: '10px', opacity: 0.6 }} />
                                    <span>{dk?.teacher_name || <em style={{ opacity: 0.6 }}>No teacher assigned</em>}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

            ) : (

              /* ── HIGH DENSITY TABLE VIEW ──────────────────────────────────── */
              <div style={{
                background: theme?.cardBg,
                border: cardBorder,
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: theme?.cardBgAlt, borderBottom: cardBorder }}>
                        {['Day', 'Time Range', 'Duration', 'Type / Subject', 'Teacher', 'Class', 'Actions'].map(th => (
                          <th key={th} style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: theme?.textSecondary }}>
                            {th}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: theme?.textSecondary, fontStyle: 'italic' }}>
                            No data
                          </td>
                        </tr>
                      ) : sorted.map((r, idx) => {
                        const { start, end } = parseRange(r.timetable_time);
                        const startTime = extractHM(start);
                        const endTime = extractHM(end);
                        const durationMin = (() => {
                          const s = new Date(start.replace(' ', 'T'));
                          const e = new Date(end.replace(' ', 'T'));
                          return (!isNaN(s) && !isNaN(e) && e > s) ? (e - s) / 60000 : null;
                        })();

                        const dk = dkMap.get(r.timetable_detail_kelas_id);
                        const rowKelasNama = r.custom_label
                          ? (kelasMap.get(r.kelas_id)?.kelas_nama || '-')
                          : (dk?.kelas_nama || '-');

                        return (
                          <tr
                            key={r.timetable_id}
                            style={{
                              borderBottom: idx === sorted.length - 1 ? 'none' : cardBorder,
                              transition: 'background 0.1s ease'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : '#FAF9F5'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: theme?.textPrimary }}>
                              {r.timetable_day}
                            </td>
                            <td style={{ padding: '12px 16px', fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: theme?.textPrimary }}>
                              {startTime} – {endTime}
                            </td>
                            <td style={{ padding: '12px 16px', color: theme?.textSecondary, fontFamily: 'ui-monospace, monospace' }}>
                              {durationMin ? `${durationMin} min` : '-'}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {r.custom_label ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  background: isDark ? 'rgba(168, 85, 247, 0.2)' : '#F3E8FF',
                                  color: isDark ? '#D8B4FE' : '#6B21A8',
                                  fontSize: '12px',
                                  fontWeight: 600
                                }}>
                                  ☕ {r.custom_label}
                                </span>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {dk?.subject_code && (
                                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: theme?.blueBg, color: theme?.blueText }}>
                                      {dk.subject_code}
                                    </span>
                                  )}
                                  <span style={{ fontWeight: 600, color: theme?.textPrimary }}>
                                    {dk?.subject_name || '-'}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', color: theme?.textSecondary }}>
                              {r.custom_label ? (
                                <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Routine Event</span>
                              ) : (
                                dk?.teacher_name || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Unassigned</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', color: theme?.textSecondary }}>
                              {rowKelasNama}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Button
                                  type="button"
                                  onClick={() => openEdit(r)}
                                  style={{
                                    background: 'transparent',
                                    border: cardBorder,
                                    color: theme?.textPrimary,
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    borderRadius: '4px'
                                  }}
                                >
                                  <FontAwesomeIcon icon={faEdit} style={{ marginRight: '4px' }} /> Edit
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => setConfirmDelete({ open: true, row: r })}
                                  style={{
                                    background: 'transparent',
                                    border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5'}`,
                                    color: isDark ? '#FCA5A5' : '#DC2626',
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    borderRadius: '4px'
                                  }}
                                >
                                  <FontAwesomeIcon icon={faTrash} style={{ marginRight: '4px' }} /> Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* ── EXCEPTIONS TAB CONTENT ──────────────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'exceptions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Header info banner */}
            <div style={{
              background: theme?.cardBg,
              border: cardBorder,
              borderRadius: '10px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 2px 0', color: theme?.textPrimary }}>
                  Academic Exceptions &amp; Holidays
                </h3>
                <p style={{ fontSize: '12px', color: theme?.textSecondary, margin: 0 }}>
                  Special days, holidays, and partial timetable override windows.
                </p>
              </div>
              <span style={{
                fontSize: '12px',
                fontFamily: 'ui-monospace, monospace',
                padding: '4px 10px',
                borderRadius: '6px',
                background: theme?.cardBgAlt,
                border: cardBorder,
                color: theme?.textSecondary
              }}>
                {exceptions.length} recorded {exceptions.length === 1 ? 'exception' : 'exceptions'}
              </span>
            </div>

            {loadingExceptions ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: theme?.textSecondary }}>
                <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '22px', marginBottom: '8px' }} />
                <p style={{ fontSize: '13px', margin: 0 }}>Loading exceptions...</p>
              </div>
            ) : exceptions.length === 0 ? (
              <div style={{
                background: theme?.cardBg,
                border: cardBorder,
                borderRadius: '10px',
                padding: '40px 24px',
                textAlign: 'center',
                color: theme?.textSecondary,
                fontSize: '13px'
              }}>
                No exceptions configured. Add school holidays or special calendar events to override regular schedules.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {exByMonth.map(([month, exList]) => {
                  const [y, m] = month.split('-');
                  const monthLabel = new Date(parseInt(y), parseInt(m) - 1, 1)
                    .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

                  return (
                    <div key={month} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '4px', borderBottom: cardBorder }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: theme?.textPrimary }}>
                          {monthLabel}
                        </span>
                        <span style={{ fontSize: '11px', color: theme?.textSecondary, fontFamily: 'ui-monospace, monospace' }}>
                          ({exList.length})
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                        {exList.map(ex => {
                          const isHoliday = ex.exception_type === 'holiday';
                          const itemBg = isHoliday
                            ? (isDark ? 'rgba(239, 68, 68, 0.1)' : theme?.redBg)
                            : (isDark ? 'rgba(245, 158, 11, 0.1)' : theme?.yellowBg);
                          const itemText = isHoliday ? theme?.redText : theme?.yellowText;

                          return (
                            <div
                              key={ex.exception_id}
                              style={{
                                background: theme?.cardBg,
                                border: cardBorder,
                                borderRadius: '10px',
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '12px'
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '9999px',
                                    background: itemBg,
                                    color: itemText,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em'
                                  }}>
                                    <FontAwesomeIcon icon={isHoliday ? faBan : faCalendarAlt} style={{ fontSize: '10px' }} />
                                    {isHoliday ? 'Full Holiday' : 'Special Event'}
                                  </span>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <button
                                      type="button"
                                      onClick={() => openEditEx(ex)}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: theme?.textSecondary,
                                        padding: '2px 4px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.color = theme?.textPrimary}
                                      onMouseLeave={e => e.currentTarget.style.color = theme?.textSecondary}
                                    >
                                      <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteEx({ open: true, row: ex })}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: theme?.textSecondary,
                                        padding: '2px 4px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                                      onMouseLeave={e => e.currentTarget.style.color = theme?.textSecondary}
                                    >
                                      <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                  </div>
                                </div>

                                <h4 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px 0', color: theme?.textPrimary }}>
                                  {ex.exception_label}
                                </h4>

                                <div style={{ fontSize: '12px', color: theme?.textSecondary, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <FontAwesomeIcon icon={faCalendarDay} style={{ fontSize: '11px', opacity: 0.6 }} />
                                    <span>{fmtDate(ex.exception_date)}</span>
                                  </div>

                                  {!isHoliday && ex.start_time && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'ui-monospace, monospace' }}>
                                      <FontAwesomeIcon icon={faClock} style={{ fontSize: '11px', opacity: 0.6 }} />
                                      <span>{ex.start_time.slice(0, 5)} – {ex.end_time?.slice(0, 5) || '?'}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div style={{ borderTop: cardBorder, paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', color: theme?.textSecondary }}>
                                  <strong>Scope:</strong> {ex.affects_all_kelas ? 'All Classes (School-wide)' : `Specific Classes (${ex.affected_kelas_ids?.length || 0} classes)`}
                                </span>
                                {ex.note && (
                                  <span style={{ fontSize: '11px', color: theme?.textSecondary, fontStyle: 'italic' }}>
                                    &ldquo;{ex.note}&rdquo;
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* ── SCHEDULE BLOCK FORM MODAL ──────────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        <Modal
          isOpen={showForm}
          onClose={() => { setShowForm(false); setEditing(null); }}
          title={editing ? 'Edit Schedule Block' : 'New Schedule Block'}
        >
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Type Segment Selector */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '3px',
              background: theme?.cardBgAlt,
              border: cardBorder,
              borderRadius: '8px',
              gap: '4px'
            }}>
              <button
                type="button"
                onClick={() => { setFormBlockType('subject'); setFormErrors({}); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: formBlockType === 'subject' ? cardBorder : '1px solid transparent',
                  background: formBlockType === 'subject' ? theme?.cardBg : 'transparent',
                  color: formBlockType === 'subject' ? theme?.textPrimary : theme?.textSecondary,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                📚 Class Subject Lesson
              </button>

              <button
                type="button"
                onClick={() => { setFormBlockType('custom'); setFormErrors({}); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: formBlockType === 'custom' ? cardBorder : '1px solid transparent',
                  background: formBlockType === 'custom' ? theme?.cardBg : 'transparent',
                  color: formBlockType === 'custom' ? theme?.textPrimary : theme?.textSecondary,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                ☕ Custom Routine (BREAK / Devotion)
              </button>
            </div>

            {formBlockType === 'custom' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                    Custom Routine Name *
                  </Label>
                  <Input
                    value={formCustomLabel}
                    onChange={e => setFormCustomLabel(e.target.value)}
                    placeholder="e.g. BREAK, Morning Devotion, Lunch Break, Assembly"
                    style={inputStyle}
                  />
                  {formErrors.customLabel && <p style={{ color: '#EF4444', fontSize: '12px', margin: '4px 0 0 0' }}>{formErrors.customLabel}</p>}
                  
                  {/* Quick Presets */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {['BREAK', 'Morning Devotion', 'Lunch Break', 'Assembly', 'Homeroom Time', 'Silent Reading'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFormCustomLabel(preset)}
                        style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          borderRadius: '9999px',
                          background: theme?.cardBgAlt,
                          border: cardBorder,
                          color: theme?.textSecondary,
                          cursor: 'pointer',
                          transition: 'all 0.1s ease'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = theme?.textPrimary; e.currentTarget.style.borderColor = theme?.textPrimary; }}
                        onMouseLeave={e => { e.currentTarget.style.color = theme?.textSecondary; e.currentTarget.style.borderColor = theme?.border || '#EAEAEA'; }}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Swatches */}
                <div>
                  <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                    Cell Fill Color
                  </Label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                      { label: 'Purple Pastel', hex: 'F3E8FF', bg: '#F3E8FF', text: '#6B21A8' },
                      { label: 'Yellow Pastel', hex: 'FEF08A', bg: '#FEF08A', text: '#854D0E' },
                      { label: 'Green Pastel', hex: 'DCFCE7', bg: '#DCFCE7', text: '#166534' },
                      { label: 'Blue Pastel', hex: 'E0F2FE', bg: '#E0F2FE', text: '#075985' },
                      { label: 'Warm Gray', hex: 'F3F4F6', bg: '#F3F4F6', text: '#374151' },
                    ].map(c => {
                      const isSelected = formCustomColor === c.hex;
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setFormCustomColor(c.hex)}
                          style={{
                            background: c.bg,
                            color: c.text,
                            border: isSelected ? `2px solid ${isDark ? '#FFFFFF' : '#111111'}` : '1px solid rgba(0,0,0,0.1)',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {isSelected && <FontAwesomeIcon icon={faCheck} style={{ fontSize: '10px' }} />}
                          <span>{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div>
                    <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                      Academic Year *
                    </Label>
                    <select
                      value={formYear}
                      onChange={e => { setFormYear(e.target.value); setFormKelas(''); }}
                      style={{ ...inputStyle, width: '100%', padding: '8px 12px' }}
                    >
                      <option value="">Select Year</option>
                      {years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
                    </select>
                  </div>

                  <div>
                    <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                      Class *
                    </Label>
                    <select
                      value={formKelas}
                      disabled={!formYear}
                      onChange={e => setFormKelas(e.target.value)}
                      style={{ ...inputStyle, width: '100%', padding: '8px 12px' }}
                    >
                      <option value="">{!formYear ? 'Select year first' : 'Select Class'}</option>
                      {groupedFormKelasOptions.pyp.length > 0 && (
                        <optgroup label="── PYP Classes ──">
                          {groupedFormKelasOptions.pyp.map(k => (
                            <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>
                          ))}
                        </optgroup>
                      )}
                      {groupedFormKelasOptions.myp.length > 0 && (
                        <optgroup label="── MYP Classes ──">
                          {groupedFormKelasOptions.myp.map(k => (
                            <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>
                          ))}
                        </optgroup>
                      )}
                      {groupedFormKelasOptions.other.length > 0 && (
                        <optgroup label="── Other Classes ──">
                          {groupedFormKelasOptions.other.map(k => (
                            <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {formErrors.kelas && <p style={{ color: '#EF4444', fontSize: '12px', margin: '4px 0 0 0' }}>{formErrors.kelas}</p>}
                  </div>
                </div>

                {/* Days Selector */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                      Days / Hari *
                    </Label>
                    {!editing && (
                      <button
                        type="button"
                        onClick={() => {
                          if (formDays.length === DAYS.length) setFormDays([]);
                          else setFormDays([...DAYS]);
                        }}
                        style={{ background: 'none', border: 'none', fontSize: '11px', color: theme?.blueText, cursor: 'pointer', padding: 0, fontWeight: 600 }}
                      >
                        {formDays.length === DAYS.length ? 'Deselect All' : 'Select All Weekdays'}
                      </button>
                    )}
                  </div>

                  {editing ? (
                    <select
                      value={formDay}
                      onChange={e => setFormDay(e.target.value)}
                      style={{ ...inputStyle, width: '100%', padding: '8px 12px' }}
                    >
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', background: theme?.cardBgAlt, border: cardBorder, borderRadius: '8px' }}>
                      {DAYS.map(d => {
                        const isChecked = formDays.includes(d);
                        return (
                          <label
                            key={d}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: isChecked ? 600 : 500,
                              background: isChecked ? (isDark ? 'rgba(255,255,255,0.1)' : '#111111') : theme?.cardBg,
                              color: isChecked ? '#FFFFFF' : theme?.textPrimary,
                              border: cardBorder,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) setFormDays([...formDays, d]);
                                else setFormDays(formDays.filter(day => day !== d));
                              }}
                              style={{ display: 'none' }}
                            />
                            {isChecked && <FontAwesomeIcon icon={faCheck} style={{ fontSize: '10px' }} />}
                            {d}
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {formErrors.day && <p style={{ color: '#EF4444', fontSize: '12px', margin: '4px 0 0 0' }}>{formErrors.day}</p>}
                </div>

                {/* Time Range */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                      Start Time *
                    </Label>
                    <Input
                      type="time"
                      value={formStart}
                      onChange={e => setFormStart(e.target.value)}
                      style={inputStyle}
                    />
                    {formErrors.startTime && <p style={{ color: '#EF4444', fontSize: '12px', margin: '4px 0 0 0' }}>{formErrors.startTime}</p>}
                  </div>

                  <div>
                    <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                      End Time *
                    </Label>
                    <Input
                      type="time"
                      value={formEnd}
                      onChange={e => setFormEnd(e.target.value)}
                      style={inputStyle}
                    />
                    {formErrors.endTime && <p style={{ color: '#EF4444', fontSize: '12px', margin: '4px 0 0 0' }}>{formErrors.endTime}</p>}
                  </div>
                </div>

              </div>
            ) : (

              /* ── CLASS SUBJECT LESSON FORM ────────────────────────────────── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div>
                    <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                      Academic Year *
                    </Label>
                    <select
                      value={formYear}
                      onChange={e => { setFormYear(e.target.value); setFormKelas(''); setFormDetailKelasId(''); }}
                      style={{ ...inputStyle, width: '100%', padding: '8px 12px' }}
                    >
                      <option value="">Select Year</option>
                      {years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
                    </select>
                  </div>

                  <div>
                    <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                      Class *
                    </Label>
                    <select
                      value={formKelas}
                      disabled={!formYear}
                      onChange={e => { setFormKelas(e.target.value); setFormDetailKelasId(''); }}
                      style={{ ...inputStyle, width: '100%', padding: '8px 12px' }}
                    >
                      <option value="">{!formYear ? 'Select year first' : 'Select Class'}</option>
                      {groupedFormKelasOptions.pyp.length > 0 && (
                        <optgroup label="── PYP Classes ──">
                          {groupedFormKelasOptions.pyp.map(k => (
                            <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>
                          ))}
                        </optgroup>
                      )}
                      {groupedFormKelasOptions.myp.length > 0 && (
                        <optgroup label="── MYP Classes ──">
                          {groupedFormKelasOptions.myp.map(k => (
                            <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>
                          ))}
                        </optgroup>
                      )}
                      {groupedFormKelasOptions.other.length > 0 && (
                        <optgroup label="── Other Classes ──">
                          {groupedFormKelasOptions.other.map(k => (
                            <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                    Subject *
                  </Label>
                  <select
                    value={formDetailKelasId}
                    disabled={!formKelas}
                    onChange={e => setFormDetailKelasId(e.target.value)}
                    style={{ ...inputStyle, width: '100%', padding: '8px 12px' }}
                  >
                    <option value="">{!formKelas ? 'Select class first' : `Select Subject (${formSubjectOptions.length} available)`}</option>
                    {formSubjectOptions.map(d => (
                      <option key={d.detail_kelas_id} value={d.detail_kelas_id}>
                        {d.subject_code ? `[${d.subject_code}] ` : ''}{d.subject_name}
                        {d.teacher_name ? ` — ${d.teacher_name}` : ''}
                      </option>
                    ))}
                  </select>
                  {formErrors.subject && <p style={{ color: '#EF4444', fontSize: '12px', margin: '4px 0 0 0' }}>{formErrors.subject}</p>}

                  {selectedDk && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: theme?.blueBg,
                      color: theme?.blueText,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <FontAwesomeIcon icon={faChalkboardTeacher} />
                      <span><strong>Teacher:</strong> {selectedDk.teacher_name || 'Not assigned'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                    Day *
                  </Label>
                  <select
                    value={formDay}
                    onChange={e => setFormDay(e.target.value)}
                    style={{ ...inputStyle, width: '100%', padding: '8px 12px' }}
                  >
                    <option value="">Select Day</option>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {formErrors.day && <p style={{ color: '#EF4444', fontSize: '12px', margin: '4px 0 0 0' }}>{formErrors.day}</p>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                      Start Time *
                    </Label>
                    <Input
                      type="time"
                      value={formStart}
                      onChange={e => setFormStart(e.target.value)}
                      style={inputStyle}
                    />
                    {formErrors.startTime && <p style={{ color: '#EF4444', fontSize: '12px', margin: '4px 0 0 0' }}>{formErrors.startTime}</p>}
                  </div>

                  <div>
                    <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                      End Time *
                    </Label>
                    <Input
                      type="time"
                      value={formEnd}
                      onChange={e => setFormEnd(e.target.value)}
                      style={inputStyle}
                    />
                    {formErrors.endTime && <p style={{ color: '#EF4444', fontSize: '12px', margin: '4px 0 0 0' }}>{formErrors.endTime}</p>}
                  </div>
                </div>

              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px', paddingTop: '14px', borderTop: cardBorder }}>
              <Button
                type="button"
                onClick={() => { setShowForm(false); setEditing(null); }}
                style={{ background: 'none', border: cardBorder, color: theme?.textPrimary, fontSize: '13px' }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                style={{
                  background: isDark ? '#FFFFFF' : '#111111',
                  color: isDark ? '#111111' : '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '9px 16px',
                  borderRadius: '6px'
                }}
              >
                {submitting ? (
                  <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '6px' }} /> Saving...</>
                ) : editing ? (
                  'Save Changes'
                ) : (
                  'Create Block'
                )}
              </Button>
            </div>

          </form>
        </Modal>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* ── EXCEPTION FORM MODAL ───────────────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        <Modal
          isOpen={showExForm}
          onClose={() => { setShowExForm(false); setEditingEx(null); }}
          title={editingEx ? 'Edit Academic Exception' : 'Add Academic Exception'}
        >
          <form onSubmit={onSubmitEx} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                  Date *
                </Label>
                <Input
                  type="date"
                  value={exForm.exception_date}
                  onChange={e => setExForm(p => ({ ...p, exception_date: e.target.value }))}
                  style={inputStyle}
                />
                {exFormErrors.date && <p style={{ color: '#EF4444', fontSize: '12px', margin: '4px 0 0 0' }}>{exFormErrors.date}</p>}
              </div>

              <div>
                <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                  Exception Type *
                </Label>
                <select
                  value={exForm.exception_type}
                  onChange={e => setExForm(p => ({ ...p, exception_type: e.target.value, start_time: '', end_time: '' }))}
                  style={{ ...inputStyle, width: '100%', padding: '8px 12px' }}
                >
                  <option value="holiday">🚫 Full Holiday (No Classes)</option>
                  <option value="event">📅 Special Event (Time Window)</option>
                </select>
              </div>
            </div>

            <div>
              <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                Label / Event Title *
              </Label>
              <Input
                value={exForm.exception_label}
                onChange={e => setExForm(p => ({ ...p, exception_label: e.target.value }))}
                placeholder={exForm.exception_type === 'holiday' ? 'e.g. Hari Raya Idul Fitri' : 'e.g. Kebaktian Paskah Sekolah'}
                style={inputStyle}
              />
              {exFormErrors.label && <p style={{ color: '#EF4444', fontSize: '12px', margin: '4px 0 0 0' }}>{exFormErrors.label}</p>}
            </div>

            {exForm.exception_type === 'event' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                    Start Time *
                  </Label>
                  <Input
                    type="time"
                    value={exForm.start_time}
                    onChange={e => setExForm(p => ({ ...p, start_time: e.target.value }))}
                    style={inputStyle}
                  />
                  {exFormErrors.start_time && <p style={{ color: '#EF4444', fontSize: '12px', margin: '4px 0 0 0' }}>{exFormErrors.start_time}</p>}
                </div>

                <div>
                  <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                    End Time *
                  </Label>
                  <Input
                    type="time"
                    value={exForm.end_time}
                    onChange={e => setExForm(p => ({ ...p, end_time: e.target.value }))}
                    style={inputStyle}
                  />
                  {exFormErrors.end_time && <p style={{ color: '#EF4444', fontSize: '12px', margin: '4px 0 0 0' }}>{exFormErrors.end_time}</p>}
                </div>
              </div>
            )}

            <div>
              <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                Scope
              </Label>
              <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={exForm.affects_all_kelas}
                    onChange={() => setExForm(p => ({ ...p, affects_all_kelas: true, affected_kelas_ids: [] }))}
                  />
                  <span>All Classes (School-wide)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={!exForm.affects_all_kelas}
                    onChange={() => setExForm(p => ({ ...p, affects_all_kelas: false }))}
                  />
                  <span>Specific Classes</span>
                </label>
              </div>

              {!exForm.affects_all_kelas && (
                <div style={{
                  marginTop: '10px',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  border: cardBorder,
                  borderRadius: '6px',
                  padding: '8px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  background: theme?.cardBgAlt
                }}>
                  {kelasList.map(k => (
                    <label key={k.kelas_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={exForm.affected_kelas_ids.includes(k.kelas_id)}
                        onChange={e => setExForm(p => ({
                          ...p,
                          affected_kelas_ids: e.target.checked
                            ? [...p.affected_kelas_ids, k.kelas_id]
                            : p.affected_kelas_ids.filter(id => id !== k.kelas_id)
                        }))}
                      />
                      <span>{k.kelas_nama}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label style={{ fontSize: '11px', fontWeight: 600, color: theme?.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
                Note (Optional)
              </Label>
              <Input
                value={exForm.note}
                onChange={e => setExForm(p => ({ ...p, note: e.target.value }))}
                placeholder="Additional details regarding this calendar exception..."
                style={inputStyle}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px', paddingTop: '14px', borderTop: cardBorder }}>
              <Button
                type="button"
                onClick={() => { setShowExForm(false); setEditingEx(null); }}
                style={{ background: 'none', border: cardBorder, color: theme?.textPrimary, fontSize: '13px' }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                style={{
                  background: isDark ? '#FFFFFF' : '#111111',
                  color: isDark ? '#111111' : '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '9px 16px',
                  borderRadius: '6px'
                }}
              >
                {submitting ? (
                  <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '6px' }} /> Saving...</>
                ) : editingEx ? (
                  'Save Changes'
                ) : (
                  'Add Exception'
                )}
              </Button>
            </div>

          </form>
        </Modal>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* ── CONFIRM DELETE MODALS ──────────────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        <Modal
          isOpen={confirmDelete.open}
          onClose={() => setConfirmDelete({ open: false, row: null })}
          title="Delete Schedule Block"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {confirmDelete.row && (() => {
              const dk = dkMap.get(confirmDelete.row.timetable_detail_kelas_id);
              const { start, end } = parseRange(confirmDelete.row.timetable_time);
              return (
                <div style={{ fontSize: '13px', color: theme?.textPrimary }}>
                  <p style={{ margin: '0 0 10px 0' }}>Are you sure you want to delete this schedule block?</p>
                  <div style={{ padding: '12px', background: theme?.cardBgAlt, borderRadius: '8px', border: cardBorder, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                    <div><strong>Type:</strong> {confirmDelete.row.custom_label ? `Custom Routine (${confirmDelete.row.custom_label})` : `Subject (${dk?.subject_name || '-'})`}</div>
                    <div><strong>Day:</strong> {confirmDelete.row.timetable_day}</div>
                    <div style={{ fontFamily: 'ui-monospace, monospace' }}><strong>Time:</strong> {extractHM(start)} – {extractHM(end)}</div>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '10px', borderTop: cardBorder }}>
              <Button
                type="button"
                onClick={() => setConfirmDelete({ open: false, row: null })}
                style={{ background: 'none', border: cardBorder, color: theme?.textPrimary, fontSize: '13px' }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={onDelete}
                disabled={submitting}
                style={{
                  background: isDark ? '#EF4444' : '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '9px 16px',
                  borderRadius: '6px'
                }}
              >
                {submitting ? 'Deleting...' : 'Yes, Delete'}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={confirmDeleteEx.open}
          onClose={() => setConfirmDeleteEx({ open: false, row: null })}
          title="Delete Academic Exception"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', margin: 0, color: theme?.textPrimary }}>
              Are you sure you want to delete exception <strong>{confirmDeleteEx.row?.exception_label}</strong> on {fmtDate(confirmDeleteEx.row?.exception_date)}?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '10px', borderTop: cardBorder }}>
              <Button
                type="button"
                onClick={() => setConfirmDeleteEx({ open: false, row: null })}
                style={{ background: 'none', border: cardBorder, color: theme?.textPrimary, fontSize: '13px' }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={onDeleteEx}
                disabled={submitting}
                style={{
                  background: isDark ? '#EF4444' : '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '9px 16px',
                  borderRadius: '6px'
                }}
              >
                {submitting ? 'Deleting...' : 'Yes, Delete'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Notification Modal */}
        <NotificationModal
          isOpen={notification.isOpen}
          onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
          title={notification.title}
          message={notification.message}
          type={notification.type}
        />

      </div>
    </div>
  );
}
