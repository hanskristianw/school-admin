"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner, faTableCellsLarge, faPrint, faFloppyDisk,
  faPencil, faCheck, faXmark, faBan, faCalendarAlt, faRotateLeft
} from '@fortawesome/free-solid-svg-icons';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_ID = { Monday: 'Senin', Tuesday: 'Selasa', Wednesday: 'Rabu', Thursday: 'Kamis', Friday: 'Jumat' };

// Convert a Date to YYYY-MM-DD
const toISO = (d) => d.toISOString().slice(0, 10);

// Get Monday of the week containing date d
const getMonday = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toISO(d);
};

// Format date range label: "8 - 12 June 2026"
const formatWeekLabel = (mondayStr) => {
  const mon = new Date(mondayStr + 'T00:00:00');
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
  const opts = { day: 'numeric' };
  const monD = mon.toLocaleDateString('en-GB', opts);
  const friD = fri.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${monD} - ${friD}`;
};

// Parse timetable_time range
const parseRange = (pgRange) => {
  if (!pgRange) return { start: '', end: '' };
  const m = pgRange.match(/^[\[(](.*),(.*)[)\]]$/);
  if (!m) return { start: '', end: '' };
  const clean = (raw) => {
    let v = raw.trim().replace(/^"|"$/g, '');
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v)) v += ':00';
    return v;
  };
  return { start: clean(m[1]), end: clean(m[2]) };
};
const extractHM = (ts) => {
  if (!ts) return '';
  const parts = ts.split(' ');
  return parts.length < 2 ? '' : parts[1].slice(0, 5);
};

// Check if two time ranges overlap
const overlaps = (s1, e1, s2, e2) => s1 < e2 && e1 > s2;

export default function WeeklyOverviewPage() {
  const [loading, setLoading] = useState(true);

  // Selectors
  const [kelasList, setKelasList] = useState([]);
  const [yearsList, setYearsList] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');  // YYYY-MM-DD (Monday)
  const [weekInput, setWeekInput] = useState('');

  // Generated overview
  const [overviewCells, setOverviewCells] = useState(null); // null = not generated yet
  const [generating, setGenerating] = useState(false);

  // Edit state
  const [editingCell, setEditingCell] = useState(null); // key string
  const [editValue, setEditValue] = useState({});

  // Save
  const [saving, setSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Notification
  const [toast, setToast] = useState('');
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    (async () => {
      const [kelasRes, yearRes] = await Promise.all([
        supabase.from('kelas').select('kelas_id, kelas_nama, kelas_year_id').order('kelas_nama'),
        supabase.from('year').select('year_id, year_name, start_date, end_date').order('year_name', { ascending: false }),
      ]);
      setKelasList(kelasRes.data || []);
      setYearsList(yearRes.data || []);

      // Auto-select current week's Monday
      const monday = getMonday(toISO(new Date()));
      setSelectedWeek(monday);
      setWeekInput(monday);
      setLoading(false);
    })();
  }, []);

  const selectedKelasObj = useMemo(() => kelasList.find(k => String(k.kelas_id) === String(selectedKelas)), [kelasList, selectedKelas]);

  // ── Generate overview ──────────────────────────────────────────────────────
  const generate = useCallback(async () => {
    if (!selectedKelas || !selectedWeek) return;
    setGenerating(true);
    try {
      const kelasId = parseInt(selectedKelas);
      const monday = selectedWeek; // YYYY-MM-DD

      // 1. Fetch timetable for this kelas
      const { data: ttData } = await supabase
        .from('timetable')
        .select('timetable_id, timetable_detail_kelas_id, timetable_day, timetable_time')
        .order('timetable_time');

      const { data: dkData } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_id, detail_kelas_subject_id, detail_kelas_kelas_id')
        .eq('detail_kelas_kelas_id', kelasId);

      const dkIds = new Set((dkData || []).map(d => d.detail_kelas_id));
      const dkMap = new Map((dkData || []).map(d => [d.detail_kelas_id, d]));

      // Filter timetable slots for this kelas
      const slots = (ttData || []).filter(r => dkIds.has(r.timetable_detail_kelas_id));

      // 2. Fetch subjects
      const subjectIds = [...new Set((dkData || []).map(d => d.detail_kelas_subject_id))];
      const { data: subjData } = subjectIds.length > 0
        ? await supabase.from('subject').select('subject_id, subject_name').in('subject_id', subjectIds)
        : { data: [] };
      const subjMap = new Map((subjData || []).map(s => [s.subject_id, s.subject_name]));

      // 3. Fetch exceptions for this week (Mon–Fri)
      const friday = new Date(monday + 'T00:00:00'); friday.setDate(friday.getDate() + 4);
      const fridayStr = toISO(friday);
      const { data: exData } = await supabase
        .from('timetable_exception')
        .select('*')
        .gte('exception_date', monday)
        .lte('exception_date', fridayStr);

      // Filter exceptions that affect this kelas
      const relevantEx = (exData || []).filter(ex =>
        ex.affects_all_kelas || (ex.affected_kelas_ids && ex.affected_kelas_ids.includes(kelasId))
      );

      // Helper: get date for a given day of week in this week
      const dayDate = (dayName) => {
        const idx = DAYS.indexOf(dayName);
        const d = new Date(monday + 'T00:00:00');
        d.setDate(d.getDate() + idx);
        return toISO(d);
      };

      // 4. Fetch weekly plans for this kelas+week
      // Look up topic_weekly_plan where week_date = monday AND topic.topic_kelas_id = kelasId
      const { data: wpData } = await supabase
        .from('topic_weekly_plan')
        .select(`
          id, topic_id, week_number, week_date,
          week_objectives, week_activities, week_resources,
          topic:topic_id(topic_id, topic_kelas_id, topic_subject_id, topic_nama)
        `)
        .eq('week_date', monday);

      // Filter to this kelas
      const relevantWP = (wpData || []).filter(wp => wp.topic?.topic_kelas_id === kelasId);
      // Map: subject_id -> weekly plan
      const wpBySubject = new Map(relevantWP.map(wp => [wp.topic?.topic_subject_id, wp]));

      // 5. Collect all unique time slots across all days (for row headers)
      const timeSlotSet = new Set();
      slots.forEach(r => {
        const { start, end } = parseRange(r.timetable_time);
        const s = extractHM(start), e = extractHM(end);
        if (s && e) timeSlotSet.add(`${s}|${e}`);
      });
      const timeSlots = [...timeSlotSet].sort((a, b) => a.localeCompare(b));

      // 6. Build cell map
      const cells = {};

      DAYS.forEach(day => {
        const date = dayDate(day);

        // Check for full-day holiday
        const holidayEx = relevantEx.find(ex =>
          ex.exception_date === date && ex.exception_type === 'holiday'
        );

        if (holidayEx) {
          // Mark entire day as holiday — one special cell
          cells[`${day}|HOLIDAY`] = {
            type: 'holiday',
            label: holidayEx.exception_label,
            note: holidayEx.note || '',
          };
          return;
        }

        timeSlots.forEach(slotKey => {
          const [slotStart, slotEnd] = slotKey.split('|');
          const cellKey = `${day}|${slotKey}`;

          // Check if there's a timetable slot for this day+time for this kelas
          const matchSlot = slots.find(r => {
            if (r.timetable_day !== day) return false;
            const { start, end } = parseRange(r.timetable_time);
            return extractHM(start) === slotStart && extractHM(end) === slotEnd;
          });

          if (!matchSlot) {
            cells[cellKey] = { type: 'empty' };
            return;
          }

          // Check for event exception overlapping this time slot
          const eventEx = relevantEx.find(ex =>
            ex.exception_date === date &&
            ex.exception_type === 'event' &&
            ex.start_time && ex.end_time &&
            overlaps(slotStart, slotEnd, ex.start_time.slice(0, 5), ex.end_time.slice(0, 5))
          );

          if (eventEx) {
            cells[cellKey] = {
              type: 'event',
              label: eventEx.exception_label,
              note: eventEx.note || '',
            };
            return;
          }

          // Normal slot — fill with weekly plan data
          const dk = dkMap.get(matchSlot.timetable_detail_kelas_id);
          const subjectId = dk?.detail_kelas_subject_id;
          const subjectName = subjMap.get(subjectId) || '-';
          const wp = subjectId ? wpBySubject.get(subjectId) : null;

          cells[cellKey] = {
            type: 'normal',
            subject: subjectName,
            objectives: wp?.week_objectives || '',
            activities: wp?.week_activities || '',
            resources: wp?.week_resources || '',
          };
        });
      });

      // 7. Check for saved draft
      const { data: draftData } = await supabase
        .from('weekly_overview_draft')
        .select('draft_data')
        .eq('kelas_id', kelasId)
        .eq('week_date', monday)
        .single();

      setOverviewCells({
        monday,
        weekLabel: formatWeekLabel(monday),
        kelasNama: selectedKelasObj?.kelas_nama || '',
        timeSlots,
        cells: draftData ? draftData.draft_data.cells : cells,
        hasDraft: !!draftData,
      });
      setDraftLoaded(!!draftData);
    } catch (e) {
      console.error(e);
      showToast('Error generating overview: ' + e.message);
    } finally { setGenerating(false); }
  }, [selectedKelas, selectedWeek, selectedKelasObj]);

  // ── Edit cell ──────────────────────────────────────────────────────────────
  const startEdit = (key) => {
    const cell = overviewCells.cells[key];
    if (!cell || cell.type !== 'normal') return;
    setEditingCell(key);
    setEditValue({ ...cell });
  };
  const cancelEdit = () => { setEditingCell(null); setEditValue({}); };
  const saveEdit = () => {
    setOverviewCells(prev => ({
      ...prev,
      cells: { ...prev.cells, [editingCell]: { ...prev.cells[editingCell], ...editValue } }
    }));
    setEditingCell(null);
    setEditValue({});
  };
  const resetToGenerated = async () => {
    if (!confirm('Reset semua perubahan ke data otomatis dari timetable & weekly plan?')) return;
    setDraftLoaded(false);
    await generate();
  };

  // ── Save draft ─────────────────────────────────────────────────────────────
  const saveDraft = async () => {
    if (!overviewCells) return;
    setSaving(true);
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const { error } = await supabase.from('weekly_overview_draft').upsert({
        kelas_id: parseInt(selectedKelas),
        week_date: overviewCells.monday,
        draft_data: {
          cells: overviewCells.cells,
          kelasNama: overviewCells.kelasNama,
          weekLabel: overviewCells.weekLabel,
        },
        created_by: userData.user_id || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'kelas_id,week_date' });
      if (error) throw error;
      setDraftLoaded(true);
      showToast('Draft disimpan');
    } catch (e) { showToast('Gagal simpan: ' + e.message); }
    finally { setSaving(false); }
  };

  // ── Print ──────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-gray-400" />
    </div>
  );

  // Compute which days have a full holiday
  const holidayDays = overviewCells
    ? new Set(DAYS.filter(d => overviewCells.cells[`${d}|HOLIDAY`]))
    : new Set();

  return (
    <>
      {/* ── Print styles ──────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #weekly-overview-print, #weekly-overview-print * { visibility: visible; }
          #weekly-overview-print { position: fixed; inset: 0; padding: 20px; }
          .no-print { display: none !important; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000 !important; padding: 6px 8px !important; vertical-align: top; font-size: 10px; }
          th { background: #f0f0f0 !important; font-weight: bold; }
          .holiday-cell { background: #fee2e2 !important; }
          .event-cell { background: #fef3c7 !important; }
        }
      `}</style>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FontAwesomeIcon icon={faTableCellsLarge} className="text-blue-500" />
              Weekly Overview
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Generate jadwal mingguan → edit → cetak PDF
            </p>
          </div>
          {overviewCells && (
            <div className="flex gap-2">
              <button onClick={resetToGenerated}
                className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 text-gray-600">
                <FontAwesomeIcon icon={faRotateLeft} />Reset
              </button>
              <button onClick={saveDraft} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
                {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faFloppyDisk} />}
                {draftLoaded ? 'Update Draft' : 'Save Draft'}
              </button>
              <button onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg">
                <FontAwesomeIcon icon={faPrint} />Print / Export PDF
              </button>
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-lg no-print">
            {toast}
          </div>
        )}

        {/* ── Selector ──────────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 no-print">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Parameter</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kelas</label>
              <select value={selectedKelas} onChange={e => { setSelectedKelas(e.target.value); setOverviewCells(null); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[160px]">
                <option value="">Pilih Kelas</option>
                {kelasList.map(k => <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Minggu (pilih tanggal berapa saja)</label>
              <input type="date" value={weekInput}
                onChange={e => {
                  setWeekInput(e.target.value);
                  if (e.target.value) {
                    const mon = getMonday(e.target.value);
                    setSelectedWeek(mon);
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {selectedWeek && (
                <p className="text-xs text-gray-400 mt-1">→ Senin: {selectedWeek} | Minggu: {formatWeekLabel(selectedWeek)}</p>
              )}
            </div>
            <button
              onClick={generate}
              disabled={!selectedKelas || !selectedWeek || generating}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faTableCellsLarge} />}
              Generate
            </button>
          </div>
          {draftLoaded && (
            <p className="text-xs text-blue-500 mt-3 flex items-center gap-1">
              <FontAwesomeIcon icon={faFloppyDisk} /> Draft tersimpan dimuat. Klik Reset untuk kembali ke data otomatis.
            </p>
          )}
        </div>

        {/* ── Edit Modal ────────────────────────────────────────────────── */}
        {editingCell && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center no-print">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md space-y-4">
              <h3 className="font-semibold text-gray-800">Edit Cell: {editingCell.replace('|', ' — ')}</h3>
              {[
                { key: 'subject', label: 'Subject / Mata Pelajaran' },
                { key: 'objectives', label: 'Learning Goals' },
                { key: 'activities', label: 'Activity' },
                { key: 'resources', label: 'Resource' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <textarea
                    value={editValue[key] || ''}
                    onChange={e => setEditValue(p => ({ ...p, [key]: e.target.value }))}
                    rows={key === 'objectives' || key === 'activities' ? 3 : 2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={cancelEdit} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
                  <FontAwesomeIcon icon={faXmark} className="mr-1" />Batal
                </button>
                <button onClick={saveEdit} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                  <FontAwesomeIcon icon={faCheck} className="mr-1" />Simpan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Overview Table ─────────────────────────────────────────────── */}
        {!overviewCells && !generating && (
          <div className="text-center py-20 text-gray-400">
            <FontAwesomeIcon icon={faTableCellsLarge} className="text-5xl mb-3" />
            <p className="text-lg">Pilih kelas dan minggu, lalu klik Generate</p>
          </div>
        )}

        {overviewCells && (
          <div id="weekly-overview-print" className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* PDF Header */}
            <div className="text-center py-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 tracking-wide">WEEKLY OVERVIEW</h2>
              <p className="text-base font-semibold text-gray-700 mt-1">{overviewCells.kelasNama}</p>
              <p className="text-sm text-gray-500 mt-0.5">{overviewCells.weekLabel}</p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left font-bold text-gray-700 w-20">Time</th>
                    {DAYS.map(day => (
                      <th key={day} className="border border-gray-300 px-3 py-2 text-left font-bold text-gray-700">
                        {day}
                        <span className="block text-[10px] font-normal text-gray-400">
                          {(() => {
                            const idx = DAYS.indexOf(day);
                            const d = new Date(overviewCells.monday + 'T00:00:00');
                            d.setDate(d.getDate() + idx);
                            return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                          })()}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Holiday row spans — check if any day has holiday */}
                  {holidayDays.size > 0 && overviewCells.timeSlots.length > 0 && (() => {
                    // We only need one row to show holidays (spanning all time slots)
                    return null; // handled inline per row below
                  })()}

                  {overviewCells.timeSlots.map((slotKey, rowIdx) => {
                    const [slotStart, slotEnd] = slotKey.split('|');
                    return (
                      <tr key={slotKey} className="align-top">
                        <td className="border border-gray-300 px-2 py-3 text-center font-medium text-gray-700 whitespace-nowrap bg-gray-50">
                          {slotStart}<br /><span className="text-[10px] text-gray-400">–</span><br />{slotEnd}
                        </td>
                        {DAYS.map(day => {
                          // Holiday takes over entire column — show only on first row
                          const holidayCell = overviewCells.cells[`${day}|HOLIDAY`];
                          if (holidayCell) {
                            if (rowIdx === 0) {
                              return (
                                <td key={day}
                                  rowSpan={overviewCells.timeSlots.length}
                                  className="border border-gray-300 px-3 py-3 holiday-cell text-center align-middle"
                                  style={{ background: '#fee2e2' }}>
                                  <FontAwesomeIcon icon={faBan} className="text-red-400 mb-1 block mx-auto text-base" />
                                  <div className="font-semibold text-red-700 text-xs">{holidayCell.label}</div>
                                  <div className="text-[10px] text-red-400 mt-0.5">Full Day</div>
                                </td>
                              );
                            }
                            return null; // skipped because of rowSpan
                          }

                          const cellKey = `${day}|${slotKey}`;
                          const cell = overviewCells.cells[cellKey];

                          if (!cell || cell.type === 'empty') {
                            return <td key={day} className="border border-gray-300 px-2 py-2 text-gray-300">—</td>;
                          }

                          if (cell.type === 'event') {
                            return (
                              <td key={day} className="border border-gray-300 px-3 py-2 event-cell" style={{ background: '#fef3c7' }}>
                                <FontAwesomeIcon icon={faCalendarAlt} className="text-amber-500 mr-1" />
                                <span className="font-semibold text-amber-700 text-xs">{cell.label}</span>
                              </td>
                            );
                          }

                          // Normal cell
                          return (
                            <td key={day} className="border border-gray-300 px-3 py-2 group relative">
                              {/* Edit button */}
                              <button
                                onClick={() => startEdit(cellKey)}
                                className="no-print absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-600"
                                title="Edit cell">
                                <FontAwesomeIcon icon={faPencil} className="text-[10px]" />
                              </button>

                              <div className="font-bold text-gray-900 mb-1.5">{cell.subject}</div>
                              {cell.objectives && (
                                <div className="mb-1">
                                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Learning Goals:</span>
                                  <div className="text-gray-700 text-[11px] leading-tight whitespace-pre-line">{cell.objectives}</div>
                                </div>
                              )}
                              {cell.activities && (
                                <div className="mb-1">
                                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Activity:</span>
                                  <div className="text-gray-700 text-[11px] leading-tight whitespace-pre-line">{cell.activities}</div>
                                </div>
                              )}
                              {cell.resources !== undefined && (
                                <div>
                                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Resource:</span>
                                  <div className="text-gray-700 text-[11px] leading-tight">{cell.resources || '-'}</div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400 flex justify-between no-print">
              <span>{overviewCells.hasDraft || draftLoaded ? '✓ Draft tersimpan' : 'Belum disimpan'}</span>
              <span>{overviewCells.kelasNama} | {overviewCells.weekLabel}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
