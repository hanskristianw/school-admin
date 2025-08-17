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
import { faPlus, faEdit, faTrash, faSpinner } from '@fortawesome/free-solid-svg-icons';

/*
  Timetable CRUD for weekly recurring schedule blocks.
  Changes:
  - Uses timetable_day (Monday-Friday) instead of concrete date; schedule repeats weekly.
  - Stores time-of-day range in timetable_time using a fixed placeholder date (2000-01-01) to leverage tsrange.
  - Overlap detection now per (user, day) on time range.
  Recommendation: Add DB constraint:
    ALTER TABLE timetable ADD CONSTRAINT timetable_no_overlap EXCLUDE USING GIST (
      timetable_user_id WITH =,
      timetable_day WITH =,
      timetable_time WITH &&
    );
*/

const BASE_DATE = '2000-01-01';
const formatRangeForInsert = (startTime, endTime) => {
  // Build a tsrange with fixed date so only time-of-day matters.
  return `[${BASE_DATE} ${startTime},${BASE_DATE} ${endTime})`;
};

const parseRange = (pgRange) => {
  // Handles Postgres tsrange textual output e.g.:
  // ["2000-01-01 07:10:00","2000-01-01 08:10:00") or [2000-01-01 07:10:00,2000-01-01 08:10:00)
  if (!pgRange) return { start: '', end: '' };
  const m = pgRange.match(/^[\[(](.*),(.*)[)\]]$/);
  if (!m) return { start: '', end: '' };
  const clean = (raw) => {
    let v = raw.trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1,-1); // strip quotes
    // Ensure seconds present for consistent parsing
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v)) v += ':00';
    return v; // 'YYYY-MM-DD HH:MM:SS'
  };
  return { start: clean(m[1]), end: clean(m[2]) };
};

const extractHM = (ts) => {
  if (!ts) return '';
  const parts = ts.split(' ');
  if (parts.length < 2) return '';
  return parts[1].slice(0,5); // HH:MM
};

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

