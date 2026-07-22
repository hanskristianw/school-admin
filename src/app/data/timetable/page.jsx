"use client";

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faEdit, faTrash, faSpinner, faChalkboardTeacher,
  faCalendarXmark, faBan, faCalendarAlt
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

// ── Timetable Exceptions helpers ─────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export default function TimetablePage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'exceptions'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Timetable data
  const [rows, setRows] = useState([]);
  const [detailKelasAll, setDetailKelasAll] = useState([]);
  const [kelasList, setKelasList] = useState([]);
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
  const [viewMode, setViewMode] = useState('grid');

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
      const [ttRes, dkRes, kelasRes, yearRes, subjRes, usersRes] = await Promise.all([
        supabase.from('timetable').select('timetable_id, timetable_detail_kelas_id, timetable_day, timetable_time, custom_label, kelas_id, custom_color'),
        supabase.from('detail_kelas').select('detail_kelas_id, detail_kelas_subject_id, detail_kelas_kelas_id, teacher_user_id'),
        supabase.from('kelas').select('kelas_id, kelas_nama, kelas_year_id').order('kelas_nama'),
        supabase.from('year').select('year_id, year_name').order('year_name', { ascending: false }),
        supabase.from('subject').select('subject_id, subject_name, subject_code'),
        supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang').eq('is_active', true),
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
      setYears(yearRes.data || []);

      if (yearRes.data && yearRes.data.length > 0) {
        const defaultYear = String(yearRes.data[0].year_id);
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

  // ── Derived maps ─────────────────────────────────────────────────────────
  const dkMap = useMemo(() => new Map(detailKelasAll.map(d => [d.detail_kelas_id, d])), [detailKelasAll]);
  const kelasMap = useMemo(() => new Map(kelasList.map(k => [k.kelas_id, k])), [kelasList]);

  const kelasForViewFilter = useMemo(() => {
    if (!filters.year) return kelasList;
    return kelasList.filter(k => String(k.kelas_year_id) === String(filters.year));
  }, [kelasList, filters.year]);

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

  const formKelasOptions = useMemo(() => {
    if (!formYear) return kelasList;
    return kelasList.filter(k => String(k.kelas_year_id) === String(formYear));
  }, [kelasList, formYear]);

  const formSubjectOptions = useMemo(() => {
    if (!formKelas) return [];
    return [...detailKelasAll.filter(d => String(d.detail_kelas_kelas_id) === String(formKelas))]
      .sort((a, b) => (a.subject_name || '').localeCompare(b.subject_name || '', 'id'));
  }, [detailKelasAll, formKelas]);

  const selectedDk = useMemo(() =>
    formDetailKelasId ? dkMap.get(parseInt(formDetailKelasId)) : null,
    [dkMap, formDetailKelasId]);

  const selectedYear = useMemo(() =>
    years.find(y => String(y.year_id) === String(filters.year)),
    [years, filters.year]);

  // ── Group exceptions by month (must be before early return) ──────────────
  const exByMonth = useMemo(() => {
    const groups = {};
    exceptions.forEach(ex => {
      const m = ex.exception_date?.slice(0, 7) || 'unknown';
      if (!groups[m]) groups[m] = [];
      groups[m].push(ex);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [exceptions]);

  // ── Early loading return ──────────────────────────────────────────────────
  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin h-16 w-16 border-b-2 border-gray-900 rounded-full" />
    </div>
  );

  // ── Schedule form helpers ─────────────────────────────────────────────────
  const resetForm = () => {
    setFormBlockType('subject'); setFormCustomLabel(''); setFormCustomColor('F3E8FF');
    setFormYear(''); setFormKelas(''); setFormDetailKelasId('');
    setFormDay(''); setFormDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
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
        // Insert multiple rows for selected days
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
        showNotification('Success', `Created ${payloads.length} custom blocks`);
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
          showNotification('Success', 'Block updated');
        } else {
          const { data, error } = await supabase.from('timetable').insert([payload]).select();
          if (error) throw error;
          if (data?.[0]) setRows(prev => [data[0], ...prev]);
          showNotification('Success', 'Block created');
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
      showNotification('Success', 'Block deleted');
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
    if (!exForm.exception_date) e.date = 'Date required';
    if (!exForm.exception_label.trim()) e.label = 'Label required';
    if (exForm.exception_type === 'event') {
      if (!exForm.start_time) e.start_time = 'Start time required for event';
      if (!exForm.end_time) e.end_time = 'End time required for event';
      if (exForm.start_time && exForm.end_time && exForm.start_time >= exForm.end_time)
        e.end_time = 'End must be after start';
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
        showNotification('Success', 'Exception updated');
      } else {
        const { data, error } = await supabase.from('timetable_exception').insert([payload]).select();
        if (error) throw error;
        if (data?.[0]) setExceptions(prev => [data[0], ...prev]);
        showNotification('Success', 'Exception created');
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
      showNotification('Success', 'Exception deleted');
      setConfirmDeleteEx({ open: false, row: null });
    } catch (e) { showNotification('Error', 'Delete failed: ' + e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  // selectedYear and exByMonth are now declared above the early return

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
          <p className="text-gray-600">Weekly lesson schedule — linked to class subject assignments</p>
        </div>
        {activeTab === 'schedule'
          ? <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
              <FontAwesomeIcon icon={faPlus} className="mr-2" />New Block
            </Button>
          : <Button onClick={openCreateEx} className="bg-orange-600 hover:bg-orange-700 text-white">
              <FontAwesomeIcon icon={faPlus} className="mr-2" />Add Exception
            </Button>
        }
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {[
            { id: 'schedule', label: 'Schedule', icon: faCalendarAlt },
            { id: 'exceptions', label: 'Exceptions', icon: faCalendarXmark },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FontAwesomeIcon icon={tab.icon} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── SCHEDULE TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'schedule' && (<>
        {/* Filters */}
        <Card>
          <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="block text-sm font-medium mb-1">Tahun Ajaran</Label>
                <select value={filters.year}
                  onChange={e => {
                    const yr = e.target.value;
                    const availableKelas = kelasList.filter(k => String(k.kelas_year_id) === String(yr));
                    const defaultKl = availableKelas.length > 0 ? String(availableKelas[0].kelas_id) : '';
                    setFilters(prev => ({ ...prev, year: yr, kelas: defaultKl }));
                  }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Select Year --</option>
                  {years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
                </select>
              </div>
              <div>
                <Label className="block text-sm font-medium mb-1">Class</Label>
                <select value={filters.kelas}
                  disabled={!filters.year}
                  onChange={e => setFilters(prev => ({ ...prev, kelas: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Select Class --</option>
                  {kelasForViewFilter.map(k => <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>)}
                </select>
              </div>
              <div>
                <Label className="block text-sm font-medium mb-1">Day</Label>
                <select value={filters.day}
                  onChange={e => setFilters(prev => ({ ...prev, day: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Days</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => {
                  if (years.length > 0) {
                    const defaultYear = String(years[0].year_id);
                    const availableKelas = kelasList.filter(k => String(k.kelas_year_id) === defaultYear);
                    const defaultKelas = availableKelas.length > 0 ? String(availableKelas[0].kelas_id) : '';
                    setFilters({ year: defaultYear, kelas: defaultKelas, day: '' });
                  } else {
                    setFilters({ year: '', kelas: '', day: '' });
                  }
                }}>Reset</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Schedule
                {selectedYear && <span className="ml-2 text-sm font-normal text-gray-500">— {selectedYear.year_name}</span>}
              </CardTitle>
              <div className="inline-flex rounded-md shadow-sm border border-gray-200 overflow-hidden">
                <button type="button" onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 text-sm ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                  Grid
                </button>
                <button type="button" onClick={() => setViewMode('table')}
                  className={`px-3 py-1 text-sm border-l ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                  Table
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!filters.year || !filters.kelas ? (
              <div className="text-center py-12 text-gray-500 font-medium">Please select Year and Class to view the timetable schedule.</div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-12 text-gray-500 font-medium">No schedule blocks found for the selected class.</div>
            ) : viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Class', 'Subject', 'Teacher', 'Day', 'Start', 'End', 'Duration', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sorted.map(r => {
                      const { start, end } = parseRange(r.timetable_time);
                      const startTime = extractHM(start), endTime = extractHM(end);
                      const durationMin = (() => {
                        const s = new Date(start.replace(' ', 'T')), e2 = new Date(end.replace(' ', 'T'));
                        return (!isNaN(s) && !isNaN(e2)) ? (e2 - s) / 60000 : '';
                      })();
                      const dk = dkMap.get(r.timetable_detail_kelas_id);
                      const rowKelasNama = r.custom_label
                        ? (kelasMap.get(r.kelas_id)?.kelas_nama || '-')
                        : (dk?.kelas_nama || '-');

                      return (
                        <tr key={r.timetable_id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900 font-medium">{rowKelasNama}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {r.custom_label ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                ☕ {r.custom_label}
                              </span>
                            ) : (
                              dk?.subject_code || dk?.subject_name || '-'
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {r.custom_label ? (
                              <span className="text-gray-400 italic">Custom Event</span>
                            ) : (
                              dk?.teacher_name || <span className="text-gray-400 italic">No teacher set</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{r.timetable_day}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{startTime}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{endTime}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{durationMin !== '' ? `${durationMin} min` : '-'}</td>
                          <td className="px-4 py-2 text-sm">
                            <div className="flex space-x-2">
                              <Button onClick={() => openEdit(r)} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 text-sm">
                                <FontAwesomeIcon icon={faEdit} className="mr-1" />Edit
                              </Button>
                              <Button onClick={() => setConfirmDelete({ open: true, row: r })} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm">
                                <FontAwesomeIcon icon={faTrash} className="mr-1" />Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={`grid grid-cols-1 md:grid-cols-${filters.day ? '1' : '5'} gap-4`}>
                {(filters.day ? [filters.day] : DAYS).map(day => {
                  const items = sorted.filter(r => r.timetable_day === day);
                  return (
                    <div key={day} className="border rounded-md bg-white">
                      <div className="px-3 py-2 border-b bg-gray-50 font-medium text-gray-700 flex items-center justify-between">
                        <span>{day}</span>
                        <span className="text-xs text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="p-3 space-y-2 min-h-[4rem]">
                        {items.length === 0 ? (
                          <div className="text-sm text-gray-400">No items</div>
                        ) : items.map(r => {
                          const { start, end } = parseRange(r.timetable_time);
                          const dk = dkMap.get(r.timetable_detail_kelas_id);
                          const rowKelasNama = r.custom_label
                            ? (kelasMap.get(r.kelas_id)?.kelas_nama || '-')
                            : (dk?.kelas_nama || '-');

                          const customBg = r.custom_color ? `#${r.custom_color}` : '#F3E8FF';
                          const customBorder = r.custom_color ? `#${r.custom_color}` : '#E9D5FF';

                          return (
                            <div key={r.timetable_id} style={{ backgroundColor: r.custom_label ? customBg : undefined }} className={`border rounded-md p-2 ${r.custom_label ? 'border-purple-300 shadow-xs' : 'bg-blue-50 border-blue-200'}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className={`text-sm font-semibold truncate ${r.custom_label ? 'text-gray-900' : 'text-blue-900'}`}>
                                    {r.custom_label ? (
                                      <span>☕ {r.custom_label} ({rowKelasNama})</span>
                                    ) : (
                                      <span>{rowKelasNama} — {dk?.subject_code || dk?.subject_name || '-'}</span>
                                    )}
                                  </div>
                                  <div className={`text-xs ${r.custom_label ? 'text-purple-700' : 'text-blue-700'}`}>{extractHM(start)} – {extractHM(end)}</div>
                                  {!r.custom_label && dk?.teacher_name && (
                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                      <FontAwesomeIcon icon={faChalkboardTeacher} className="text-gray-400" />
                                      {dk.teacher_name}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1 shrink-0">
                                  <Button onClick={() => openEdit(r)} className="!px-2 !py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs">
                                    <FontAwesomeIcon icon={faEdit} />
                                  </Button>
                                  <Button onClick={() => setConfirmDelete({ open: true, row: r })} className="!px-2 !py-1 bg-red-600 hover:bg-red-700 text-white text-xs">
                                    <FontAwesomeIcon icon={faTrash} />
                                  </Button>
                                </div>
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
          </CardContent>
        </Card>
      </>)}

      {/* ── EXCEPTIONS TAB ────────────────────────────────────────────────── */}
      {activeTab === 'exceptions' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Schedule Exceptions</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Set holidays and special events that override the default timetable for specific dates.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingExceptions ? (
              <div className="flex justify-center py-8">
                <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-gray-400" />
              </div>
            ) : exceptions.length === 0 ? (
              <div className="text-center py-12">
                <FontAwesomeIcon icon={faCalendarXmark} className="text-4xl text-gray-300 mb-3" />
                <p className="text-gray-500">No exceptions set yet.</p>
                <p className="text-sm text-gray-400 mt-1">Add holidays or special events to override the default schedule.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {exByMonth.map(([month, exList]) => {
                  const [y, m] = month.split('-');
                  const monthLabel = new Date(parseInt(y), parseInt(m) - 1, 1)
                    .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                  return (
                    <div key={month}>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">{monthLabel}</h3>
                      <div className="space-y-2">
                        {exList.map(ex => (
                          <div key={ex.exception_id} className={`flex items-start justify-between p-3 rounded-lg border ${
                            ex.exception_type === 'holiday' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
                          }`}>
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                ex.exception_type === 'holiday' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                              }`}>
                                <FontAwesomeIcon icon={ex.exception_type === 'holiday' ? faBan : faCalendarAlt} />
                              </div>
                              <div>
                                <div className="font-medium text-sm text-gray-900">{ex.exception_label}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{fmtDate(ex.exception_date)}</div>
                                {ex.exception_type === 'event' && ex.start_time && (
                                  <div className="text-xs text-gray-500">
                                    {ex.start_time.slice(0, 5)} – {ex.end_time?.slice(0, 5) || '?'}
                                  </div>
                                )}
                                {ex.exception_type === 'holiday' && (
                                  <span className="inline-block text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded mt-1">Full Day</span>
                                )}
                                {!ex.affects_all_kelas && ex.affected_kelas_ids?.length > 0 && (
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    Affects {ex.affected_kelas_ids.length} class{ex.affected_kelas_ids.length !== 1 ? 'es' : ''}
                                  </div>
                                )}
                                {ex.note && <div className="text-xs text-gray-400 italic mt-0.5">{ex.note}</div>}
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button onClick={() => openEditEx(ex)} className="bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 text-xs">
                                <FontAwesomeIcon icon={faEdit} />
                              </Button>
                              <Button onClick={() => setConfirmDeleteEx({ open: true, row: ex })} className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 text-xs">
                                <FontAwesomeIcon icon={faTrash} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Schedule Block Form Modal ──────────────────────────────────────── */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? 'Edit Schedule Block' : 'New Schedule Block'}>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Type Segment Selector */}
          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => { setFormBlockType('subject'); setFormErrors({}); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${formBlockType === 'subject' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
            >
              📚 Class Subject
            </button>
            <button
              type="button"
              onClick={() => { setFormBlockType('custom'); setFormErrors({}); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${formBlockType === 'custom' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'}`}
            >
              ☕ Custom Label (BREAK / Devotion)
            </button>
          </div>

          {formBlockType === 'custom' ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="custom_label">Custom Label Name *</Label>
                <Input
                  id="custom_label"
                  value={formCustomLabel}
                  onChange={e => setFormCustomLabel(e.target.value)}
                  placeholder="e.g. BREAK, Morning Devotion, Assembly"
                  className={formErrors.customLabel ? 'border-red-500' : ''}
                />
                {formErrors.customLabel && <p className="text-red-500 text-sm mt-1">{formErrors.customLabel}</p>}
                
                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['BREAK', 'Morning Devotion', 'Lunch Break', 'Assembly', 'Homeroom Time'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormCustomLabel(preset)}
                      className="px-2.5 py-1 text-[11px] bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium rounded-full border border-purple-200 transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Swatches */}
              <div>
                <Label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Cell Fill Color (Export & Web View)
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: 'Yellow', hex: 'FEF08A', bg: '#FEF08A', text: '#854D0E' },
                    { label: 'Green', hex: 'DCFCE7', bg: '#DCFCE7', text: '#166534' },
                    { label: 'Blue', hex: 'E0F2FE', bg: '#E0F2FE', text: '#075985' },
                    { label: 'Purple', hex: 'F3E8FF', bg: '#F3E8FF', text: '#6B21A8' },
                    { label: 'Red', hex: 'FEE2E2', bg: '#FEE2E2', text: '#991B1B' },
                    { label: 'Gray', hex: 'F3F4F6', bg: '#F3F4F6', text: '#374151' },
                  ].map(c => {
                    const isSelected = formCustomColor === c.hex;
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setFormCustomColor(c.hex)}
                        style={{ backgroundColor: c.bg, color: c.text }}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all flex items-center gap-1 ${isSelected ? 'ring-2 ring-purple-600 ring-offset-1 border-purple-500 shadow-sm scale-105' : 'border-gray-300 hover:opacity-90'}`}
                      >
                        {isSelected && <span>✓</span>}
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="form_year_c">1. Tahun Ajaran *</Label>
                  <select id="form_year_c" value={formYear}
                    onChange={e => { setFormYear(e.target.value); setFormKelas(''); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Year</option>
                    {years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="form_kelas_c">2. Class *</Label>
                  <select id="form_kelas_c" value={formKelas} disabled={!formYear}
                    onChange={e => setFormKelas(e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${!formYear ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                    <option value="">{!formYear ? 'Select year first' : 'Select Class'}</option>
                    {formKelasOptions.map(k => <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>)}
                  </select>
                  {formErrors.kelas && <p className="text-red-500 text-sm mt-1">{formErrors.kelas}</p>}
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <Label>3. Days / Hari *</Label>
                    {!editing && (
                      <button
                        type="button"
                        onClick={() => {
                          if (formDays.length === DAYS.length) setFormDays([]);
                          else setFormDays([...DAYS]);
                        }}
                        className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                      >
                        {formDays.length === DAYS.length ? 'Deselect All' : 'Select All Weekdays'}
                      </button>
                    )}
                  </div>
                  {editing ? (
                    <select value={formDay} onChange={e => setFormDay(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  ) : (
                    <div className="flex flex-wrap gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-md">
                      {DAYS.map(d => {
                        const checked = formDays.includes(d);
                        return (
                          <label
                            key={d}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all border ${checked ? 'bg-purple-100 text-purple-800 border-purple-300 font-semibold' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => {
                                if (e.target.checked) setFormDays([...formDays, d]);
                                else setFormDays(formDays.filter(day => day !== d));
                              }}
                              className="rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                            />
                            {d}
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {formErrors.day && <p className="text-red-500 text-sm mt-1">{formErrors.day}</p>}
                </div>
                <div>
                  <Label htmlFor="form_start">4. Start Time *</Label>
                  <Input type="time" id="form_start" value={formStart} onChange={e => setFormStart(e.target.value)} className={formErrors.startTime ? 'border-red-500' : ''} />
                  {formErrors.startTime && <p className="text-red-500 text-sm mt-1">{formErrors.startTime}</p>}
                </div>
                <div>
                  <Label htmlFor="form_end">5. End Time *</Label>
                  <Input type="time" id="form_end" value={formEnd} onChange={e => setFormEnd(e.target.value)} className={formErrors.endTime ? 'border-red-500' : ''} />
                  {formErrors.endTime && <p className="text-red-500 text-sm mt-1">{formErrors.endTime}</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="form_year">1. Tahun Ajaran</Label>
                <select id="form_year" value={formYear}
                  onChange={e => { setFormYear(e.target.value); setFormKelas(''); setFormDetailKelasId(''); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Year</option>
                  {years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="form_kelas">2. Class</Label>
                <select id="form_kelas" value={formKelas} disabled={!formYear}
                  onChange={e => { setFormKelas(e.target.value); setFormDetailKelasId(''); }}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${!formYear ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                  <option value="">{!formYear ? 'Select year first' : 'Select Class'}</option>
                  {formKelasOptions.map(k => <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="form_dk">3. Subject</Label>
                <select id="form_dk" value={formDetailKelasId} disabled={!formKelas}
                  onChange={e => setFormDetailKelasId(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.subject ? 'border-red-500' : 'border-gray-300'} ${!formKelas ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                  <option value="">{!formKelas ? 'Select class first' : `Select Subject (${formSubjectOptions.length} available)`}</option>
                  {formSubjectOptions.map(d => (
                    <option key={d.detail_kelas_id} value={d.detail_kelas_id}>
                      {d.subject_code ? `[${d.subject_code}] ` : ''}{d.subject_name}
                      {d.teacher_name ? ` — ${d.teacher_name}` : ''}
                    </option>
                  ))}
                </select>
                {formErrors.subject && <p className="text-red-500 text-sm mt-1">{formErrors.subject}</p>}
                {selectedDk && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-md border border-blue-100">
                    <FontAwesomeIcon icon={faChalkboardTeacher} className="text-blue-400" />
                    <span><strong>Teacher:</strong> {selectedDk.teacher_name || <em>Not assigned</em>}</span>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="form_day">4. Day</Label>
                <select id="form_day" value={formDay} onChange={e => setFormDay(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.day ? 'border-red-500' : 'border-gray-300'}`}>
                  <option value="">Select Day</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                {formErrors.day && <p className="text-red-500 text-sm mt-1">{formErrors.day}</p>}
              </div>
              <div />
              <div>
                <Label htmlFor="form_start">5. Start Time</Label>
                <Input type="time" id="form_start" value={formStart} onChange={e => setFormStart(e.target.value)} className={formErrors.startTime ? 'border-red-500' : ''} />
                {formErrors.startTime && <p className="text-red-500 text-sm mt-1">{formErrors.startTime}</p>}
              </div>
              <div>
                <Label htmlFor="form_end">6. End Time</Label>
                <Input type="time" id="form_end" value={formEnd} onChange={e => setFormEnd(e.target.value)} className={formErrors.endTime ? 'border-red-500' : ''} />
                {formErrors.endTime && <p className="text-red-500 text-sm mt-1">{formErrors.endTime}</p>}
              </div>
            </div>
          )}
          {formErrors.overlap && <div className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded">{formErrors.overlap}</div>}
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="bg-gray-500 hover:bg-gray-600 text-white">Cancel</Button>
            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {submitting ? <><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Saving...</> : editing ? 'Save Changes' : 'Create Block'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Exception Form Modal ──────────────────────────────────────────── */}
      <Modal isOpen={showExForm} onClose={() => { setShowExForm(false); setEditingEx(null); }} title={editingEx ? 'Edit Exception' : 'Add Schedule Exception'}>
        <form onSubmit={onSubmitEx} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ex_date">Date *</Label>
              <Input type="date" id="ex_date" value={exForm.exception_date}
                onChange={e => setExForm(p => ({ ...p, exception_date: e.target.value }))}
                className={exFormErrors.date ? 'border-red-500' : ''} />
              {exFormErrors.date && <p className="text-red-500 text-sm mt-1">{exFormErrors.date}</p>}
            </div>
            <div>
              <Label htmlFor="ex_type">Type *</Label>
              <select id="ex_type" value={exForm.exception_type}
                onChange={e => setExForm(p => ({ ...p, exception_type: e.target.value, start_time: '', end_time: '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="holiday">🚫 Holiday (Full Day)</option>
                <option value="event">📅 Special Event (Time Range)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="ex_label">Label *</Label>
              <Input id="ex_label" value={exForm.exception_label}
                onChange={e => setExForm(p => ({ ...p, exception_label: e.target.value }))}
                placeholder={exForm.exception_type === 'holiday' ? 'e.g. Hari Raya Idul Adha' : 'e.g. Kebaktian Sekolah'}
                className={exFormErrors.label ? 'border-red-500' : ''} />
              {exFormErrors.label && <p className="text-red-500 text-sm mt-1">{exFormErrors.label}</p>}
            </div>
            {exForm.exception_type === 'event' && (<>
              <div>
                <Label htmlFor="ex_start">Start Time *</Label>
                <Input type="time" id="ex_start" value={exForm.start_time}
                  onChange={e => setExForm(p => ({ ...p, start_time: e.target.value }))}
                  className={exFormErrors.start_time ? 'border-red-500' : ''} />
                {exFormErrors.start_time && <p className="text-red-500 text-sm mt-1">{exFormErrors.start_time}</p>}
              </div>
              <div>
                <Label htmlFor="ex_end">End Time *</Label>
                <Input type="time" id="ex_end" value={exForm.end_time}
                  onChange={e => setExForm(p => ({ ...p, end_time: e.target.value }))}
                  className={exFormErrors.end_time ? 'border-red-500' : ''} />
                {exFormErrors.end_time && <p className="text-red-500 text-sm mt-1">{exFormErrors.end_time}</p>}
              </div>
            </>)}
            <div className="md:col-span-2">
              <Label>Scope</Label>
              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={exForm.affects_all_kelas}
                    onChange={() => setExForm(p => ({ ...p, affects_all_kelas: true, affected_kelas_ids: [] }))} />
                  All Classes
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={!exForm.affects_all_kelas}
                    onChange={() => setExForm(p => ({ ...p, affects_all_kelas: false }))} />
                  Specific Classes
                </label>
              </div>
              {!exForm.affects_all_kelas && (
                <div className="mt-2 max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                  {kelasList.map(k => (
                    <label key={k.kelas_id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox"
                        checked={exForm.affected_kelas_ids.includes(k.kelas_id)}
                        onChange={e => setExForm(p => ({
                          ...p,
                          affected_kelas_ids: e.target.checked
                            ? [...p.affected_kelas_ids, k.kelas_id]
                            : p.affected_kelas_ids.filter(id => id !== k.kelas_id)
                        }))}
                      />
                      {k.kelas_nama}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="ex_note">Note (optional)</Label>
              <Input id="ex_note" value={exForm.note}
                onChange={e => setExForm(p => ({ ...p, note: e.target.value }))}
                placeholder="Additional notes..." />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" onClick={() => { setShowExForm(false); setEditingEx(null); }} className="bg-gray-500 hover:bg-gray-600 text-white">Cancel</Button>
            <Button type="submit" disabled={submitting} className="bg-orange-600 hover:bg-orange-700 text-white">
              {submitting ? <><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Saving...</> : editingEx ? 'Save Changes' : 'Add Exception'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete (Schedule) */}
      <Modal isOpen={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, row: null })} title="Delete Schedule Block">
        <div className="space-y-4">
          {confirmDelete.row && (() => {
            const dk = dkMap.get(confirmDelete.row.timetable_detail_kelas_id);
            return (
              <div>
                <p className="text-gray-700 mb-2">Delete this schedule block?</p>
                <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-600 space-y-1">
                  <div><strong>Class:</strong> {dk?.kelas_nama || '-'}</div>
                  <div><strong>Subject:</strong> {dk?.subject_name || '-'}</div>
                  <div><strong>Day:</strong> {confirmDelete.row.timetable_day}</div>
                  <div><strong>Time:</strong> {(() => { const { start, end } = parseRange(confirmDelete.row.timetable_time); return `${extractHM(start)} – ${extractHM(end)}`; })()}</div>
                </div>
              </div>
            );
          })()}
          <div className="flex justify-end space-x-3 pt-2">
            <Button onClick={() => setConfirmDelete({ open: false, row: null })} className="bg-gray-500 hover:bg-gray-600 text-white">Cancel</Button>
            <Button onClick={onDelete} disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">
              {submitting ? <><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Deleting...</> : 'Yes, Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete (Exception) */}
      <Modal isOpen={confirmDeleteEx.open} onClose={() => setConfirmDeleteEx({ open: false, row: null })} title="Delete Exception">
        <div className="space-y-4">
          <p className="text-gray-700">Delete exception <strong>{confirmDeleteEx.row?.exception_label}</strong> on {fmtDate(confirmDeleteEx.row?.exception_date)}?</p>
          <div className="flex justify-end space-x-3 pt-2">
            <Button onClick={() => setConfirmDeleteEx({ open: false, row: null })} className="bg-gray-500 hover:bg-gray-600 text-white">Cancel</Button>
            <Button onClick={onDeleteEx} disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">
              {submitting ? <><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Deleting...</> : 'Yes, Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}
