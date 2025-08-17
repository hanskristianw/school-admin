"use client";

import { useEffect, useState, useMemo } from 'react';
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

const DAYS = [ 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday' ];

const dayOrderMap = DAYS.reduce((acc, d, i) => { acc[d] = i; return acc; }, {});

export default function DoorGreeterPage() {
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // row object
  const [formData, setFormData] = useState({ daftar_door_greeter_user_id: '', daftar_door_greeter_day: '' });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, row: null });

  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const showNotification = (title, message, type='success') => setNotification({ isOpen: true, title, message, type });

  // Filters
  const [filters, setFilters] = useState({ day: '', search: '' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true); setError('');
      const [dgRes, usersRes, rolesRes] = await Promise.all([
        supabase
          .from('daftar_door_greeter')
          .select('daftar_door_greeter_id, daftar_door_greeter_user_id, daftar_door_greeter_day')
          .order('daftar_door_greeter_day'),
        supabase
          .from('users')
          .select('user_id, user_nama_depan, user_nama_belakang, user_role_id')
          .eq('is_active', true)
          .order('user_nama_depan'),
        supabase
          .from('role')
          .select('role_id, is_teacher')
      ]);
      if (dgRes.error) throw new Error(dgRes.error.message);
      if (usersRes.error) throw new Error(usersRes.error.message);
      if (rolesRes.error) throw new Error(rolesRes.error.message);
      const teacherRoleIds = new Set((rolesRes.data || []).filter(r => r.is_teacher).map(r => r.role_id));
      const teacherUsers = (usersRes.data || []).filter(u => teacherRoleIds.has(u.user_role_id));
  const sorted = (dgRes.data || []).slice().sort((a,b)=> (dayOrderMap[a.daftar_door_greeter_day] ?? 99) - (dayOrderMap[b.daftar_door_greeter_day] ?? 99));
  setRows(sorted);
      setUsers(teacherUsers);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const userMap = useMemo(() => new Map(users.map(u => [u.user_id, `${u.user_nama_depan} ${u.user_nama_belakang}`.trim()])), [users]);

  const filtered = useMemo(() => rows.filter(r => (
    (!filters.day || r.daftar_door_greeter_day === filters.day) &&
    (!filters.search || (userMap.get(r.daftar_door_greeter_user_id) || '').toLowerCase().includes(filters.search.toLowerCase()))
  )), [rows, filters, userMap]);

  const openCreate = () => { setEditing(null); setFormData({ daftar_door_greeter_user_id: '', daftar_door_greeter_day: '' }); setFormErrors({}); setShowForm(true); };
  const openEdit = (row) => { setEditing(row); setFormData({ daftar_door_greeter_user_id: String(row.daftar_door_greeter_user_id), daftar_door_greeter_day: row.daftar_door_greeter_day }); setFormErrors({}); setShowForm(true); };

  const validate = () => {
    const e = {};
    if (!formData.daftar_door_greeter_user_id) e.user = t('doorGreeter.validation.userRequired');
    if (!formData.daftar_door_greeter_day) e.day = t('doorGreeter.validation.dayRequired');
    if (formData.daftar_door_greeter_day) {
      const exists = rows.find(r => r.daftar_door_greeter_day === formData.daftar_door_greeter_day && (!editing || r.daftar_door_greeter_id !== editing.daftar_door_greeter_id));
      if (exists) e.day = t('doorGreeter.validation.dayDuplicate');
    }
    setFormErrors(e); return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault(); if (!validate()) return; try {
      setSubmitting(true);
      const payload = {
        daftar_door_greeter_user_id: parseInt(formData.daftar_door_greeter_user_id),
        daftar_door_greeter_day: formData.daftar_door_greeter_day
      };
      if (editing) {
        const { data, error } = await supabase
          .from('daftar_door_greeter')
          .update(payload)
          .eq('daftar_door_greeter_id', editing.daftar_door_greeter_id)
          .select();
        if (error) throw new Error(error.message);
        if (data && data[0]) setRows(prev => {
          const next = prev.map(r => r.daftar_door_greeter_id === editing.daftar_door_greeter_id ? data[0] : r);
          return next.slice().sort((a,b)=> (dayOrderMap[a.daftar_door_greeter_day] ?? 99) - (dayOrderMap[b.daftar_door_greeter_day] ?? 99));
        });
  showNotification(t('doorGreeter.notifSuccessTitle'), t('doorGreeter.notifUpdated'), 'success');
      } else {
        const { data, error } = await supabase
          .from('daftar_door_greeter')
          .insert([payload])
          .select();
        if (error) throw new Error(error.message);
        if (data && data[0]) setRows(prev => {
          const next = [data[0], ...prev];
          return next.slice().sort((a,b)=> (dayOrderMap[a.daftar_door_greeter_day] ?? 99) - (dayOrderMap[b.daftar_door_greeter_day] ?? 99));
        });
        showNotification(t('doorGreeter.notifSuccessTitle'), t('doorGreeter.notifCreated'), 'success');
      }
      setShowForm(false);
    } catch (e) {
      console.error(e); showNotification(t('doorGreeter.notifErrorTitle'), t('doorGreeter.notifErrorGeneric') + e.message, 'error');
    } finally { setSubmitting(false); }
  };

  const onDelete = async () => {
    if (!confirmDelete.row) return; try {
      setSubmitting(true);
      const { error } = await supabase
        .from('daftar_door_greeter')
        .delete()
        .eq('daftar_door_greeter_id', confirmDelete.row.daftar_door_greeter_id);
      if (error) throw new Error(error.message);
      setRows(prev => prev.filter(r => r.daftar_door_greeter_id !== confirmDelete.row.daftar_door_greeter_id));
      showNotification(t('doorGreeter.notifSuccessTitle'), t('doorGreeter.notifDeleted'), 'success');
      setConfirmDelete({ open: false, row: null });
    } catch (e) { console.error(e); showNotification(t('doorGreeter.notifErrorTitle'), t('doorGreeter.notifErrorGeneric') + e.message, 'error'); } finally { setSubmitting(false); }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('doorGreeter.title')}</h1>
          <p className="text-gray-600">{t('doorGreeter.subtitle')}</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white"><FontAwesomeIcon icon={faPlus} className="mr-2" />{t('doorGreeter.newButton')}</Button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

      <Card>
        <CardHeader><CardTitle>{t('doorGreeter.filtersTitle')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="block text-sm font-medium mb-1">{t('doorGreeter.day')}</Label>
              <select value={filters.day} onChange={(e)=> setFilters(prev=>({...prev, day: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('doorGreeter.allDays')}</option>
                {DAYS.map(d => <option key={d} value={d}>{t(`doorGreeter.days.${d}`)}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label className="block text-sm font-medium mb-1">{t('doorGreeter.searchUser')}</Label>
              <Input value={filters.search} onChange={(e)=> setFilters(prev=>({...prev, search: e.target.value}))} placeholder={t('doorGreeter.searchPlaceholder')} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('doorGreeter.assignmentsTitle')}</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t('doorGreeter.empty')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('doorGreeter.thDay')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('doorGreeter.thUser')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('doorGreeter.thActions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map(r => (
                    <tr key={r.daftar_door_greeter_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t(`doorGreeter.days.${r.daftar_door_greeter_day}`)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userMap.get(r.daftar_door_greeter_user_id) || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button onClick={()=> openEdit(r)} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 text-sm"><FontAwesomeIcon icon={faEdit} className="mr-1" />{t('doorGreeter.edit')}</Button>
                          <Button onClick={()=> setConfirmDelete({ open: true, row: r })} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm"><FontAwesomeIcon icon={faTrash} className="mr-1" />{t('doorGreeter.delete')}</Button>
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

      <Modal isOpen={showForm} onClose={()=> { setShowForm(false); setEditing(null); }} title={editing ? t('doorGreeter.modalEditTitle') : t('doorGreeter.modalCreateTitle')}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="daftar_door_greeter_day">{t('doorGreeter.day')}</Label>
            <select
              id="daftar_door_greeter_day"
              name="daftar_door_greeter_day"
              value={formData.daftar_door_greeter_day}
              onChange={(e)=> setFormData(prev=>({...prev, daftar_door_greeter_day: e.target.value}))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.day ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">{t('doorGreeter.selectDay')}</option>
              {DAYS.map(d => <option key={d} value={d}>{t(`doorGreeter.days.${d}`)}</option>)}
            </select>
            {formErrors.day && <p className="text-red-500 text-sm mt-1">{formErrors.day}</p>}
          </div>
          <div>
            <Label htmlFor="daftar_door_greeter_user_id">{t('doorGreeter.user')}</Label>
            <select
              id="daftar_door_greeter_user_id"
              name="daftar_door_greeter_user_id"
              value={formData.daftar_door_greeter_user_id}
              onChange={(e)=> setFormData(prev=>({...prev, daftar_door_greeter_user_id: e.target.value}))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.user ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">{t('doorGreeter.selectUser')}</option>
              {users.map(u => <option key={u.user_id} value={u.user_id}>{u.user_nama_depan} {u.user_nama_belakang}</option>)}
            </select>
            {formErrors.user && <p className="text-red-500 text-sm mt-1">{formErrors.user}</p>}
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" onClick={()=> { setShowForm(false); setEditing(null); }} className="bg-gray-500 hover:bg-gray-600 text-white">{t('doorGreeter.cancel')}</Button>
            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {submitting ? (<><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />{t('doorGreeter.saving')}</>) : (editing ? t('doorGreeter.save') : t('doorGreeter.create'))}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={confirmDelete.open} onClose={()=> setConfirmDelete({ open: false, row: null })} title={t('doorGreeter.confirmDeleteTitle')}>
        <div className="space-y-4">
          <p className="text-gray-700">{t('doorGreeter.confirmDeleteQuestion', { day: t(`doorGreeter.days.${confirmDelete.row?.daftar_door_greeter_day}`), user: userMap.get(confirmDelete.row?.daftar_door_greeter_user_id) || '' })}</p>
          <div className="flex justify-end space-x-3 pt-2">
            <Button onClick={()=> setConfirmDelete({ open: false, row: null })} className="bg-gray-500 hover:bg-gray-600 text-white">{t('doorGreeter.cancel')}</Button>
            <Button onClick={onDelete} disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">{submitting ? (<><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />{t('doorGreeter.deleting')}</>) : t('doorGreeter.yesDelete')}</Button>
          </div>
        </div>
      </Modal>

      <NotificationModal isOpen={notification.isOpen} onClose={()=> setNotification(prev => ({ ...prev, isOpen: false }))} title={notification.title} message={notification.message} type={notification.type} />
    </div>
  );
}