export default function TimetablePage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]); // teacher users only
  const [detailKelas, setDetailKelas] = useState([]); // raw detail_kelas rows with subject & class info
  const [subjects, setSubjects] = useState([]); // subjects (with teacher user mapping)
  const [filters, setFilters] = useState({ user: '', day: '' });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ timetable_user_id: '', subject_id: '', timetable_detail_kelas_id: '', timetable_day: '', startTime: '', endTime: '' });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, row: null });
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  const showNotification = (title, message, type='success') => setNotification({ isOpen: true, title, message, type });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true); setError('');
      const [ttRes, usersRes, rolesRes, dkRes, subjRes, kelasRes] = await Promise.all([
        supabase.from('timetable').select('timetable_id, timetable_user_id, timetable_detail_kelas_id, timetable_day, timetable_time'),
        supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang, user_role_id').eq('is_active', true),
        supabase.from('role').select('role_id, is_teacher'),
        supabase.from('detail_kelas').select('detail_kelas_id, detail_kelas_subject_id, detail_kelas_kelas_id'),
        supabase.from('subject').select('subject_id, subject_name, subject_code, subject_user_id'),
        supabase.from('kelas').select('kelas_id, kelas_nama')
      ]);
      if (ttRes.error) throw ttRes.error;
      if (usersRes.error) throw usersRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (dkRes.error) throw dkRes.error;
      if (subjRes.error) throw subjRes.error;
      if (kelasRes.error) throw kelasRes.error;
      const teacherRoleIds = new Set((rolesRes.data||[]).filter(r=>r.is_teacher).map(r=>r.role_id));
      const teacherUsers = (usersRes.data||[])
        .filter(u=> teacherRoleIds.has(u.user_role_id))
        .sort((a,b)=> (`${a.user_nama_depan} ${a.user_nama_belakang}`.trim()).localeCompare(`${b.user_nama_depan} ${b.user_nama_belakang}`.trim(), 'id', { sensitivity: 'base' }));
      setRows(ttRes.data || []);
      setUsers(teacherUsers);
      // Enrich detail_kelas with subject & class names
      const subjMap = new Map((subjRes.data||[]).map(s=>[s.subject_id, s]));
      const kelasMap = new Map((kelasRes.data||[]).map(k=>[k.kelas_id, k]));
      const dkEnriched = (dkRes.data||[]).map(d=>({
        ...d,
        subject_name: subjMap.get(d.detail_kelas_subject_id)?.subject_name || 'Subject',
        subject_code: subjMap.get(d.detail_kelas_subject_id)?.subject_code || '',
        subject_user_id: subjMap.get(d.detail_kelas_subject_id)?.subject_user_id || null,
        kelas_nama: kelasMap.get(d.detail_kelas_kelas_id)?.kelas_nama || 'Class'
      }));
      setDetailKelas(dkEnriched);
      setSubjects(subjRes.data || []);
    } catch (e) { setError(e.message); console.error(e); }
    finally { setLoading(false); }
  };

  const userMap = useMemo(() => new Map(users.map(u => [u.user_id, `${u.user_nama_depan} ${u.user_nama_belakang}`.trim()])), [users]);

  const filtered = useMemo(() => rows.filter(r => {
    const condUser = !filters.user || r.timetable_user_id === parseInt(filters.user);
    const condDay = !filters.day || r.timetable_day === filters.day;
    return condUser && condDay;
  }), [rows, filters]);

  const openCreate = () => { setEditing(null); setFormData({ timetable_user_id: '', subject_id: '', timetable_detail_kelas_id: '', timetable_day: '', startTime: '', endTime: '' }); setFormErrors({}); setShowForm(true); };
  const openEdit = (row) => {
    const { start, end } = parseRange(row.timetable_time);
    setEditing(row);
    const dk = detailKelas.find(d=> d.detail_kelas_id === row.timetable_detail_kelas_id);
    const subjectId = dk ? dk.detail_kelas_subject_id : '';
    setFormData({
      timetable_user_id: String(row.timetable_user_id),
      subject_id: subjectId ? String(subjectId) : '',
      timetable_detail_kelas_id: row.timetable_detail_kelas_id ? String(row.timetable_detail_kelas_id) : '',
      timetable_day: row.timetable_day || '',
      startTime: extractHM(start),
      endTime: extractHM(end)
    });
    setFormErrors({}); setShowForm(true);
  };

  const validate = () => {
    const e = {};
  if (!formData.timetable_user_id) e.user = 'User required';
  if (!formData.subject_id) e.subject = 'Subject required';
  if (!formData.timetable_detail_kelas_id) e.detail_kelas = 'Class required';
  if (!formData.timetable_day) e.day = 'Day required';
    if (!formData.startTime) e.startTime = 'Start time required';
    if (!formData.endTime) e.endTime = 'End time required';
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) e.endTime = 'End must be after start';
    if (formData.timetable_day && formData.startTime && formData.endTime) {
      const dup = rows.find(r => {
        if (editing && r.timetable_id === editing.timetable_id) return false;
        if (r.timetable_user_id !== parseInt(formData.timetable_user_id)) return false;
        if (r.timetable_day !== formData.timetable_day) return false;
        const { start, end } = parseRange(r.timetable_time);
        const existingStart = extractHM(start);
        const existingEnd = extractHM(end);
        return !(formData.endTime <= existingStart || formData.startTime >= existingEnd);
      });
      if (dup) e.overlap = 'Overlapping schedule for user';
    }
    setFormErrors(e); return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault(); if (!validate()) return;
    try {
      setSubmitting(true);
  const rangeStr = formatRangeForInsert(formData.startTime, formData.endTime);
  const payload = { timetable_user_id: parseInt(formData.timetable_user_id), timetable_detail_kelas_id: parseInt(formData.timetable_detail_kelas_id), timetable_day: formData.timetable_day, timetable_time: rangeStr };
      if (editing) {
        const { data, error } = await supabase
          .from('timetable')
          .update(payload)
          .eq('timetable_id', editing.timetable_id)
          .select();
        if (error) throw error;
        if (data && data[0]) setRows(prev => prev.map(r => r.timetable_id === editing.timetable_id ? data[0] : r));
        showNotification('Success', 'Entry updated', 'success');
      } else {
        const { data, error } = await supabase
          .from('timetable')
          .insert([payload])
          .select();
        if (error) throw error;
        if (data && data[0]) setRows(prev => [data[0], ...prev]);
        showNotification('Success', 'Entry created', 'success');
      }
      setShowForm(false);
    } catch (e) { console.error(e); showNotification('Error', 'Failed: ' + e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const onDelete = async () => {
    if (!confirmDelete.row) return;
    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('timetable')
        .delete()
        .eq('timetable_id', confirmDelete.row.timetable_id);
      if (error) throw error;
      setRows(prev => prev.filter(r => r.timetable_id !== confirmDelete.row.timetable_id));
      showNotification('Success', 'Entry deleted', 'success');
      setConfirmDelete({ open: false, row: null });
    } catch (e) { console.error(e); showNotification('Error', 'Delete failed: ' + e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin h-16 w-16 border-b-2 border-gray-900 rounded-full" /></div>;

  const sorted = [...filtered].sort((a,b) => {
    // Primary: day, Secondary: start time (HH:MM), Tertiary: teacher name
    const dayIdx = d => DAYS.indexOf(d);
    const da = dayIdx(a.timetable_day);
    const db = dayIdx(b.timetable_day);
    if (da !== db) return da - db;
    const { start: saRaw } = parseRange(a.timetable_time);
    const { start: sbRaw } = parseRange(b.timetable_time);
    const sa = extractHM(saRaw);
    const sb = extractHM(sbRaw);
    if (sa !== sb) return sa.localeCompare(sb);
    return (userMap.get(a.timetable_user_id)||'').localeCompare(userMap.get(b.timetable_user_id)||'');
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
          <p className="text-gray-600">Manage weekly class / lesson schedule (Monday-Friday)</p>
        </div>
  <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white"><FontAwesomeIcon icon={faPlus} className="mr-2" />New Block</Button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="block text-sm font-medium mb-1">User</Label>
              <select value={filters.user} onChange={(e)=> setFilters(prev=>({...prev, user: e.target.value}))} className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All</option>
                {users.map(u => <option key={u.user_id} value={u.user_id}>{u.user_nama_depan} {u.user_nama_belakang}</option>)}
              </select>
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">Day</Label>
              <select value={filters.day} onChange={(e)=> setFilters(prev=>({...prev, day: e.target.value}))} className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All</option>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 flex items-end">
              <Button variant="outline" onClick={()=> setFilters({ user: '', day: '' })}>Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
  <CardHeader><CardTitle>Schedule Blocks</CardTitle></CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No schedule blocks</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class/Subject</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sorted.map(r => {
                    const { start, end } = parseRange(r.timetable_time);
                    const startTime = extractHM(start);
                    const endTime = extractHM(end);
                    const startDate = new Date(start.replace(' ', 'T'));
                    const endDate = new Date(end.replace(' ', 'T'));
                    const durationMin = (!isNaN(startDate) && !isNaN(endDate)) ? (endDate - startDate) / 60000 : '';
                    return (
                      <tr key={r.timetable_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{userMap.get(r.timetable_user_id) || '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{(() => {
                          const dk = detailKelas.find(d=> d.detail_kelas_id === r.timetable_detail_kelas_id);
                          if (!dk) return '-';
                          return `${dk.kelas_nama} - ${dk.subject_code || dk.subject_name}`;
                        })()}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{r.timetable_day}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{startTime}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{endTime}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{durationMin !== '' ? `${durationMin} min` : '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button onClick={()=> openEdit(r)} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 text-sm"><FontAwesomeIcon icon={faEdit} className="mr-1" />Edit</Button>
                            <Button onClick={()=> setConfirmDelete({ open: true, row: r })} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm"><FontAwesomeIcon icon={faTrash} className="mr-1" />Delete</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

  <Modal isOpen={showForm} onClose={()=> { setShowForm(false); setEditing(null); }} title={editing ? 'Edit Block' : 'New Block'}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timetable_user_id">User</Label>
              <select
                id="timetable_user_id"
                name="timetable_user_id"
                value={formData.timetable_user_id}
                onChange={(e)=> setFormData(prev=>({ ...prev, timetable_user_id: e.target.value, subject_id: '', timetable_detail_kelas_id: '' }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.user ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Select User</option>
                {users.map(u => <option key={u.user_id} value={u.user_id}>{u.user_nama_depan} {u.user_nama_belakang}</option>)}
              </select>
              {formErrors.user && <p className="text-red-500 text-sm mt-1">{formErrors.user}</p>}
            </div>
            <div>
              <Label htmlFor="subject_id">Subject</Label>
              <select
                id="subject_id"
                name="subject_id"
                value={formData.subject_id}
                onChange={(e)=> setFormData(prev=>({ ...prev, subject_id: e.target.value, timetable_detail_kelas_id: '' }))}
                disabled={!formData.timetable_user_id}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.subject ? 'border-red-500' : 'border-gray-300'} ${!formData.timetable_user_id ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">{formData.timetable_user_id ? 'Select Subject' : 'Select User first'}</option>
                {subjects.filter(s => String(s.subject_user_id) === formData.timetable_user_id && detailKelas.some(d => d.detail_kelas_subject_id === s.subject_id)).map(s => (
                  <option key={s.subject_id} value={s.subject_id}>{s.subject_code || s.subject_name}</option>
                ))}
              </select>
              {formErrors.subject && <p className="text-red-500 text-sm mt-1">{formErrors.subject}</p>}
            </div>
            <div>
              <Label htmlFor="timetable_detail_kelas_id">Class</Label>
              <select
                id="timetable_detail_kelas_id"
                name="timetable_detail_kelas_id"
                value={formData.timetable_detail_kelas_id}
                onChange={(e)=> setFormData(prev=>({...prev, timetable_detail_kelas_id: e.target.value}))}
                disabled={!formData.subject_id}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.detail_kelas ? 'border-red-500' : 'border-gray-300'} ${!formData.subject_id ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">{formData.subject_id ? 'Select Class' : (formData.timetable_user_id ? 'Select Subject first' : 'Select User first')}</option>
                {detailKelas.filter(d=> String(d.detail_kelas_subject_id) === formData.subject_id).map(d => (
                  <option key={d.detail_kelas_id} value={d.detail_kelas_id}>{d.kelas_nama}</option>
                ))}
              </select>
              {formErrors.detail_kelas && <p className="text-red-500 text-sm mt-1">{formErrors.detail_kelas}</p>}
            </div>
            <div>
              <Label htmlFor="timetable_day">Day</Label>
              <select
                id="timetable_day"
                name="timetable_day"
                value={formData.timetable_day}
                onChange={(e)=> setFormData(prev=>({...prev, timetable_day: e.target.value}))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.day ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Select Day</option>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {formErrors.day && <p className="text-red-500 text-sm mt-1">{formErrors.day}</p>}
            </div>
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input type="time" id="startTime" value={formData.startTime} onChange={(e)=> setFormData(prev=>({...prev, startTime: e.target.value}))} className={formErrors.startTime ? 'border-red-500' : ''} />
              {formErrors.startTime && <p className="text-red-500 text-sm mt-1">{formErrors.startTime}</p>}
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input type="time" id="endTime" value={formData.endTime} onChange={(e)=> setFormData(prev=>({...prev, endTime: e.target.value}))} className={formErrors.endTime ? 'border-red-500' : ''} />
              {formErrors.endTime && <p className="text-red-500 text-sm mt-1">{formErrors.endTime}</p>}
            </div>
          </div>
          {formErrors.overlap && <div className="text-red-600 text-sm">{formErrors.overlap}</div>}
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" onClick={()=> { setShowForm(false); setEditing(null); }} className="bg-gray-500 hover:bg-gray-600 text-white">Cancel</Button>
            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {submitting ? (<><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Saving...</>) : (editing ? 'Save' : 'Create')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={confirmDelete.open} onClose={()=> setConfirmDelete({ open: false, row: null })} title="Confirm Delete">
        <div className="space-y-4">
          <p className="text-gray-700">Delete schedule block?</p>
          <div className="flex justify-end space-x-3 pt-2">
            <Button onClick={()=> setConfirmDelete({ open: false, row: null })} className="bg-gray-500 hover:bg-gray-600 text-white">Cancel</Button>
            <Button onClick={onDelete} disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">{submitting ? (<><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Deleting...</>) : 'Yes, Delete'}</Button>
          </div>
        </div>
      </Modal>

      <NotificationModal isOpen={notification.isOpen} onClose={()=> setNotification(prev => ({ ...prev, isOpen: false }))} title={notification.title} message={notification.message} type={notification.type} />
    </div>
  );
}
