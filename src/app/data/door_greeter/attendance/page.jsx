"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NotificationModal from "@/components/ui/notification-modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDay, faRotate, faCheck, faUndo, faSpinner, faList } from "@fortawesome/free-solid-svg-icons";
import { faThumbtack, faArrowDownLong } from "@fortawesome/free-solid-svg-icons";

// Attendance page initial implementation.
// Flow: Select Academic Year -> load students (detail_siswa joined via kelas_year_id) -> pick date -> mark attendance.
// Stored key is detail_siswa_id per requirement.

export default function AttendancePage() {
  const { t } = useI18n();

  const [years, setYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [students, setStudents] = useState([]); // { detail_siswa_id, user_id, nama, kelas_id, kelas_nama }
  const [classesForYear, setClassesForYear] = useState([]); // {kelas_id, kelas_nama}
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0,10));
  const [attendanceMap, setAttendanceMap] = useState(new Map()); // detail_siswa_id -> { absen_id, absen_time }

  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [savingIds, setSavingIds] = useState(new Set());
  const [filterClass, setFilterClass] = useState("");
  const [search, setSearch] = useState("");
  const [showOnlyAbsent, setShowOnlyAbsent] = useState(false);
  const [pinFilters, setPinFilters] = useState(true); // default pinned

  const [notification, setNotification] = useState({ isOpen: false, title: "", message: "", type: "success" });
  const showNotification = (title, message, type="success") => setNotification({ isOpen: true, title, message, type });

  useEffect(() => { loadYears(); }, []);
  useEffect(() => { if (selectedYearId) loadStudentsAndClasses(); }, [selectedYearId]);
  useEffect(() => { if (selectedYearId && students.length > 0) loadAttendance(); else setAttendanceMap(new Map()); }, [selectedDate, students, selectedYearId]);

  const loadYears = async () => {
    try {
      setLoadingYears(true);
      const { data, error } = await supabase.from('year').select('year_id, year_name').order('year_name');
      if (error) throw new Error(error.message);
      setYears(data || []);
    } catch (e) {
      console.error(e);
      showNotification(t('attendance.errorTitle') || 'Error', (t('attendance.errorLoadYears') || 'Failed to load academic years: ') + e.message, 'error');
    } finally { setLoadingYears(false); }
  };

  const loadStudentsAndClasses = async () => {
    try {
      setLoadingStudents(true);
      setStudents([]); setClassesForYear([]); setAttendanceMap(new Map());
      const { data: kelasData, error: kelasErr } = await supabase
        .from('kelas')
        .select('kelas_id, kelas_nama')
        .eq('kelas_year_id', selectedYearId)
        .order('kelas_nama');
      if (kelasErr) throw new Error(kelasErr.message);
      const kelasIds = (kelasData || []).map(k => k.kelas_id);

      if (kelasIds.length === 0) { setClassesForYear([]); setStudents([]); return; }

      const { data: detailData, error: detailErr } = await supabase
        .from('detail_siswa')
        .select('detail_siswa_id, detail_siswa_user_id, detail_siswa_kelas_id')
        .in('detail_siswa_kelas_id', kelasIds);
      if (detailErr) throw new Error(detailErr.message);
      const userIds = Array.from(new Set((detailData || []).map(d => d.detail_siswa_user_id)));

      let usersMap = new Map();
      if (userIds.length > 0) {
        const { data: usersData, error: usersErr } = await supabase
          .from('users')
          .select('user_id, user_nama_depan, user_nama_belakang')
          .in('user_id', userIds);
        if (usersErr) throw new Error(usersErr.message);
        usersData?.forEach(u => { usersMap.set(u.user_id, `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim()); });
      }

      const kelasMap = new Map((kelasData || []).map(k => [k.kelas_id, k.kelas_nama]));
      const combined = (detailData || []).map(d => ({
        detail_siswa_id: d.detail_siswa_id,
        user_id: d.detail_siswa_user_id,
        nama: usersMap.get(d.detail_siswa_user_id) || `User ${d.detail_siswa_user_id}`,
        kelas_id: d.detail_siswa_kelas_id,
        kelas_nama: kelasMap.get(d.detail_siswa_kelas_id) || ''
      })).sort((a,b) => a.kelas_nama.localeCompare(b.kelas_nama) || a.nama.localeCompare(b.nama));

      setClassesForYear(kelasData || []);
      setStudents(combined);
    } catch (e) {
      console.error(e);
      showNotification(t('attendance.errorTitle') || 'Error', (t('attendance.errorLoadStudents') || 'Failed to load students: ') + e.message, 'error');
    } finally { setLoadingStudents(false); }
  };

  const loadAttendance = async () => {
    try {
      setLoadingAttendance(true);
      const detailIds = students.map(s => s.detail_siswa_id);
      if (detailIds.length === 0) { setAttendanceMap(new Map()); return; }
      const { data, error } = await supabase
        .from('absen')
        .select('absen_id, absen_detail_siswa_id, absen_time')
        .eq('absen_date', selectedDate)
        .in('absen_detail_siswa_id', detailIds);
      if (error) throw new Error(error.message);
      const map = new Map();
      (data || []).forEach(r => map.set(r.absen_detail_siswa_id, { absen_id: r.absen_id, absen_time: r.absen_time }));
      setAttendanceMap(map);
    } catch (e) {
      console.error(e);
      showNotification(t('attendance.errorTitle') || 'Error', (t('attendance.errorLoadAttendance') || 'Failed to load attendance: ') + e.message, 'error');
    } finally { setLoadingAttendance(false); }
  };

  const markPresent = async (detailId) => {
    if (attendanceMap.has(detailId)) return;
    setSavingIds(prev => new Set([...prev, detailId]));
    try {
      const now = new Date();
      const timeStr = now.toTimeString().slice(0,8);
      const payload = { absen_detail_siswa_id: detailId, absen_date: selectedDate, absen_time: timeStr };
      const { data, error } = await supabase.from('absen').insert([payload]).select();
      if (error) {
        const msg = error.message || '';
        if (/duplicate/i.test(msg)) {
          showNotification(t('attendance.infoTitle') || 'Info', t('attendance.alreadyMarked') || 'Already marked present.', 'success');
        } else throw new Error(msg);
      } else if (data && data[0]) {
        setAttendanceMap(prev => { const next = new Map(prev); next.set(detailId, { absen_id: data[0].absen_id, absen_time: data[0].absen_time }); return next; });
      }
    } catch (e) {
      console.error(e);
      showNotification(t('attendance.errorTitle') || 'Error', (t('attendance.errorMark') || 'Failed to mark attendance: ') + e.message, 'error');
    } finally {
      setSavingIds(prev => { const n = new Set(prev); n.delete(detailId); return n; });
    }
  };

  const undoAttendance = async (detailId) => {
    const rec = attendanceMap.get(detailId);
    if (!rec) return;
    setSavingIds(prev => new Set([...prev, detailId]));
    try {
      const { error } = await supabase.from('absen').delete().eq('absen_id', rec.absen_id);
      if (error) throw new Error(error.message);
      setAttendanceMap(prev => { const n = new Map(prev); n.delete(detailId); return n; });
    } catch (e) {
      console.error(e);
      showNotification(t('attendance.errorTitle') || 'Error', (t('attendance.errorUndo') || 'Failed to undo: ') + e.message, 'error');
    } finally {
      setSavingIds(prev => { const n = new Set(prev); n.delete(detailId); return n; });
    }
  };

  const filteredStudents = useMemo(() => students.filter(s => {
    if (filterClass && String(s.kelas_id) !== String(filterClass)) return false;
    if (search && !s.nama.toLowerCase().includes(search.toLowerCase())) return false;
    if (showOnlyAbsent && attendanceMap.has(s.detail_siswa_id)) return false;
    return true;
  }), [students, filterClass, search, showOnlyAbsent, attendanceMap]);

  const totalPresent = attendanceMap.size;
  const totalStudents = students.length;

  return (
  <div className="space-y-6 pb-8">
      <div>
  <h1 className="text-2xl font-bold text-gray-900">{t('attendance.title')}</h1>
  <p className="text-gray-600 text-sm">{t('attendance.subtitle')}</p>
      </div>

      {/* Year & Date Selection (non-sticky) */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800">{t('attendance.yearSelection')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingYears ? (
            <div className="py-3 text-gray-500 text-sm flex items-center"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />{t('common.loading')}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <Label className="block mb-1 text-xs font-medium uppercase tracking-wide text-gray-600">{t('attendance.selectYear')}</Label>
                <select
                  value={selectedYearId}
                  onChange={e => setSelectedYearId(e.target.value)}
                  className="w-full px-3 h-10 border rounded-md text-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">{t('attendance.placeholderYear')}</option>
                  {years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <Label className="block mb-1 text-xs font-medium uppercase tracking-wide text-gray-600">{t('attendance.date')}</Label>
                <div className="flex items-center gap-2">
                  <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="text-sm h-10" />
                  <Button type="button" onClick={() => setSelectedDate(new Date().toISOString().slice(0,10))} className="bg-gray-500 hover:bg-gray-600 text-white text-xs h-10 px-3 whitespace-nowrap"><FontAwesomeIcon icon={faCalendarDay} className="mr-1" />{t('attendance.today')}</Button>
                </div>
              </div>
              {selectedYearId && (
                <div className="flex flex-row sm:flex-row lg:flex-col gap-2 lg:items-start items-stretch lg:justify-start justify-end lg:col-span-2">
                  <Button
                    type="button"
                    onClick={loadStudentsAndClasses}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-10 px-3 flex-1 flex items-center justify-center"
                  >
                    <FontAwesomeIcon icon={faRotate} className="mr-1" />{t('attendance.reloadStudents')}
                  </Button>
                  <Button
                    type="button"
                    onClick={loadAttendance}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-10 px-3 flex-1 flex items-center justify-center"
                  >
                    <FontAwesomeIcon icon={faRotate} className="mr-1" />{t('attendance.reloadAttendance')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters & Summary (pin/unpin) */}
      {selectedYearId && (
        <div className={pinFilters ? "sticky top-0 z-30 mt-4" : "mt-4"}>
          <Card className={pinFilters ? "backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-sm border border-gray-200" : "shadow-sm border border-gray-200"}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  {t('attendance.filters')}
                  <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {totalPresent}/{totalStudents} {t('attendance.present')}
                  </span>
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPinFilters(p => !p)}
                  className="h-8 px-3 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  <FontAwesomeIcon icon={pinFilters ? faThumbtack : faArrowDownLong} className="mr-1" />
                  {pinFilters ? t('attendance.unpinFilters') : t('attendance.pinFilters')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="block mb-1 text-xs font-medium uppercase tracking-wide text-gray-600">{t('attendance.filterClass')}</Label>
                  <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="w-full px-3 h-10 border rounded-md text-sm border-gray-300 bg-white">
                    <option value="">{t('attendance.allClasses')}</option>
                    {classesForYear.map(k => <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label className="block mb-1 text-xs font-medium uppercase tracking-wide text-gray-600">{t('attendance.searchStudent')}</Label>
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('attendance.searchPlaceholder')} className="h-10" />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="inline-flex items-center space-x-2 text-xs cursor-pointer select-none">
                    <input type="checkbox" className="h-4 w-4" checked={showOnlyAbsent} onChange={e => setShowOnlyAbsent(e.target.checked)} />
                    <span>{t('attendance.onlyAbsent')}</span>
                  </label>
                  <div className="mt-2 text-[11px] text-gray-600">{t('attendance.summary')}: {totalPresent}/{totalStudents} {t('attendance.present')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedYearId && (
        <Card>
          <CardHeader><CardTitle>{t('attendance.studentList')}</CardTitle></CardHeader>
          <CardContent>
            {loadingStudents ? (
              <div className="py-6 text-sm text-gray-500 flex items-center"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />{t('common.loading')}</div>
            ) : students.length === 0 ? (
              <div className="py-6 text-center text-gray-500 text-sm">{t('attendance.emptyStudents')}</div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="overflow-x-auto hidden md:block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><FontAwesomeIcon icon={faList} className="mr-1" />{t('attendance.thClass')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendance.thName')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendance.thStatus')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendance.thActions')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredStudents.map(s => {
                        const present = attendanceMap.has(s.detail_siswa_id);
                        const rec = attendanceMap.get(s.detail_siswa_id);
                        return (
                          <tr key={s.detail_siswa_id} className={present ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800 font-medium">{s.kelas_nama}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">{s.nama}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {present ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                                  {t('attendance.present')}{rec?.absen_time ? ` (${String(rec.absen_time).slice(0,5)})` : ''}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-600 text-xs font-semibold">{t('attendance.absent')}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              <div className="flex gap-2">
                                {!present && (
                                  <Button
                                    type="button"
                                    disabled={savingIds.has(s.detail_siswa_id) || loadingAttendance}
                                    onClick={() => markPresent(s.detail_siswa_id)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
                                  >
                                    {savingIds.has(s.detail_siswa_id) ? <FontAwesomeIcon icon={faSpinner} spin className="mr-1" /> : <FontAwesomeIcon icon={faCheck} className="mr-1" />}
                                    {t('attendance.mark')}
                                  </Button>
                                )}
                                {present && (
                                  <Button
                                    type="button"
                                    disabled={savingIds.has(s.detail_siswa_id)}
                                    onClick={() => undoAttendance(s.detail_siswa_id)}
                                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 py-1"
                                  >
                                    {savingIds.has(s.detail_siswa_id) ? <FontAwesomeIcon icon={faSpinner} spin className="mr-1" /> : <FontAwesomeIcon icon={faUndo} className="mr-1" />}
                                    {t('attendance.undo')}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {filteredStudents.map(s => {
                    const present = attendanceMap.has(s.detail_siswa_id);
                    const rec = attendanceMap.get(s.detail_siswa_id);
                    return (
                      <div key={s.detail_siswa_id} className={`border rounded-md p-3 shadow-sm ${present ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-800 truncate max-w-[60%]">{s.nama}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">{s.kelas_nama}</span>
                            </div>
                            <div className="mt-1">
                              {present ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-semibold">
                                  {t('attendance.present')}{rec?.absen_time ? ` · ${String(rec.absen_time).slice(0,5)}` : ''}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[11px] font-semibold">{t('attendance.absent')}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 ml-3 shrink-0">
                            {!present && (
                              <Button
                                type="button"
                                disabled={savingIds.has(s.detail_siswa_id) || loadingAttendance}
                                onClick={() => markPresent(s.detail_siswa_id)}
                                className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-xs"
                              >
                                {savingIds.has(s.detail_siswa_id) ? <FontAwesomeIcon icon={faSpinner} spin className="mr-1" /> : <FontAwesomeIcon icon={faCheck} className="mr-1" />} {t('attendance.mark')}
                              </Button>
                            )}
                            {present && (
                              <Button
                                type="button"
                                disabled={savingIds.has(s.detail_siswa_id)}
                                onClick={() => undoAttendance(s.detail_siswa_id)}
                                className="bg-amber-500 hover:bg-amber-600 text-white h-8 px-3 text-xs"
                              >
                                {savingIds.has(s.detail_siswa_id) ? <FontAwesomeIcon icon={faSpinner} spin className="mr-1" /> : <FontAwesomeIcon icon={faUndo} className="mr-1" />} {t('attendance.undo')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {loadingAttendance && (
                  <div className="py-2 text-xs text-gray-500 flex items-center"><FontAwesomeIcon icon={faSpinner} spin className="mr-1" />{t('attendance.loadingAttendance')}</div>
                )}
                {filteredStudents.length === 0 && !loadingStudents && (
                  <div className="py-6 text-center text-gray-400 text-sm">{t('attendance.noMatch')}</div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <NotificationModal isOpen={notification.isOpen} onClose={() => setNotification(p => ({ ...p, isOpen: false }))} title={notification.title} message={notification.message} type={notification.type} />
    </div>
  );
}
