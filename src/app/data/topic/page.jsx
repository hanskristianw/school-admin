"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Modal from "@/components/ui/modal";
import NotificationModal from "@/components/ui/notification-modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faEdit, faTrash, faSpinner } from "@fortawesome/free-solid-svg-icons";

export default function TopicPage() {
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [kelasCache, setKelasCache] = useState(new Map()); // subject_id -> kelas[]
  const [kelasOptions, setKelasOptions] = useState([]); // current subject's kelas list
  const [kelasLoading, setKelasLoading] = useState(false);
  const [kelasNameMap, setKelasNameMap] = useState(new Map()); // kelas_id -> kelas_nama for display in list
  const [currentUserId, setCurrentUserId] = useState(null);

  // Filters
  const [filters, setFilters] = useState({ subject: "", search: "" });

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // topic row or null
  const [formData, setFormData] = useState({ topic_nama: "", topic_subject_id: "", topic_kelas_id: "", topic_planner: "" });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState({ open: false, row: null });

  // Notifications
  const [notification, setNotification] = useState({ isOpen: false, title: "", message: "", type: "success" });
  const showNotification = (title, message, type = "success") => setNotification({ isOpen: true, title, message, type });

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError("");
        // Get current user ID from localStorage (same pattern as teacher submission)
        const kr_id = typeof window !== 'undefined' ? localStorage.getItem("kr_id") : null;
        if (!kr_id) {
          setError(t('teacherSubmission.unauth') || t('common.errorLoading') || 'User tidak terautentikasi');
          setSubjects([]);
          setTopics([]);
          return;
        }
        const userId = parseInt(kr_id);
        setCurrentUserId(userId);

        // 1) Load only subjects taught by this user
        const { data: subj, error: sErr } = await supabase
          .from('subject')
          .select('subject_id, subject_name, subject_guide')
          .eq('subject_user_id', userId)
          .order('subject_name');
        if (sErr) throw new Error(sErr.message);

        setSubjects(subj || []);

        // 2) Load topics only for those subjects
        let tops = [];
        if (subj && subj.length > 0) {
          const subjectIds = subj.map(s => s.subject_id);
      const { data: tData, error: tErr } = await supabase
        .from('topic')
        .select('topic_id, topic_nama, topic_subject_id, topic_kelas_id, topic_planner')
            .in('topic_subject_id', subjectIds)
            .order('topic_nama');
          if (tErr) throw new Error(tErr.message);
          tops = tData || [];
          // Build kelas name map for existing topics
          await loadKelasNamesForTopics(tops);
        }
        setTopics(tops);
      } catch (e) {
        console.error(e);
        setError(t('topic.loadError') || 'Gagal memuat data');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [t]);

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.subject_id, s.subject_name])), [subjects]);

  const filtered = useMemo(() => {
    const gradeOf = (name) => {
      if (!name || typeof name !== 'string') return 9999;
      const m = name.match(/(\d{1,2})/); // extract first number from class name
      return m ? parseInt(m[1], 10) : 9999;
    };
    return topics
      .filter(
        (row) => (!filters.subject || String(row.topic_subject_id) === filters.subject) && (!filters.search || row.topic_nama.toLowerCase().includes(filters.search.toLowerCase()))
      )
      .slice()
      .sort((a, b) => {
        const aName = a.topic_kelas_id ? (kelasNameMap.get(a.topic_kelas_id) || '') : ''
        const bName = b.topic_kelas_id ? (kelasNameMap.get(b.topic_kelas_id) || '') : ''
        const ga = gradeOf(aName)
        const gb = gradeOf(bName)
        if (ga !== gb) return ga - gb
        // fallback: class name asc, then topic title asc
        const ncmp = (aName || '').localeCompare(bName || '')
        if (ncmp !== 0) return ncmp
        return (a.topic_nama || '').localeCompare(b.topic_nama || '')
      })
  }, [topics, filters, kelasNameMap]);

  const resetForm = () => {
    setEditing(null);
    setFormData({ topic_nama: "", topic_subject_id: "", topic_kelas_id: "", topic_planner: "" });
    setFormErrors({});
    setKelasOptions([]);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormData({ topic_nama: row.topic_nama || "", topic_subject_id: String(row.topic_subject_id || ""), topic_kelas_id: row.topic_kelas_id ? String(row.topic_kelas_id) : "", topic_planner: row.topic_planner || "" });
    setFormErrors({});
    setShowForm(true);
    if (row.topic_subject_id) {
      loadKelasForSubject(row.topic_subject_id);
    }
  };

  const validate = () => {
    const e = {};
    if (!formData.topic_nama.trim()) e.topic_nama = t("topic.validation.unitTitleRequired") || "Unit title wajib diisi";
    if (!formData.topic_subject_id) e.topic_subject_id = t("topic.validation.subjectRequired") || "Mata pelajaran wajib dipilih";
    // kelas required: only if subject selected
    if (formData.topic_subject_id && !formData.topic_kelas_id) e.topic_kelas_id = t('topic.validation.classRequired') || 'Kelas wajib dipilih';
    // optional planner URL validation
    if (formData.topic_planner && formData.topic_planner.trim()) {
      try {
        const u = new URL(formData.topic_planner.trim());
        if (!/^https?:$/.test(u.protocol)) throw new Error('invalid');
      } catch {
        e.topic_planner = 'Link harus berupa URL yang valid (contoh: https://drive.google.com/...)';
      }
    }
    // Ensure selected subject belongs to current user list
    if (formData.topic_subject_id && !subjects.find(s => String(s.subject_id) === String(formData.topic_subject_id))) {
      e.topic_subject_id = t("topic.validation.subjectRequired") || "Mata pelajaran wajib dipilih";
    }
    // Ensure kelas belongs to subject's kelasOptions
    if (formData.topic_kelas_id && !kelasOptions.find(k => String(k.kelas_id) === String(formData.topic_kelas_id))) {
      e.topic_kelas_id = t('topic.validation.classRequired') || 'Kelas wajib dipilih';
    }
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const loadKelasForSubject = async (subjectId) => {
    if (kelasCache.has(subjectId)) {
      setKelasOptions(kelasCache.get(subjectId));
      return;
    }
    try {
      setKelasLoading(true);
      // Find kelas via detail_kelas mapping
      const { data: dk, error: dkErr } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_kelas_id')
        .eq('detail_kelas_subject_id', subjectId);
      if (dkErr) throw new Error(dkErr.message);
      const kelasIds = Array.from(new Set((dk || []).map(d => d.detail_kelas_kelas_id).filter(Boolean)));
      let kelasList = [];
      if (kelasIds.length) {
        const { data: kData, error: kErr } = await supabase
          .from('kelas')
          .select('kelas_id, kelas_nama')
          .in('kelas_id', kelasIds)
          .order('kelas_nama');
        if (kErr) throw new Error(kErr.message);
        kelasList = kData || [];
      }
      setKelasOptions(kelasList);
      setKelasCache(prev => new Map(prev).set(subjectId, kelasList));
    } catch (err) {
      console.error('Failed loading kelas for subject', subjectId, err);
      setKelasOptions([]);
    } finally {
      setKelasLoading(false);
    }
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      const payload = {
        topic_nama: formData.topic_nama.trim(),
        topic_subject_id: parseInt(formData.topic_subject_id),
        topic_kelas_id: formData.topic_kelas_id ? parseInt(formData.topic_kelas_id) : null,
        topic_planner: formData.topic_planner?.trim() || null,
      };
      if (editing) {
  const { data, error: upErr } = await supabase.from("topic").update(payload).eq("topic_id", editing.topic_id).select();
        if (upErr) throw new Error(upErr.message);
        if (data && data[0]) {
          setTopics((prev) => prev.map((r) => (r.topic_id === editing.topic_id ? data[0] : r)));
          if (data[0].topic_kelas_id) await ensureKelasNameLoaded(data[0].topic_kelas_id);
        }
        showNotification(t("topic.notifSuccessTitle") || "Berhasil", t("topic.notifUpdated") || "Unit berhasil diupdate", "success");
      } else {
  const { data, error: insErr } = await supabase.from("topic").insert([payload]).select();
        if (insErr) throw new Error(insErr.message);
        if (data && data[0]) {
          setTopics((prev) => [data[0], ...prev]);
          if (data[0].topic_kelas_id) await ensureKelasNameLoaded(data[0].topic_kelas_id);
        }
        showNotification(t("topic.notifSuccessTitle") || "Berhasil", t("topic.notifCreated") || "Unit berhasil dibuat", "success");
      }
      setShowForm(false);
      resetForm();
    } catch (e) {
      console.error(e);
      showNotification(t("topic.notifErrorTitle") || "Error", (t("topic.notifErrorSave") || "Gagal menyimpan: ") + e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Load kelas names for a list of topics
  const loadKelasNamesForTopics = async (topicsList) => {
    try {
      const ids = Array.from(new Set((topicsList || []).map(tp => tp.topic_kelas_id).filter(Boolean)));
      const missing = ids.filter(id => !kelasNameMap.has(id));
      if (!missing.length) return;
      const { data, error } = await supabase
        .from('kelas')
        .select('kelas_id, kelas_nama')
        .in('kelas_id', missing);
      if (error) throw new Error(error.message);
      if (data) {
        setKelasNameMap(prev => {
          const map = new Map(prev);
            data.forEach(k => map.set(k.kelas_id, k.kelas_nama));
          return map;
        });
      }
    } catch (err) {
      console.warn('Failed loading kelas names for topics', err);
    }
  };

  const ensureKelasNameLoaded = async (kelasId) => {
    if (!kelasId || kelasNameMap.has(kelasId)) return;
    try {
      const { data, error } = await supabase
        .from('kelas')
        .select('kelas_id, kelas_nama')
        .eq('kelas_id', kelasId)
        .single();
      if (!error && data) {
        setKelasNameMap(prev => new Map(prev).set(data.kelas_id, data.kelas_nama));
      }
    } catch (e) {
      /* ignore */
    }
  };

  const onDelete = async () => {
    if (!confirmDelete.row) return;
    try {
      setSubmitting(true);
      const { error: delErr } = await supabase.from("topic").delete().eq("topic_id", confirmDelete.row.topic_id);
      if (delErr) throw new Error(delErr.message);
      setTopics((prev) => prev.filter((r) => r.topic_id !== confirmDelete.row.topic_id));
      showNotification(t("topic.notifSuccessTitle") || "Berhasil", t("topic.notifDeleted") || "Unit berhasil dihapus", "success");
      setConfirmDelete({ open: false, row: null });
    } catch (e) {
      console.error(e);
      showNotification(t("topic.notifErrorTitle") || "Error", (t("topic.notifErrorDelete") || "Gagal menghapus: ") + e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("topic.title") || "Unit (Topic) Management"}</h1>
          <p className="text-gray-600">{t("topic.subtitle") || "Kelola Unit (Topik) untuk setiap mata pelajaran"}</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          {t("topic.new") || "Tambah Unit"}
        </Button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t("topic.filtersTitle") || "Filter"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("topic.subject") || "Mata Pelajaran"}</label>
              <select
                value={filters.subject}
                onChange={(e) => setFilters((prev) => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t("topic.allSubjects") || "Semua Mata Pelajaran"}</option>
                {subjects.map((s) => (
                  <option key={s.subject_id} value={s.subject_id}>
                    {s.subject_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("topic.search") || "Cari Unit"}</label>
              <Input
                placeholder={t("topic.searchPlaceholder") || "Ketik untuk mencari..."}
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>
          {/* Subject guide link for selected subject */}
          {filters.subject && (() => {
            const s = subjects.find(x => String(x.subject_id) === String(filters.subject));
            const guide = s?.subject_guide?.trim();
            return guide ? (
              <div className="md:col-span-3 text-sm text-gray-700">
                <span className="text-gray-600 mr-2">Guide:</span>
                <a href={guide} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline hover:text-blue-900">Open</a>
              </div>
            ) : null;
          })()}
          {/* If 'All Subjects' selected, show guides for all subjects that have links */}
          {!filters.subject && subjects && subjects.length > 0 && (
            <div className="md:col-span-3 text-sm text-gray-700">
              <div className="text-gray-600 mb-1">Guides:</div>
              <ul className="list-disc ml-5 space-y-1">
                {subjects.map((s) => {
                  const g = s.subject_guide?.trim();
                  if (!g) return null;
                  return (
                    <li key={s.subject_id}>
                      <span className="text-gray-800">{s.subject_name}:</span>
                      <a href={g} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline hover:text-blue-900 ml-2">Open</a>
                    </li>
                  );
                })}
                {subjects.every((s) => !s.subject_guide) && (
                  <li className="text-gray-400">-</li>
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("topic.listTitle") || "Daftar Unit"}</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t("topic.empty") || "Tidak ada data unit"}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("topic.thUnitTitle") || "Unit Title"}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("topic.thSubject") || "Mata Pelajaran"}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('topic.thClass') || 'Kelas'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("topic.thActions") || "Aksi"}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((row) => (
                    <tr key={row.topic_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.topic_nama}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{subjectMap.get(row.topic_subject_id) || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.topic_kelas_id ? (kelasNameMap.get(row.topic_kelas_id) || row.topic_kelas_id) : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {row.topic_planner ? (
                          <a href={row.topic_planner} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline hover:text-blue-900">Open</a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button onClick={() => openEdit(row)} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 text-sm">
                            <FontAwesomeIcon icon={faEdit} className="mr-1" />
                            {t("topic.edit") || "Edit"}
                          </Button>
                          <Button onClick={() => setConfirmDelete({ open: true, row })} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm">
                            <FontAwesomeIcon icon={faTrash} className="mr-1" />
                            {t("topic.delete") || "Hapus"}
                          </Button>
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

      {/* Create/Edit Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }} title={editing ? t("topic.editTitle") || "Edit Unit" : t("topic.createTitle") || "Tambah Unit"}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="topic_nama">{t("topic.unitTitle") || "Unit Title"}</Label>
            <Input
              id="topic_nama"
              name="topic_nama"
              value={formData.topic_nama}
              onChange={(e) => setFormData((prev) => ({ ...prev, topic_nama: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.topic_nama ? 'border-red-500' : 'border-gray-300'}`}
            />
            {formErrors.topic_nama && <p className="text-red-500 text-sm mt-1">{formErrors.topic_nama}</p>}
          </div>
          <div>
            <Label htmlFor="topic_subject_id">{t("topic.subject") || "Mata Pelajaran"}</Label>
            <select
              id="topic_subject_id"
              name="topic_subject_id"
              value={formData.topic_subject_id}
              onChange={(e) => {
                const v = e.target.value;
                setFormData(prev => ({ ...prev, topic_subject_id: v, topic_kelas_id: '' }));
                if (v) loadKelasForSubject(parseInt(v)); else { setKelasOptions([]); }
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.topic_subject_id ? "border-red-500" : "border-gray-300"}`}
            >
              <option value="">{t("topic.selectSubject") || "Pilih Mata Pelajaran"}</option>
              {subjects.map((s) => (
                <option key={s.subject_id} value={s.subject_id}>
                  {s.subject_name}
                </option>
              ))}
            </select>
            {formErrors.topic_subject_id && <p className="text-red-500 text-sm mt-1">{formErrors.topic_subject_id}</p>}
            {/* Guide link for selected subject in form */}
            {formData.topic_subject_id && (() => {
              const s = subjects.find(x => String(x.subject_id) === String(formData.topic_subject_id));
              const guide = s?.subject_guide?.trim();
              return guide ? (
                <p className="text-sm mt-2">
                  <span className="text-gray-600 mr-1">Guide:</span>
                  <a href={guide} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline hover:text-blue-900">Open</a>
                </p>
              ) : null;
            })()}
          </div>
          <div>
            <Label htmlFor="topic_kelas_id">{t('topic.class') || 'Kelas'}</Label>
            <select
              id="topic_kelas_id"
              name="topic_kelas_id"
              value={formData.topic_kelas_id}
              onChange={(e) => setFormData(prev => ({ ...prev, topic_kelas_id: e.target.value }))}
              disabled={!formData.topic_subject_id || kelasLoading}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.topic_kelas_id ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">{kelasLoading ? (t('topic.classLoading') || 'Memuat kelas...') : (t('topic.selectClass') || 'Pilih Kelas')}</option>
              {kelasOptions.map(k => (
                <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>
              ))}
            </select>
            {formErrors.topic_kelas_id && <p className="text-red-500 text-sm mt-1">{formErrors.topic_kelas_id}</p>}
            {(!kelasLoading && formData.topic_subject_id && kelasOptions.length === 0) && (
              <p className="text-xs text-gray-500 mt-1">{t('topic.classNoneForSubject') || 'Tidak ada kelas untuk subject ini.'}</p>
            )}
          </div>
          <div>
            <Label htmlFor="topic_planner">Planner (Google Drive URL)</Label>
            <Input
              id="topic_planner"
              name="topic_planner"
              type="url"
              placeholder="https://drive.google.com/..."
              value={formData.topic_planner}
              onChange={(e) => setFormData(prev => ({ ...prev, topic_planner: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md ${formErrors.topic_planner ? 'border-red-500' : 'border-gray-300'}`}
            />
            {formErrors.topic_planner && <p className="text-red-500 text-sm mt-1">{formErrors.topic_planner}</p>}
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="bg-gray-500 hover:bg-gray-600 text-white">
              {t("topic.cancel") || "Batal"}
            </Button>
            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  {t("topic.saving") || "Menyimpan..."}
                </>
              ) : editing ? (
                t("topic.save") || "Simpan"
              ) : (
                t("topic.create") || "Buat"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, row: null })} title={t("topic.confirmTitleDelete") || "Konfirmasi Penghapusan"}>
        <div className="space-y-4">
          <p className="text-gray-700">{t("topic.confirmDeleteQuestion", { name: confirmDelete.row?.topic_nama || "" }) || `Hapus unit "${confirmDelete.row?.topic_nama || ""}"?`}</p>
          <div className="flex justify-end space-x-3 pt-2">
            <Button onClick={() => setConfirmDelete({ open: false, row: null })} className="bg-gray-500 hover:bg-gray-600 text-white">
              {t("topic.cancel") || "Batal"}
            </Button>
            <Button onClick={onDelete} disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  {t("topic.processing") || "Memproses..."}
                </>
              ) : (
                t("topic.btnYesDelete") || "Ya, Hapus"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Notification */}
      <NotificationModal isOpen={notification.isOpen} onClose={() => setNotification((prev) => ({ ...prev, isOpen: false }))} title={notification.title} message={notification.message} type={notification.type} />
    </div>
  );
}
