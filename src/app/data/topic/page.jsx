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
  const [currentUserId, setCurrentUserId] = useState(null);

  // Filters
  const [filters, setFilters] = useState({ subject: "", search: "" });

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // topic row or null
  const [formData, setFormData] = useState({ topic_nama: "", topic_subject_id: "" });
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
          .select('subject_id, subject_name')
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
            .select('topic_id, topic_nama, topic_subject_id')
            .in('topic_subject_id', subjectIds)
            .order('topic_nama');
          if (tErr) throw new Error(tErr.message);
          tops = tData || [];
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
    return topics.filter(
      (row) => (!filters.subject || String(row.topic_subject_id) === filters.subject) && (!filters.search || row.topic_nama.toLowerCase().includes(filters.search.toLowerCase()))
    );
  }, [topics, filters]);

  const resetForm = () => {
    setEditing(null);
    setFormData({ topic_nama: "", topic_subject_id: "" });
    setFormErrors({});
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormData({ topic_nama: row.topic_nama || "", topic_subject_id: String(row.topic_subject_id || "") });
    setFormErrors({});
    setShowForm(true);
  };

  const validate = () => {
    const e = {};
    if (!formData.topic_nama.trim()) e.topic_nama = t("topic.validation.unitTitleRequired") || "Unit title wajib diisi";
    if (!formData.topic_subject_id) e.topic_subject_id = t("topic.validation.subjectRequired") || "Mata pelajaran wajib dipilih";
    // Ensure selected subject belongs to current user list
    if (formData.topic_subject_id && !subjects.find(s => String(s.subject_id) === String(formData.topic_subject_id))) {
      e.topic_subject_id = t("topic.validation.subjectRequired") || "Mata pelajaran wajib dipilih";
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
        topic_nama: formData.topic_nama.trim(),
        topic_subject_id: parseInt(formData.topic_subject_id),
      };
      if (editing) {
        const { data, error: upErr } = await supabase.from("topic").update(payload).eq("topic_id", editing.topic_id).select();
        if (upErr) throw new Error(upErr.message);
        if (data && data[0]) {
          setTopics((prev) => prev.map((r) => (r.topic_id === editing.topic_id ? data[0] : r)));
        }
        showNotification(t("topic.notifSuccessTitle") || "Berhasil", t("topic.notifUpdated") || "Unit berhasil diupdate", "success");
      } else {
        const { data, error: insErr } = await supabase.from("topic").insert([payload]).select();
        if (insErr) throw new Error(insErr.message);
        if (data && data[0]) setTopics((prev) => [data[0], ...prev]);
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("topic.thActions") || "Aksi"}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((row) => (
                    <tr key={row.topic_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.topic_nama}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{subjectMap.get(row.topic_subject_id) || "-"}</td>
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
              className={formErrors.topic_nama ? "border-red-500" : ""}
            />
            {formErrors.topic_nama && <p className="text-red-500 text-sm mt-1">{formErrors.topic_nama}</p>}
          </div>
          <div>
            <Label htmlFor="topic_subject_id">{t("topic.subject") || "Mata Pelajaran"}</Label>
            <select
              id="topic_subject_id"
              name="topic_subject_id"
              value={formData.topic_subject_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, topic_subject_id: e.target.value }))}
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
