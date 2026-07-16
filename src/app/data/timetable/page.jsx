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
import { faPlus, faEdit, faTrash, faSpinner, faChalkboardTeacher } from '@fortawesome/free-solid-svg-icons';

/*
  Timetable — connected to /data/class structure.

  Data flow:
    timetable.timetable_detail_kelas_id
      → detail_kelas (detail_kelas_kelas_id, detail_kelas_subject_id, teacher_user_id)
          → kelas (kelas_nama, kelas_year_id → year)
          → subject (subject_name, subject_code)
          → users (teacher name)

  Schema (timetable table):
    timetable_id              PK
    timetable_detail_kelas_id FK → detail_kelas  (encodes class + subject + teacher)
    timetable_day             text  (Monday–Friday)
    timetable_time            tsrange  ([start, end))

  NOTE: timetable_user_id was dropped. Teacher is derived from detail_kelas.teacher_user_id.

  Overlap detection: per (timetable_detail_kelas_id, day) on time range.
*/

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

export default function TimetablePage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data from DB
  const [rows, setRows] = useState([]);
  const [detailKelasAll, setDetailKelasAll] = useState([]); // enriched with kelas, subject, teacher info
  const [kelasList, setKelasList] = useState([]);           // sorted by kelas_nama
  const [years, setYears] = useState([]);

  // Filters (view)
  const [filters, setFilters] = useState({ year: '', kelas: '', day: '' });

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formYear, setFormYear] = useState('');
  const [formKelas, setFormKelas] = useState('');
  const [formDetailKelasId, setFormDetailKelasId] = useState('');
  const [formDay, setFormDay] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState({ open: false, row: null });

  // Notifications
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  const [viewMode, setViewMode] = useState('grid');

  const showNotification = (title, message, type = 'success') =>
    setNotification({ isOpen: true, title, message, type });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true); setError('');
      const [ttRes, dkRes, kelasRes, yearRes, subjRes, usersRes] = await Promise.all([
        supabase.from('timetable').select('timetable_id, timetable_detail_kelas_id, timetable_day, timetable_time'),
        supabase.from('detail_kelas').select('detail_kelas_id, detail_kelas_subject_id, detail_kelas_kelas_id, teacher_user_id'),
        supabase.from('kelas').select('kelas_id, kelas_nama, kelas_year_id').order('kelas_nama'),
        supabase.from('year').select('year_id, year_name').order('year_name', { ascending: false }),
        supabase.from('subject').select('subject_id, subject_name, subject_code'),
        supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang').eq('is_active', true),
      ]);

      if (ttRes.error) throw ttRes.error;
      if (dkRes.error) throw dkRes.error;
      if (kelasRes.error) throw kelasRes.error;
      if (yearRes.error) throw yearRes.error;
      if (subjRes.error) throw subjRes.error;
      if (usersRes.error) throw usersRes.error;

      const subjMap = new Map((subjRes.data || []).map(s => [s.subject_id, s]));
      const kelasMap = new Map((kelasRes.data || []).map(k => [k.kelas_id, k]));
      const userMap = new Map((usersRes.data || []).map(u => [
        u.user_id,
        `${u.user_nama_depan} ${u.user_nama_belakang}`.trim()
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
    } catch (e) { setError(e.message); console.error(e); }
    finally { setLoading(false); }
  };

  // ── Derived maps ──────────────────────────────────────────────────────────
  const dkMap = useMemo(() =>
    new Map(detailKelasAll.map(d => [d.detail_kelas_id, d])),
    [detailKelasAll]
  );

  // kelas filtered by view year filter
  const kelasForViewFilter = useMemo(() => {
    if (!filters.year) return kelasList;
    return kelasList.filter(k => String(k.kelas_year_id) === String(filters.year));
  }, [kelasList, filters.year]);

  // Filtered rows for display
  const filtered = useMemo(() => rows.filter(r => {
    const dk = dkMap.get(r.timetable_detail_kelas_id);
    if (!dk) return false;
    if (filters.year && String(dk.kelas_year_id) !== String(filters.year)) return false;
    if (filters.kelas && String(dk.detail_kelas_kelas_id) !== String(filters.kelas)) return false;
    if (filters.day && r.timetable_day !== filters.day) return false;
    return true;
  }), [rows, filters, dkMap]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const dayIdx = d => DAYS.indexOf(d);
    const da = dayIdx(a.timetable_day);
    const db = dayIdx(b.timetable_day);
    if (da !== db) return da - db;
    const { start: saRaw } = parseRange(a.timetable_time);
    const { start: sbRaw } = parseRange(b.timetable_time);
    return extractHM(saRaw).localeCompare(extractHM(sbRaw));
  }), [filtered]);

  // kelas options for form (filtered by formYear)
  const formKelasOptions = useMemo(() => {
    if (!formYear) return kelasList;
    return kelasList.filter(k => String(k.kelas_year_id) === String(formYear));
  }, [kelasList, formYear]);

  // detail_kelas options for form (for selected kelas, sorted by subject name)
  const formSubjectOptions = useMemo(() => {
    if (!formKelas) return [];
    return [...detailKelasAll.filter(d => String(d.detail_kelas_kelas_id) === String(formKelas))]
      .sort((a, b) => (a.subject_name || '').localeCompare(b.subject_name || '', 'id'));
  }, [detailKelasAll, formKelas]);

  // Currently selected detail_kelas entry (for showing teacher info)
  const selectedDk = useMemo(() =>
    formDetailKelasId ? dkMap.get(parseInt(formDetailKelasId)) : null,
    [dkMap, formDetailKelasId]
  );

  // ── Early loading return ──────────────────────────────────────────────────
  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin h-16 w-16 border-b-2 border-gray-900 rounded-full" />
    </div>
  );

  // ── Form helpers ──────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormYear(''); setFormKelas(''); setFormDetailKelasId('');
    setFormDay(''); setFormStart(''); setFormEnd('');
    setFormErrors({});
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setShowForm(true);
  };

  const openEdit = (row) => {
    const { start, end } = parseRange(row.timetable_time);
    const dk = dkMap.get(row.timetable_detail_kelas_id);
    setEditing(row);
    setFormYear(dk ? String(dk.kelas_year_id || '') : '');
    setFormKelas(dk ? String(dk.detail_kelas_kelas_id) : '');
    setFormDetailKelasId(String(row.timetable_detail_kelas_id));
    setFormDay(row.timetable_day || '');
    setFormStart(extractHM(start));
    setFormEnd(extractHM(end));
    setFormErrors({});
    setShowForm(true);
  };

  const validate = () => {
    const e = {};
    if (!formDetailKelasId) e.subject = 'Subject / class required';
    if (!formDay) e.day = 'Day required';
    if (!formStart) e.startTime = 'Start time required';
    if (!formEnd) e.endTime = 'End time required';
    if (formStart && formEnd && formStart >= formEnd) e.endTime = 'End must be after start';

    // Overlap check: same detail_kelas_id on same day
    if (formDetailKelasId && formDay && formStart && formEnd) {
      const dup = rows.find(r => {
        if (editing && r.timetable_id === editing.timetable_id) return false;
        if (r.timetable_detail_kelas_id !== parseInt(formDetailKelasId)) return false;
        if (r.timetable_day !== formDay) return false;
        const { start, end } = parseRange(r.timetable_time);
        return !(formEnd <= extractHM(start) || formStart >= extractHM(end));
      });
      if (dup) e.overlap = 'This class+subject already has an overlapping block on this day';
    }
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      const payload = {
        timetable_detail_kelas_id: parseInt(formDetailKelasId),
        timetable_day: formDay,
        timetable_time: formatRangeForInsert(formStart, formEnd),
      };
      if (editing) {
        const { data, error } = await supabase
          .from('timetable').update(payload).eq('timetable_id', editing.timetable_id).select();
        if (error) throw error;
        if (data?.[0]) setRows(prev => prev.map(r => r.timetable_id === editing.timetable_id ? data[0] : r));
        showNotification('Success', 'Block updated');
      } else {
        const { data, error } = await supabase.from('timetable').insert([payload]).select();
        if (error) throw error;
        if (data?.[0]) setRows(prev => [data[0], ...prev]);
        showNotification('Success', 'Block created');
      }
      setShowForm(false);
    } catch (e) { console.error(e); showNotification('Error', 'Failed: ' + e.message, 'error'); }
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
    } catch (e) { console.error(e); showNotification('Error', 'Delete failed: ' + e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const selectedYear = years.find(y => String(y.year_id) === String(filters.year));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
          <p className="text-gray-600">Weekly lesson schedule — linked to class subject assignments</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
          <FontAwesomeIcon icon={faPlus} className="mr-2" />New Block
        </Button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="block text-sm font-medium mb-1">Tahun Ajaran</Label>
              <select value={filters.year}
                onChange={e => setFilters(prev => ({ ...prev, year: e.target.value, kelas: '' }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Years</option>
                {years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
              </select>
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">Class</Label>
              <select value={filters.kelas}
                onChange={e => setFilters(prev => ({ ...prev, kelas: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Classes</option>
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
              <Button variant="outline" onClick={() => setFilters({ year: '', kelas: '', day: '' })}>Reset</Button>
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
          {sorted.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No schedule blocks{filters.year ? ' for this year' : ''}</div>
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
                    const startTime = extractHM(start);
                    const endTime = extractHM(end);
                    const durationMin = (() => {
                      const s = new Date(start.replace(' ', 'T'));
                      const e2 = new Date(end.replace(' ', 'T'));
                      return (!isNaN(s) && !isNaN(e2)) ? (e2 - s) / 60000 : '';
                    })();
                    const dk = dkMap.get(r.timetable_detail_kelas_id);
                    return (
                      <tr key={r.timetable_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900 font-medium">{dk?.kelas_nama || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{dk?.subject_code || dk?.subject_name || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{dk?.teacher_name || <span className="text-gray-400 italic">No teacher set</span>}</td>
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
            // Grid view
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
                        return (
                          <div key={r.timetable_id} className="border rounded-md bg-blue-50 p-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-blue-900 truncate">
                                  {dk?.kelas_nama || '-'} — {dk?.subject_code || dk?.subject_name || '-'}
                                </div>
                                <div className="text-xs text-blue-700">{extractHM(start)} – {extractHM(end)}</div>
                                {dk?.teacher_name && (
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

      {/* ── Create / Edit Form ─────────────────────────────────────────────── */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? 'Edit Schedule Block' : 'New Schedule Block'}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Tahun Ajaran */}
            <div>
              <Label htmlFor="form_year">1. Tahun Ajaran</Label>
              <select id="form_year" value={formYear}
                onChange={e => { setFormYear(e.target.value); setFormKelas(''); setFormDetailKelasId(''); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Year</option>
                {years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
              </select>
            </div>

            {/* Class */}
            <div>
              <Label htmlFor="form_kelas">2. Class</Label>
              <select id="form_kelas" value={formKelas}
                disabled={!formYear}
                onChange={e => { setFormKelas(e.target.value); setFormDetailKelasId(''); }}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${!formYear ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                <option value="">{!formYear ? 'Select year first' : 'Select Class'}</option>
                {formKelasOptions.map(k => <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>)}
              </select>
            </div>

            {/* Subject (from detail_kelas for selected kelas) */}
            <div className="md:col-span-2">
              <Label htmlFor="form_dk">3. Subject</Label>
              <select id="form_dk" value={formDetailKelasId}
                disabled={!formKelas}
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

              {/* Teacher info read-only */}
              {selectedDk && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-md border border-blue-100">
                  <FontAwesomeIcon icon={faChalkboardTeacher} className="text-blue-400" />
                  <span><strong>Teacher:</strong> {selectedDk.teacher_name || <em>Not assigned in class settings</em>}</span>
                </div>
              )}
            </div>

            {/* Day */}
            <div>
              <Label htmlFor="form_day">4. Day</Label>
              <select id="form_day" value={formDay}
                onChange={e => setFormDay(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.day ? 'border-red-500' : 'border-gray-300'}`}>
                <option value="">Select Day</option>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {formErrors.day && <p className="text-red-500 text-sm mt-1">{formErrors.day}</p>}
            </div>

            {/* Empty grid spacer */}
            <div />

            {/* Start Time */}
            <div>
              <Label htmlFor="form_start">5. Start Time</Label>
              <Input type="time" id="form_start" value={formStart}
                onChange={e => setFormStart(e.target.value)}
                className={formErrors.startTime ? 'border-red-500' : ''} />
              {formErrors.startTime && <p className="text-red-500 text-sm mt-1">{formErrors.startTime}</p>}
            </div>

            {/* End Time */}
            <div>
              <Label htmlFor="form_end">6. End Time</Label>
              <Input type="time" id="form_end" value={formEnd}
                onChange={e => setFormEnd(e.target.value)}
                className={formErrors.endTime ? 'border-red-500' : ''} />
              {formErrors.endTime && <p className="text-red-500 text-sm mt-1">{formErrors.endTime}</p>}
            </div>
          </div>

          {formErrors.overlap && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded">{formErrors.overlap}</div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="bg-gray-500 hover:bg-gray-600 text-white">Cancel</Button>
            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {submitting ? <><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Saving...</> : editing ? 'Save Changes' : 'Create Block'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
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
                  <div><strong>Time:</strong> {(() => {
                    const { start, end } = parseRange(confirmDelete.row.timetable_time);
                    return `${extractHM(start)} – ${extractHM(end)}`;
                  })()}</div>
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
