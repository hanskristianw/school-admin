'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Modal from '@/components/ui/modal';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';

const CRITERIA = ['A', 'B', 'C', 'D'];
const BANDS = [
  { label: '1-2', min: 1, max: 2 },
  { label: '3-4', min: 3, max: 4 },
  { label: '5-6', min: 5, max: 6 },
  { label: '7-8', min: 7, max: 8 },
];
const MYP_YEARS = [1, 2, 3, 4, 5];
const SEMESTERS = [
  { value: 0, label: 'S1 & S2 (Shared)' },
  { value: 1, label: 'Semester 1 Only' },
  { value: 2, label: 'Semester 2 Only' },
];

export default function SubjectGroupPage() {
  // Subject Groups
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);

  // Descriptor editor
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedYear, setSelectedYear] = useState(1);
  const [selectedSemester, setSelectedSemester] = useState(0);
  const [descriptors, setDescriptors] = useState({}); // key: "A_1", value: { id, text, dirty }
  const [loadingDesc, setLoadingDesc] = useState(false);
  const [savingDesc, setSavingDesc] = useState(false);

  // Notification
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  useEffect(() => { fetchGroups(); }, []);
  useEffect(() => {
    if (selectedGroupId && selectedYear !== undefined) fetchDescriptors(selectedGroupId, selectedYear, selectedSemester);
  }, [selectedGroupId, selectedYear, selectedSemester]);

  const showNotification = (title, message, type = 'success') => setNotification({ isOpen: true, title, message, type });
  const closeNotification = () => setNotification(p => ({ ...p, isOpen: false }));

  const fetchGroups = async () => {
    setLoadingGroups(true);
    const { data } = await supabase.from('subject_group').select('id, name').order('name');
    setGroups(data || []);
    setLoadingGroups(false);
  };

  const fetchDescriptors = async (groupId, year, sem) => {
    setLoadingDesc(true);
    const { data } = await supabase
      .from('criterion_descriptors')
      .select('id, criterion, band_min, band_max, descriptor')
      .eq('subject_group_id', groupId)
      .eq('myp_year', year)
      .eq('semester', sem);

    const map = {};
    (data || []).forEach(d => {
      map[`${d.criterion}_${d.band_min}`] = { id: d.id, text: d.descriptor || '', dirty: false };
    });
    // Ensure all cells exist
    CRITERIA.forEach(c => BANDS.forEach(b => {
      const key = `${c}_${b.min}`;
      if (!map[key]) map[key] = { id: null, text: '', dirty: false };
    }));
    setDescriptors(map);
    setLoadingDesc(false);
  };

  const handleGroupSave = async () => {
    if (!groupName.trim()) return;
    setSavingGroup(true);
    try {
      let err;
      if (editingGroup) {
        ({ error: err } = await supabase.from('subject_group').update({ name: groupName.trim() }).eq('id', editingGroup.id));
      } else {
        ({ error: err } = await supabase.from('subject_group').insert([{ name: groupName.trim() }]));
      }
      if (err) throw err;
      await fetchGroups();
      setShowGroupForm(false);
      setEditingGroup(null);
      setGroupName('');
      showNotification('Berhasil!', editingGroup ? 'Group diupdate.' : 'Group baru ditambahkan.');
    } catch (e) {
      showNotification('Error!', e.message, 'error');
    } finally {
      setSavingGroup(false);
    }
  };

  const handleGroupDelete = async (group) => {
    if (!confirm(`Hapus group "${group.name}"? Semua deskriptor terkait akan ikut terhapus.`)) return;
    const { error } = await supabase.from('subject_group').delete().eq('id', group.id);
    if (error) { showNotification('Error!', error.message, 'error'); return; }
    if (selectedGroupId === String(group.id)) { setSelectedGroupId(''); setDescriptors({}); }
    await fetchGroups();
    showNotification('Berhasil!', 'Group dihapus.');
  };

  const handleDescriptorChange = (criterion, bandMin, value) => {
    const key = `${criterion}_${bandMin}`;
    setDescriptors(p => ({ ...p, [key]: { ...p[key], text: value, dirty: true } }));
  };

  const handleSaveAllDescriptors = async () => {
    if (!selectedGroupId || !selectedYear) return;
    setSavingDesc(true);
    try {
      const dirtyEntries = Object.entries(descriptors).filter(([, v]) => v.dirty);
      for (const [key, val] of dirtyEntries) {
        const [criterion, bandMinStr] = key.split('_');
        const bandMin = parseInt(bandMinStr);
        const band = BANDS.find(b => b.min === bandMin);
        const trimmed = val.text.trim();
        let err;
        if (val.id) {
          if (!trimmed) {
            // User cleared an existing descriptor — delete the row
            ({ error: err } = await supabase.from('criterion_descriptors').delete().eq('id', val.id));
            if (!err) {
              setDescriptors(p => ({ ...p, [key]: { text: '', dirty: false, id: null } }));
            }
          } else {
            ({ error: err } = await supabase.from('criterion_descriptors').update({ descriptor: trimmed }).eq('id', val.id));
          }
        } else {
          if (!trimmed) continue; // nothing to insert for an empty new entry
          const payload = {
            subject_group_id: parseInt(selectedGroupId),
            myp_year: selectedYear,
            semester: selectedSemester,
            criterion,
            band_min: bandMin,
            band_max: band.max,
            descriptor: trimmed,
          };
          const { data: inserted, error: insertErr } = await supabase
            .from('criterion_descriptors').insert([payload]).select('id').single();
          err = insertErr;
          if (inserted) {
            setDescriptors(p => ({ ...p, [key]: { ...p[key], id: inserted.id, dirty: false } }));
          }
        }
        if (err) throw err;
      }
      // Mark all clean
      setDescriptors(p => {
        const next = { ...p };
        Object.keys(next).forEach(k => { next[k] = { ...next[k], dirty: false }; });
        return next;
      });
      showNotification('Berhasil!', 'Semua deskriptor disimpan.');
    } catch (e) {
      showNotification('Error!', e.message, 'error');
    } finally {
      setSavingDesc(false);
    }
  };

  const selectedGroupName = groups.find(g => String(g.id) === String(selectedGroupId))?.name || '';
  const hasDirty = Object.values(descriptors).some(v => v.dirty);

  return (
    <div className="p-3 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subject Group & Criterion Descriptors</h1>
      </div>

      {/* ── SUBJECT GROUPS ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Subject Groups</CardTitle>
          <Button onClick={() => { setEditingGroup(null); setGroupName(''); setShowGroupForm(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-sm">
            + Add Group
          </Button>
        </CardHeader>
        <CardContent>
          {loadingGroups ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada subject group.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {groups.map(g => (
                <div key={g.id}
                  className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${String(selectedGroupId) === String(g.id) ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 hover:border-blue-300'}`}
                  onClick={() => setSelectedGroupId(String(g.id))}
                >
                  <span className="font-medium">{g.name}</span>
                  <button onClick={e => { e.stopPropagation(); setEditingGroup(g); setGroupName(g.name); setShowGroupForm(true); }}
                    className="text-gray-400 hover:text-blue-500 text-xs">✏️</button>
                  <button onClick={e => { e.stopPropagation(); handleGroupDelete(g); }}
                    className="text-gray-400 hover:text-red-500 text-xs">🗑️</button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── DESCRIPTOR EDITOR ── */}
      {selectedGroupId && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Criterion Descriptors</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">Group: <span className="font-medium text-blue-600">{selectedGroupName}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-500 mr-1">MYP Year:</Label>
                <div className="flex gap-1">
                  {MYP_YEARS.map(yr => (
                    <button key={yr}
                      onClick={() => setSelectedYear(yr)}
                      className={`w-8 h-8 rounded text-sm font-medium transition-colors ${selectedYear === yr ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-100'}`}
                    >{yr}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-500 mr-1">Semester:</Label>
                <div className="flex gap-1">
                  {SEMESTERS.map(s => (
                    <button key={s.value}
                      onClick={() => setSelectedSemester(s.value)}
                      className={`px-3 h-8 rounded text-xs font-medium transition-colors ${
                        selectedSemester === s.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-indigo-100'
                      }`}
                    >{s.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedSemester !== 0 && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <strong>ℹ️ Catatan:</strong> Anda sedang mengedit descriptor khusus <strong>{selectedSemester === 1 ? 'Semester 1' : 'Semester 2'}</strong>.
                Descriptor ini akan menggantikan versi <em>S1 &amp; S2 (Shared)</em> saat report semester ini digenerate.
                Jika kolom dibiarkan kosong, sistem akan otomatis menggunakan descriptor <em>Shared</em> sebagai fallback.
              </div>
            )}
            {selectedSemester === 0 && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                <strong>ℹ️ Mode Shared:</strong> Descriptor di sini berlaku untuk S1 maupun S2.
                Jika ada descriptor khusus di tab <em>Semester 1 Only</em> atau <em>Semester 2 Only</em>, descriptor tersebut yang akan digunakan (Shared sebagai fallback).
              </div>
            )}
            {loadingDesc ? (
              <p className="text-sm text-gray-400 py-4 text-center">Memuat deskriptor...</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-3 py-2 text-left w-20 font-semibold text-gray-600">Criterion</th>
                        {BANDS.map(b => (
                          <th key={b.label} className="border border-gray-200 px-3 py-2 text-center font-semibold text-gray-600 min-w-[200px]">
                            Band {b.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {CRITERIA.map(c => (
                        <tr key={c} className="align-top">
                          <td className="border border-gray-200 px-3 py-2 font-bold text-blue-700 bg-blue-50 text-center">
                            {c}
                          </td>
                          {BANDS.map(b => {
                            const key = `${c}_${b.min}`;
                            const cell = descriptors[key] || { text: '', dirty: false };
                            return (
                              <td key={b.label} className={`border border-gray-200 p-1.5 ${cell.dirty ? 'bg-yellow-50' : ''}`}>
                                <textarea
                                  value={cell.text}
                                  onChange={e => handleDescriptorChange(c, b.min, e.target.value)}
                                  rows={5}
                                  placeholder={`Descriptor for Criterion ${c}, band ${b.label}...`}
                                  className="w-full text-xs border-0 bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 rounded p-1 leading-relaxed"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center mt-3">
                  {hasDirty ? (
                    <p className="text-xs text-yellow-600">⚠ Ada perubahan yang belum disimpan</p>
                  ) : (
                    <p className="text-xs text-gray-400">Semua tersimpan</p>
                  )}
                  <Button
                    onClick={handleSaveAllDescriptors}
                    disabled={savingDesc || !hasDirty}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {savingDesc ? 'Menyimpan...' : 'Simpan Semua'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Group Form Modal */}
      <Modal
        isOpen={showGroupForm}
        onClose={() => { setShowGroupForm(false); setEditingGroup(null); setGroupName(''); }}
        title={editingGroup ? 'Edit Subject Group' : 'Add Subject Group'}
        size="sm"
      >
        <div className="space-y-3">
          <div>
            <Label>Nama Group</Label>
            <Input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Contoh: Design, Language & Literature, Mathematics"
              className="mt-1"
              onKeyDown={e => e.key === 'Enter' && handleGroupSave()}
              autoFocus
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleGroupSave} disabled={savingGroup || !groupName.trim()} className="bg-green-600 hover:bg-green-700 flex-1">
              {savingGroup ? 'Menyimpan...' : (editingGroup ? 'Update' : 'Simpan')}
            </Button>
            <Button variant="outline" onClick={() => { setShowGroupForm(false); setEditingGroup(null); setGroupName(''); }} className="flex-1">
              Batal
            </Button>
          </div>
        </div>
      </Modal>

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={closeNotification}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}
