'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBookOpen,
  faPlus,
  faSearch,
  faEdit,
  faTrash,
  faSpinner,
  faChevronDown,
  faChevronRight,
  faCopy,
  faCheckCircle,
  faExclamationTriangle,
  faDatabase,
  faCheck,
  faCheckSquare,
  faSquare
} from '@fortawesome/free-solid-svg-icons'

export default function PypSubjectManagementPage() {
  const { theme, isDark } = useTheme()

  // Primary Data States
  const [subjects, setSubjects] = useState([])
  const [subjectClasses, setSubjectClasses] = useState([])
  const [strands, setStrands] = useState([])
  const [years, setYears] = useState([])
  const [pypClasses, setPypClasses] = useState([])

  // Filter States
  const [selectedYearId, setSelectedYearId] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSubjects, setExpandedSubjects] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [dbSetupNeeded, setDbSetupNeeded] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)

  // Subject Modal State
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [subjectForm, setSubjectForm] = useState({
    year_id: '',
    selected_kelas_ids: [],
    name: '',
    code: '',
    description: '',
    order_index: 0
  })
  const [savingSubject, setSavingSubject] = useState(false)

  // Strand Modal State
  const [showStrandModal, setShowStrandModal] = useState(false)
  const [editingStrand, setEditingStrand] = useState(null)
  const [strandForm, setStrandForm] = useState({
    subject_id: '',
    name: '',
    description: '',
    order_index: 0
  })
  const [savingStrand, setSavingStrand] = useState(false)

  // Copy Curriculum Modal State
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copySourceYearId, setCopySourceYearId] = useState('')
  const [copyingCurriculum, setCopyingCurriculum] = useState(false)

  // Notifications
  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // 1. Fetch Academic Years
  const fetchYears = async () => {
    try {
      const { data, error } = await supabase
        .from('year')
        .select('year_id, year_name, start_date, end_date')
        .order('year_name', { ascending: false })

      if (error) throw error
      setYears(data || [])

      if (data && data.length > 0) {
        const today = new Date().toISOString().split('T')[0]
        const current = data.find(y => {
          const s = y.start_date ? y.start_date.split('T')[0] : ''
          const e = y.end_date ? y.end_date.split('T')[0] : ''
          return s <= today && today <= e
        })
        const targetId = current ? String(current.year_id) : String(data[0].year_id)
        setSelectedYearId(prev => prev || targetId)
      }
    } catch (err) {
      console.error('Error fetching academic years:', err)
    }
  }

  // 2. Fetch PYP Classes from /data/class (kelas table)
  const fetchPypClasses = async () => {
    try {
      const { data: unitsData, error: unitErr } = await supabase
        .from('unit')
        .select('unit_id, unit_name, is_pyp')
        .eq('is_pyp', true)

      if (unitErr) throw unitErr

      const pypUnitIds = (unitsData || []).map(u => u.unit_id)
      if (pypUnitIds.length === 0) return

      const { data: classesData, error: classErr } = await supabase
        .from('kelas')
        .select('kelas_id, kelas_nama, kelas_unit_id, kelas_year_id')
        .in('kelas_unit_id', pypUnitIds)
        .order('kelas_nama', { ascending: true })

      if (classErr) throw classErr
      setPypClasses(classesData || [])
    } catch (err) {
      console.error('Error fetching PYP classes from /data/class:', err)
    }
  }

  // 3. Fetch PYP Subjects, Subject Classes Junction, & Strands
  const fetchSubjectsAndStrands = async () => {
    try {
      setLoading(true)

      // Fetch Subjects
      const { data: subData, error: subError } = await supabase
        .from('pyp_subject')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true })
        .order('name', { ascending: true })

      if (subError) {
        if (subError.code === '42P01' || subError.message?.includes('does not exist') || subError.message?.includes('relation "public.pyp_subject"')) {
          setDbSetupNeeded(true)
          setLoading(false)
          return
        }
        throw subError
      }

      setSubjects(subData || [])
      // Cards stay closed (collapsed) by default

      // Fetch Subject Classes Junction
      const { data: scData, error: scError } = await supabase
        .from('pyp_subject_class')
        .select('id, subject_id, kelas_id')

      if (scError) {
        if (scError.code === '42P01' || scError.message?.includes('does not exist') || scError.message?.includes('relation "public.pyp_subject_class"')) {
          setDbSetupNeeded(true)
        } else {
          console.warn('pyp_subject_class error:', scError)
        }
      } else if (scData) {
        setSubjectClasses(scData)
      }

      // Fetch Strands
      const { data: strData, error: strError } = await supabase
        .from('pyp_subject_strand')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true })
        .order('name', { ascending: true })

      if (strError && strError.code !== '42P01') {
        throw strError
      }

      setStrands(strData || [])
    } catch (err) {
      console.error('Error fetching PYP master data:', err)
      showToast(err.message || 'Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchYears()
    fetchPypClasses()
    fetchSubjectsAndStrands()
  }, [])

  // Classes map for quick lookup
  const classesByIdMap = useMemo(() => {
    const map = new Map()
    for (const c of pypClasses) {
      map.set(Number(c.kelas_id), c)
    }
    return map
  }, [pypClasses])

  // Subject -> Set of Kelas IDs map
  const classesBySubjectMap = useMemo(() => {
    const map = new Map()
    for (const sc of subjectClasses) {
      const set = map.get(sc.subject_id) || new Set()
      set.add(Number(sc.kelas_id))
      map.set(sc.subject_id, set)
    }
    return map
  }, [subjectClasses])

  // Available classes for currently selected academic year
  const availableClasses = useMemo(() => {
    if (!selectedYearId) return pypClasses
    const scoped = pypClasses.filter(c => String(c.kelas_year_id) === String(selectedYearId))
    return scoped.length > 0 ? scoped : pypClasses
  }, [pypClasses, selectedYearId])

  // Classes for the year selected in subject form modal
  const formYearClasses = useMemo(() => {
    const targetYid = subjectForm.year_id || selectedYearId
    if (!targetYid) return pypClasses
    const scoped = pypClasses.filter(c => String(c.kelas_year_id) === String(targetYid))
    return scoped.length > 0 ? scoped : pypClasses
  }, [pypClasses, subjectForm.year_id, selectedYearId])

  // Toggle Subject Card Expand
  const toggleSubjectExpand = (subjId) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev)
      if (next.has(subjId)) next.delete(subjId)
      else next.add(subjId)
      return next
    })
  }

  // Filtered Strands by Subject
  const strandsBySubjectMap = useMemo(() => {
    const map = new Map()
    for (const strand of strands) {
      const matchesSearch = !searchQuery.trim() || 
        strand.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (strand.description && strand.description.toLowerCase().includes(searchQuery.toLowerCase()))

      if (matchesSearch) {
        const list = map.get(strand.subject_id) || []
        list.push(strand)
        map.set(strand.subject_id, list)
      }
    }
    return map
  }, [strands, searchQuery])

  // Filtered Subjects list (Scoped strictly to selected Academic Year AND Class)
  const filteredSubjects = useMemo(() => {
    let list = subjects

    // 1. Filter by Academic Year
    if (selectedYearId) {
      list = list.filter(s => String(s.year_id) === String(selectedYearId))
    }

    // 2. Filter by Class
    if (selectedClassId && selectedClassId !== 'All') {
      const targetKid = Number(selectedClassId)
      list = list.filter(s => {
        const classSet = classesBySubjectMap.get(s.id)
        if (!classSet || classSet.size === 0) return false
        return classSet.has(targetKid)
      })
    }

    // 3. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(s => {
        const nameMatch = s.name?.toLowerCase().includes(q)
        const codeMatch = s.code && s.code?.toLowerCase().includes(q)
        const descMatch = s.description && s.description?.toLowerCase().includes(q)
        
        // Match class names
        const classSet = classesBySubjectMap.get(s.id) || new Set()
        let classMatch = false
        for (const kid of classSet) {
          const cName = classesByIdMap.get(kid)?.kelas_nama || ''
          if (cName.toLowerCase().includes(q)) {
            classMatch = true
            break
          }
        }

        const strandMatch = (strandsBySubjectMap.get(s.id) || []).some(
          st => st.name?.toLowerCase().includes(q) || (st.description && st.description?.toLowerCase().includes(q))
        )
        return nameMatch || codeMatch || descMatch || classMatch || strandMatch
      })
    }

    return list
  }, [subjects, selectedYearId, selectedClassId, searchQuery, classesBySubjectMap, classesByIdMap, strandsBySubjectMap])

  // -------------------------------------------------------------
  // SUBJECT ACTIONS
  // -------------------------------------------------------------
  const handleOpenAddSubject = () => {
    setEditingSubject(null)
    const targetYid = selectedYearId || (years[0]?.year_id ? String(years[0].year_id) : '')
    
    // Classes for selected year
    const activeClasses = pypClasses.filter(c => String(c.kelas_year_id) === String(targetYid))
    const initialClasses = selectedClassId !== 'All' 
      ? [Number(selectedClassId)] 
      : activeClasses.map(c => Number(c.kelas_id))

    setSubjectForm({
      year_id: targetYid,
      selected_kelas_ids: initialClasses,
      name: '',
      code: '',
      description: '',
      order_index: filteredSubjects.length + 1
    })
    setShowSubjectModal(true)
  }

  const handleOpenEditSubject = (subj) => {
    setEditingSubject(subj)
    const currentKelasIds = Array.from(classesBySubjectMap.get(subj.id) || []).map(Number)
    setSubjectForm({
      year_id: subj.year_id ? String(subj.year_id) : '',
      selected_kelas_ids: currentKelasIds,
      name: subj.name,
      code: subj.code || '',
      description: subj.description || '',
      order_index: subj.order_index ?? 0
    })
    setShowSubjectModal(true)
  }

  const handleToggleClassInForm = (rawKelasId) => {
    const kid = Number(rawKelasId)
    setSubjectForm(prev => {
      const exists = prev.selected_kelas_ids.some(id => Number(id) === kid)
      const next = exists 
        ? prev.selected_kelas_ids.filter(id => Number(id) !== kid)
        : [...prev.selected_kelas_ids, kid]
      return { ...prev, selected_kelas_ids: next }
    })
  }

  const handleSelectAllClassesInForm = () => {
    setSubjectForm(prev => ({
      ...prev,
      selected_kelas_ids: formYearClasses.map(c => Number(c.kelas_id))
    }))
  }

  const handleDeselectAllClassesInForm = () => {
    setSubjectForm(prev => ({
      ...prev,
      selected_kelas_ids: []
    }))
  }

  const handleSaveSubject = async (e) => {
    e.preventDefault()
    if (!subjectForm.name.trim()) {
      showToast('Subject name is required', 'error')
      return
    }
    if (!subjectForm.year_id) {
      showToast('Academic year selection is required', 'error')
      return
    }
    if (!subjectForm.selected_kelas_ids || subjectForm.selected_kelas_ids.length === 0) {
      showToast('Please select at least one class for this subject', 'error')
      return
    }

    try {
      setSavingSubject(true)
      const payload = {
        year_id: Number(subjectForm.year_id),
        name: subjectForm.name.trim(),
        code: subjectForm.code ? subjectForm.code.trim().toUpperCase() : null,
        description: subjectForm.description ? subjectForm.description.trim() : null,
        order_index: Number(subjectForm.order_index) || 0,
        updated_at: new Date().toISOString()
      }

      let subjectId = editingSubject?.id

      if (editingSubject) {
        const { error } = await supabase
          .from('pyp_subject')
          .update(payload)
          .eq('id', editingSubject.id)

        if (error) throw error
      } else {
        const { data: inserted, error } = await supabase
          .from('pyp_subject')
          .insert([payload])
          .select('id')
          .single()

        if (error) throw error
        subjectId = inserted.id
      }

      // Sync subject classes junction table
      if (subjectId) {
        // 1. Delete existing associations
        const { error: delErr } = await supabase
          .from('pyp_subject_class')
          .delete()
          .eq('subject_id', subjectId)

        if (delErr && (delErr.code === '42P01' || delErr.message?.includes('does not exist'))) {
          setDbSetupNeeded(true)
          throw new Error('Table pyp_subject_class does not exist yet. Please run the SQL schema in Supabase.')
        }

        // 2. Insert new associations
        const junctionRows = subjectForm.selected_kelas_ids.map(kid => ({
          subject_id: subjectId,
          kelas_id: Number(kid)
        }))

        if (junctionRows.length > 0) {
          const { error: juncErr } = await supabase
            .from('pyp_subject_class')
            .insert(junctionRows)

          if (juncErr) {
            if (juncErr.code === '42P01' || juncErr.message?.includes('does not exist')) {
              setDbSetupNeeded(true)
              throw new Error('Table pyp_subject_class does not exist yet. Please run the SQL schema in Supabase.')
            }
            throw juncErr
          }
        }
      }

      showToast(editingSubject ? 'Subject updated successfully' : 'Subject created successfully')
      setShowSubjectModal(false)
      await fetchSubjectsAndStrands()
    } catch (err) {
      console.error('Error saving subject:', err)
      showToast(err.message || 'Failed to save subject', 'error')
    } finally {
      setSavingSubject(false)
    }
  }

  const handleDeleteSubject = async (subj) => {
    const strandCount = (strandsBySubjectMap.get(subj.id) || []).length
    const confirmText = strandCount > 0 
      ? `Are you sure you want to delete "${subj.name}" and all its ${strandCount} strands?` 
      : `Are you sure you want to delete "${subj.name}"?`

    if (!confirm(confirmText)) return

    try {
      const { error } = await supabase
        .from('pyp_subject')
        .delete()
        .eq('id', subj.id)

      if (error) throw error
      showToast('Subject deleted successfully')
      await fetchSubjectsAndStrands()
    } catch (err) {
      console.error('Error deleting subject:', err)
      showToast(err.message || 'Failed to delete subject', 'error')
    }
  }

  // -------------------------------------------------------------
  // STRAND ACTIONS
  // -------------------------------------------------------------
  const handleOpenAddStrand = (subjectId) => {
    setEditingStrand(null)
    setExpandedSubjects(prev => new Set(prev).add(subjectId))
    const existingStrands = strandsBySubjectMap.get(subjectId) || []
    setStrandForm({
      subject_id: subjectId,
      name: '',
      description: '',
      semester: '1',
      order_index: existingStrands.length + 1
    })
    setShowStrandModal(true)
  }

  const handleOpenEditStrand = (strand) => {
    setEditingStrand(strand)
    setExpandedSubjects(prev => new Set(prev).add(strand.subject_id))
    setStrandForm({
      subject_id: strand.subject_id,
      name: strand.name,
      description: strand.description || '',
      semester: strand.semester || '1',
      order_index: strand.order_index ?? 0
    })
    setShowStrandModal(true)
  }

  const handleSaveStrand = async (e) => {
    e.preventDefault()
    if (!strandForm.name.trim()) {
      showToast('Strand name is required', 'error')
      return
    }
    if (!strandForm.subject_id) {
      showToast('Subject selection is required', 'error')
      return
    }

    try {
      setSavingStrand(true)
      const payload = {
        subject_id: Number(strandForm.subject_id),
        name: strandForm.name.trim(),
        description: strandForm.description ? strandForm.description.trim() : null,
        semester: strandForm.semester || '1',
        order_index: Number(strandForm.order_index) || 0,
        updated_at: new Date().toISOString()
      }

      if (editingStrand) {
        const { error } = await supabase
          .from('pyp_subject_strand')
          .update(payload)
          .eq('id', editingStrand.id)

        if (error) throw error
        showToast('Strand updated successfully')
      } else {
        const { error } = await supabase
          .from('pyp_subject_strand')
          .insert([payload])

        if (error) throw error
        showToast('Strand created successfully')
      }

      setShowStrandModal(false)
      if (strandForm.subject_id) {
        setExpandedSubjects(prev => new Set(prev).add(Number(strandForm.subject_id)))
      }
      await fetchSubjectsAndStrands()
    } catch (err) {
      console.error('Error saving strand:', err)
      showToast(err.message || 'Failed to save strand', 'error')
    } finally {
      setSavingStrand(false)
    }
  }

  const handleDeleteStrand = async (strand) => {
    if (!confirm(`Are you sure you want to delete strand "${strand.name}"?`)) return

    try {
      const { error } = await supabase
        .from('pyp_subject_strand')
        .delete()
        .eq('id', strand.id)

      if (error) throw error
      showToast('Strand deleted successfully')
      await fetchSubjectsAndStrands()
    } catch (err) {
      console.error('Error deleting strand:', err)
      showToast(err.message || 'Failed to delete strand', 'error')
    }
  }

  // -------------------------------------------------------------
  // COPY CURRICULUM FROM PREVIOUS YEAR
  // -------------------------------------------------------------
  const handleCopyCurriculumFromYear = async () => {
    if (!copySourceYearId || !selectedYearId) {
      showToast('Please select source and target academic years', 'error')
      return
    }
    if (copySourceYearId === selectedYearId) {
      showToast('Source and Target years cannot be the same', 'error')
      return
    }

    try {
      setCopyingCurriculum(true)
      
      // 1. Fetch subjects from source year
      const { data: sourceSubjects, error: subErr } = await supabase
        .from('pyp_subject')
        .select('*')
        .eq('year_id', Number(copySourceYearId))
        .eq('is_active', true)

      if (subErr) throw subErr

      if (!sourceSubjects || sourceSubjects.length === 0) {
        showToast('No subjects found in the selected source academic year', 'error')
        return
      }

      const sourceSubjectIds = sourceSubjects.map(s => s.id)

      // 2. Fetch strands & class associations
      const [strRes, scRes] = await Promise.all([
        supabase.from('pyp_subject_strand').select('*').in('subject_id', sourceSubjectIds).eq('is_active', true),
        supabase.from('pyp_subject_class').select('*').in('subject_id', sourceSubjectIds)
      ])

      const sourceStrands = strRes.data || []
      const sourceSC = scRes.data || []

      let totalSubjectsCreated = 0
      let totalStrandsCreated = 0

      // Map target year classes by name for seamless class re-linking
      const targetYearClasses = pypClasses.filter(c => String(c.kelas_year_id) === String(selectedYearId))
      const targetClassByName = new Map()
      for (const tc of targetYearClasses) {
        targetClassByName.set(tc.kelas_nama.toLowerCase(), Number(tc.kelas_id))
      }

      // 3. Clone each subject into target year
      for (const sourceSubj of sourceSubjects) {
        const { data: newSubjData, error: insSubjErr } = await supabase
          .from('pyp_subject')
          .insert([{
            year_id: Number(selectedYearId),
            name: sourceSubj.name,
            code: sourceSubj.code || null,
            description: sourceSubj.description || null,
            order_index: sourceSubj.order_index ?? 0,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select('id')
          .single()

        if (insSubjErr) throw insSubjErr
        totalSubjectsCreated++
        const newSubjId = newSubjData.id

        // Re-link classes
        const matchingSC = sourceSC.filter(sc => sc.subject_id === sourceSubj.id)
        if (matchingSC.length > 0) {
          const newJunctions = []
          for (const oldSc of matchingSC) {
            const oldClassName = classesByIdMap.get(Number(oldSc.kelas_id))?.kelas_nama?.toLowerCase()
            const targetKid = oldClassName ? targetClassByName.get(oldClassName) : null
            if (targetKid) {
              newJunctions.push({ subject_id: newSubjId, kelas_id: targetKid })
            }
          }
          if (newJunctions.length > 0) {
            await supabase.from('pyp_subject_class').insert(newJunctions)
          }
        }

        // Re-create strands
        const matchingStrands = sourceStrands.filter(s => s.subject_id === sourceSubj.id)
        if (matchingStrands.length > 0) {
          const strandClones = matchingStrands.map(str => ({
            subject_id: newSubjId,
            name: str.name,
            description: str.description || null,
            order_index: str.order_index ?? 0,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))

          const { error: insStrErr } = await supabase
            .from('pyp_subject_strand')
            .insert(strandClones)

          if (insStrErr) throw insStrErr
          totalStrandsCreated += strandClones.length
        }
      }

      showToast(`Successfully copied ${totalSubjectsCreated} subjects & ${totalStrandsCreated} strands into selected academic year!`)
      setShowCopyModal(false)
      await fetchSubjectsAndStrands()
    } catch (err) {
      console.error('Error copying curriculum:', err)
      showToast(err.message || 'Failed to copy curriculum', 'error')
    } finally {
      setCopyingCurriculum(false)
    }
  }

  // SQL Schema Script string for 1-click copy
  const SQL_SCHEMA_STRING = `-- ==============================================================================
-- 1. CREATE JUNCTION TABLE pyp_subject_class
-- Copy & Run in Supabase SQL Editor
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.pyp_subject_class (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    subject_id BIGINT NOT NULL REFERENCES public.pyp_subject(id) ON DELETE CASCADE,
    kelas_id BIGINT NOT NULL REFERENCES public.kelas(kelas_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_pyp_subject_class UNIQUE (subject_id, kelas_id)
);

CREATE INDEX IF NOT EXISTS idx_pyp_subj_class_subj ON public.pyp_subject_class(subject_id);
CREATE INDEX IF NOT EXISTS idx_pyp_subj_class_kelas ON public.pyp_subject_class(kelas_id);

ALTER TABLE public.pyp_subject_class ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to pyp_subject_class" ON public.pyp_subject_class;
CREATE POLICY "Allow read access to pyp_subject_class" ON public.pyp_subject_class FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow full access to pyp_subject_class" ON public.pyp_subject_class;
CREATE POLICY "Allow full access to pyp_subject_class" ON public.pyp_subject_class FOR ALL USING (true) WITH CHECK (true);
`

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_STRING)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 3000)
    showToast('SQL Schema copied to clipboard!')
  }

  const selectedYearObj = years.find(y => String(y.year_id) === String(selectedYearId))
  const selectedClassObj = pypClasses.find(c => String(c.kelas_id) === String(selectedClassId))

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6" style={{ background: theme.bg, color: theme.textPrimary, fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif" }}>
      
      {/* Toast Notification */}
      {toast && (
        <div 
          className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded shadow-lg text-xs font-mono flex items-center gap-2 border animate-in fade-in slide-in-from-top-2"
          style={{
            background: toast.type === 'error' ? (isDark ? '#3E1D22' : '#FDE8E8') : (isDark ? '#1C3326' : '#EDF3EC'),
            borderColor: toast.type === 'error' ? '#F8B4B4' : '#C3E6CB',
            color: toast.type === 'error' ? '#9B1C1C' : '#155724'
          }}
        >
          <FontAwesomeIcon icon={toast.type === 'error' ? faExclamationTriangle : faCheckCircle} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── HEADER & BREADCRUMBS ─────────────────────────────────────────── */}
      <div className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4" style={{ borderColor: theme.border }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: theme.textSecondary }}>
            <span>[CURRICULUM]</span>
            <span>/</span>
            <span>[PYP MASTER DATA]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: theme.blueText }}>[SUBJECTS & STRANDS]</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded flex items-center justify-center border" style={{ background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', borderColor: isDark ? '#2563EB' : '#BAE6FD', color: theme.blueText }}>
              <FontAwesomeIcon icon={faBookOpen} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: theme.textPrimary, letterSpacing: '-0.02em' }}>
                PYP Master Subjects & Strands
              </h1>
              <p className="text-xs" style={{ color: theme.textSecondary }}>
                Manage IB PYP Scope & Sequence subjects and yearly learning strands per academic year and class.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowCopyModal(true)}
            className="px-3 py-1.5 text-xs font-mono font-semibold rounded border transition-colors flex items-center gap-1.5 cursor-pointer"
            style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textPrimary }}
          >
            <FontAwesomeIcon icon={faCopy} />
            <span>Copy from Year</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddSubject}
            className="px-3.5 py-1.5 text-xs font-semibold rounded transition-all flex items-center gap-1.5 cursor-pointer"
            style={{ background: theme.textPrimary, color: theme.cardBg }}
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>Add PYP Subject</span>
          </button>
        </div>
      </div>

      {/* ── DATABASE SETUP NOTICE BANNER (IF TABLE DOES NOT EXIST) ─────────── */}
      {dbSetupNeeded && (
        <div className="p-4 rounded border space-y-3" style={{ background: isDark ? 'rgba(234, 179, 8, 0.1)' : '#FEFCE8', borderColor: isDark ? 'rgba(234, 179, 8, 0.3)' : '#FEF08A' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <FontAwesomeIcon icon={faDatabase} className="text-amber-500 mt-0.5 text-base" />
              <div>
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Database Table Setup Required: <code>pyp_subject_class</code>
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  Tabel <code>pyp_subject_class</code> belum ada di Supabase. Silakan salin dan jalankan script SQL di bawah ini pada <strong>Supabase SQL Editor</strong> agar kelas dapat tersimpan dengan benar.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopySql}
              className="px-3 py-1.5 text-xs font-mono font-bold rounded border transition-colors flex items-center gap-1.5 shrink-0"
              style={{ background: isDark ? '#1F2937' : '#FFFFFF', borderColor: isDark ? '#374151' : '#E5E7EB', color: theme.textPrimary }}
            >
              <FontAwesomeIcon icon={copiedSql ? faCheck : faCopy} className={copiedSql ? 'text-green-500' : ''} />
              <span>{copiedSql ? 'Copied!' : 'Copy SQL Schema'}</span>
            </button>
          </div>
          <pre className="p-3 rounded text-[11px] font-mono overflow-x-auto max-h-48 border" style={{ background: isDark ? '#111827' : '#F9FAFB', borderColor: isDark ? '#374151' : '#E5E7EB', color: isDark ? '#D1D5DB' : '#374151' }}>
            {SQL_SCHEMA_STRING}
          </pre>
        </div>
      )}

      {/* ── FILTER & SEARCH TOOLBAR ────────────────────────────────────────── */}
      <div className="p-3.5 rounded border" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* 1. Academic Year Filter */}
          <div>
            <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: theme.blueText }}>
              1. Academic Year *
            </label>
            <select
              value={selectedYearId}
              onChange={e => {
                setSelectedYearId(e.target.value)
                setSelectedClassId('All')
              }}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer font-bold"
              style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
            >
              {years.map(y => (
                <option key={y.year_id} value={String(y.year_id)}>
                  {y.year_name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Class Filter (Dynamic from /data/class) */}
          <div>
            <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: theme.textSecondary }}>
              2. Class / Kelas
            </label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer font-semibold"
              style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
            >
              <option value="All">All Classes ({availableClasses.length})</option>
              {availableClasses.map(c => (
                <option key={c.kelas_id} value={String(c.kelas_id)}>{c.kelas_nama}</option>
              ))}
            </select>
          </div>

          {/* 3. Search Query */}
          <div className="sm:col-span-2">
            <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: theme.textSecondary }}>
              3. Search Subject or Strand
            </label>
            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
              <input
                type="text"
                placeholder="Search subject name, code, class or strand..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded border outline-none"
                style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
              />
            </div>
          </div>
        </div>

        {/* Counts summary */}
        <div className="mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] font-mono" style={{ borderColor: theme.border, color: theme.textSecondary }}>
          <span>
            Academic Year: <strong>{selectedYearObj?.year_name || 'Selected Year'}</strong> • Showing <strong>{filteredSubjects.length}</strong> subject{filteredSubjects.length !== 1 ? 's' : ''} & <strong>{filteredSubjects.reduce((acc, s) => acc + (strandsBySubjectMap.get(s.id) || []).length, 0)}</strong> strand{filteredSubjects.reduce((acc, s) => acc + (strandsBySubjectMap.get(s.id) || []).length, 0) !== 1 ? 's' : ''}
          </span>
          <span className="text-[10px] uppercase tracking-wider">
            Class Filter: {selectedClassId === 'All' ? 'All Classes' : (selectedClassObj?.kelas_nama || 'Selected Class')}
          </span>
        </div>
      </div>

      {/* ── CONTENT BODY ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center border rounded space-y-2" style={{ borderColor: theme.border, background: theme.cardBg }}>
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl opacity-40" />
          <p className="text-xs font-mono" style={{ color: theme.textSecondary }}>Loading PYP subjects and strands...</p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="p-10 text-center border rounded" style={{ borderColor: theme.border, background: theme.cardBg }}>
          <p className="text-xs font-mono" style={{ color: theme.textSecondary }}>
            No data available
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubjects.map(subject => {
            const subjectStrands = strandsBySubjectMap.get(subject.id) || []
            const isExpanded = expandedSubjects.has(subject.id)
            const classIds = Array.from(classesBySubjectMap.get(subject.id) || [])

            return (
              <div 
                key={subject.id} 
                className="rounded border overflow-hidden transition-shadow" 
                style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}
              >
                {/* Subject Header Row */}
                <div 
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b cursor-pointer select-none"
                  style={{ borderColor: isExpanded ? theme.border : 'transparent', background: theme.subtleBg }}
                  onClick={() => toggleSubjectExpand(subject.id)}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="w-6 h-6 rounded flex items-center justify-center text-xs transition-transform"
                      style={{ color: theme.textSecondary }}
                    >
                      <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} />
                    </button>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold tracking-tight" style={{ color: theme.textPrimary }}>
                          {subject.name}
                        </h3>
                        {subject.code && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E1F3FE] text-[#1F6C9F] border border-[#BDE3FC]">
                            {subject.code}
                          </span>
                        )}

                        {/* Assigned Classes Badges */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {classIds.length === 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                              No classes assigned
                            </span>
                          ) : classIds.length === availableClasses.length && availableClasses.length > 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EDF3EC] text-[#346538] border border-[#D5E6D3]">
                              All {classIds.length} Classes
                            </span>
                          ) : (
                            classIds.map(kid => {
                              const cName = classesByIdMap.get(kid)?.kelas_nama
                              if (!cName) return null
                              return (
                                <span key={kid} className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#EDF3EC] text-[#346538] border border-[#D5E6D3]">
                                  {cName}
                                </span>
                              )
                            })
                          )}
                        </div>

                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold" style={{ background: theme.cardBg, borderColor: theme.border, border: '1px solid' }}>
                          {subjectStrands.length} strand{subjectStrands.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {subject.description && (
                        <p className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>
                          {subject.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions for this Subject */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleOpenAddStrand(subject.id)}
                      className="px-2.5 py-1 text-xs font-mono font-semibold rounded border transition-colors flex items-center gap-1 cursor-pointer"
                      style={{ background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', borderColor: isDark ? '#2563EB' : '#BAE6FD', color: theme.blueText }}
                      title="Add new strand to this subject"
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                      <span>Strand</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditSubject(subject)}
                      className="px-2.5 py-1 text-xs font-mono rounded border transition-colors cursor-pointer"
                      style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textPrimary }}
                      title="Edit Subject"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSubject(subject)}
                      className="px-2.5 py-1 text-xs font-mono rounded border transition-colors cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                      style={{ borderColor: theme.border }}
                      title="Delete Subject"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>

                {/* Strands List Body */}
                {isExpanded && (
                  <div className="p-4 space-y-2.5">
                    {subjectStrands.length === 0 ? (
                      <div className="p-6 text-center border border-dashed rounded text-xs font-mono" style={{ borderColor: theme.border, color: theme.textSecondary }}>
                        <p>No strands configured for this subject in the selected academic year.</p>
                        <button
                          type="button"
                          onClick={() => handleOpenAddStrand(subject.id)}
                          className="mt-2 text-xs font-bold underline cursor-pointer"
                          style={{ color: theme.blueText }}
                        >
                          + Add first strand for {subject.name}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {subjectStrands.map(strand => (
                          <div
                            key={strand.id}
                            className="p-3 rounded border flex flex-col justify-between gap-2 group transition-all"
                            style={{ background: theme.cardBg, borderColor: theme.border }}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold font-mono" style={{ color: theme.textPrimary }}>
                                    {strand.name}
                                  </span>
                                  <span 
                                    className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold"
                                    style={{
                                      background: strand.semester === '2' ? (isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF') : (isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF'),
                                      color: strand.semester === '2' ? (isDark ? '#C4B5FD' : '#6D28D9') : (isDark ? '#93C5FD' : '#1D4ED8'),
                                      border: `1px solid ${strand.semester === '2' ? (isDark ? '#8B5CF6' : '#DDD6FE') : (isDark ? '#3B82F6' : '#BFDBFE')}`
                                    }}
                                  >
                                    {strand.semester === '2' ? 'Sem 2' : strand.semester === 'all' ? 'Sem 1 & 2' : 'Sem 1'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditStrand(strand)}
                                    className="w-6 h-6 rounded flex items-center justify-center text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                                    style={{ color: theme.textSecondary }}
                                    title="Edit Strand"
                                  >
                                    <FontAwesomeIcon icon={faEdit} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStrand(strand)}
                                    className="w-6 h-6 rounded flex items-center justify-center text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    title="Delete Strand"
                                  >
                                    <FontAwesomeIcon icon={faTrash} />
                                  </button>
                                </div>
                              </div>

                              {strand.description && (
                                <p className="text-xs mt-1 leading-relaxed" style={{ color: theme.textSecondary }}>
                                  {strand.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL: ADD / EDIT SUBJECT ──────────────────────────────────────── */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="w-full max-w-lg rounded-lg shadow-xl border overflow-hidden max-h-[90vh] flex flex-col"
            style={{ background: theme.cardBg, borderColor: theme.border }}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: theme.border }}>
              <h3 className="text-sm font-bold font-mono tracking-wider uppercase" style={{ color: theme.textPrimary }}>
                {editingSubject ? 'Edit PYP Subject' : 'Add New PYP Subject'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowSubjectModal(false)}
                className="text-xs font-mono opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="p-5 space-y-4 text-xs font-mono overflow-y-auto">
              <div>
                <label className="block text-[10px] uppercase mb-1 font-bold" style={{ color: theme.textSecondary }}>
                  Academic Year *
                </label>
                <select
                  required
                  value={subjectForm.year_id}
                  onChange={e => {
                    const newYid = e.target.value
                    const newClasses = pypClasses.filter(c => String(c.kelas_year_id) === String(newYid))
                    setSubjectForm({
                      ...subjectForm,
                      year_id: newYid,
                      selected_kelas_ids: newClasses.map(c => Number(c.kelas_id))
                    })
                  }}
                  className="w-full px-3 py-2 text-xs rounded border outline-none cursor-pointer font-bold"
                  style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                >
                  <option value="">Select Academic Year</option>
                  {years.map(y => (
                    <option key={y.year_id} value={String(y.year_id)}>{y.year_name}</option>
                  ))}
                </select>
              </div>

              {/* Multi-Class Checkbox Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] uppercase font-bold" style={{ color: theme.blueText }}>
                    Applicable Classes * ({subjectForm.selected_kelas_ids.length} selected)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllClassesInForm}
                      className="text-[10px] text-blue-500 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-gray-400">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllClassesInForm}
                      className="text-[10px] text-gray-400 hover:underline cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div 
                  className="p-3 rounded border grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto"
                  style={{ background: theme.inputBg, borderColor: theme.border, borderRadius: '4px' }}
                >
                  {formYearClasses.length === 0 ? (
                    <p className="col-span-3 text-[11px] text-gray-400 py-2 text-center">No PYP classes registered for this academic year.</p>
                  ) : (
                    formYearClasses.map(c => {
                      const isChecked = subjectForm.selected_kelas_ids.some(id => Number(id) === Number(c.kelas_id))
                      return (
                        <button
                          type="button"
                          key={c.kelas_id}
                          onClick={() => handleToggleClassInForm(c.kelas_id)}
                          className="flex items-center gap-2 p-2 rounded cursor-pointer select-none transition-all border text-[11px] text-left"
                          style={{
                            background: isChecked ? (isDark ? 'rgba(59, 130, 246, 0.18)' : '#E1F3FE') : (isDark ? '#1F2937' : '#FFFFFF'),
                            borderColor: isChecked ? (isDark ? '#3B82F6' : '#93C5FD') : theme.border,
                            color: isChecked ? theme.blueText : theme.textPrimary
                          }}
                        >
                          <FontAwesomeIcon icon={isChecked ? faCheckSquare : faSquare} className={`text-xs ${isChecked ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 opacity-60'}`} />
                          <span className="font-semibold truncate">{c.kelas_nama}</span>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase mb-1 font-bold" style={{ color: theme.textSecondary }}>
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Language, Mathematics, Arts, Science"
                  value={subjectForm.name}
                  onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded border outline-none"
                  style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase mb-1 font-bold" style={{ color: theme.textSecondary }}>
                    Code / Abbreviation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LANG, MATH"
                    value={subjectForm.code}
                    onChange={e => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded border outline-none"
                    style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase mb-1 font-bold" style={{ color: theme.textSecondary }}>
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={subjectForm.order_index}
                    onChange={e => setSubjectForm({ ...subjectForm, order_index: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded border outline-none"
                    style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase mb-1 font-bold" style={{ color: theme.textSecondary }}>
                  Subject Description / Scope Overview
                </label>
                <textarea
                  rows={3}
                  placeholder="Overview of subject disciplines, inquiry connections, etc."
                  value={subjectForm.description}
                  onChange={e => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded border outline-none"
                  style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2 shrink-0" style={{ borderColor: theme.border }}>
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-3 py-1.5 text-xs rounded border transition-colors"
                  style={{ borderColor: theme.border, color: theme.textPrimary }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSubject}
                  className="px-4 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1.5"
                  style={{ background: theme.textPrimary, color: theme.cardBg }}
                >
                  {savingSubject && <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />}
                  <span>{editingSubject ? 'Save Changes' : 'Create Subject'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD / EDIT STRAND ────────────────────────────────────────── */}
      {showStrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md rounded-lg shadow-xl border overflow-hidden"
            style={{ background: theme.cardBg, borderColor: theme.border }}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
              <h3 className="text-sm font-bold font-mono tracking-wider uppercase" style={{ color: theme.textPrimary }}>
                {editingStrand ? 'Edit Subject Strand' : 'Add Subject Strand'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowStrandModal(false)}
                className="text-xs font-mono opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStrand} className="p-5 space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[10px] uppercase mb-1 font-bold" style={{ color: theme.textSecondary }}>
                  PYP Subject ({selectedYearObj?.year_name}) *
                </label>
                <select
                  required
                  value={strandForm.subject_id}
                  onChange={e => setStrandForm({ ...strandForm, subject_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded border outline-none cursor-pointer"
                  style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                >
                  <option value="">Select Subject</option>
                  {filteredSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `[${s.code}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase mb-1 font-bold" style={{ color: theme.textSecondary }}>
                  Strand Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oral Communication, Number, Living Things"
                  value={strandForm.name}
                  onChange={e => setStrandForm({ ...strandForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded border outline-none"
                  style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase mb-1 font-bold" style={{ color: theme.textSecondary }}>
                  Learning Outcomes / Strand Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Key concepts, learning objectives, and scope expectations..."
                  value={strandForm.description}
                  onChange={e => setStrandForm({ ...strandForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded border outline-none"
                  style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase mb-1 font-bold" style={{ color: theme.textSecondary }}>
                    Semester
                  </label>
                  <select
                    value={strandForm.semester || '1'}
                    onChange={e => setStrandForm({ ...strandForm, semester: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded border outline-none cursor-pointer"
                    style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                  >
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="all">Both Semesters</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase mb-1 font-bold" style={{ color: theme.textSecondary }}>
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={strandForm.order_index}
                    onChange={e => setStrandForm({ ...strandForm, order_index: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded border outline-none"
                    style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2" style={{ borderColor: theme.border }}>
                <button
                  type="button"
                  onClick={() => setShowStrandModal(false)}
                  className="px-3 py-1.5 text-xs rounded border transition-colors"
                  style={{ borderColor: theme.border, color: theme.textPrimary }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStrand}
                  className="px-4 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1.5"
                  style={{ background: theme.textPrimary, color: theme.cardBg }}
                >
                  {savingStrand && <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />}
                  <span>{editingStrand ? 'Save Changes' : 'Create Strand'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: COPY CURRICULUM FROM PREVIOUS YEAR ──────────────────────── */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md rounded-lg shadow-xl border overflow-hidden"
            style={{ background: theme.cardBg, borderColor: theme.border }}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
              <h3 className="text-sm font-bold font-mono tracking-wider uppercase" style={{ color: theme.textPrimary }}>
                Copy Subjects & Strands from Another Year
              </h3>
              <button 
                type="button" 
                onClick={() => setShowCopyModal(false)}
                className="text-xs font-mono opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-mono">
              <p className="text-xs leading-relaxed" style={{ color: theme.textSecondary }}>
                Duplicate all subjects and strands from a source academic year into the target year ({selectedYearObj?.year_name}).
              </p>

              <div>
                <label className="block text-[10px] uppercase mb-1 font-bold" style={{ color: theme.textSecondary }}>
                  Source Academic Year (Copy From) *
                </label>
                <select
                  value={copySourceYearId}
                  onChange={e => setCopySourceYearId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border outline-none cursor-pointer"
                  style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                >
                  <option value="">Select Source Year</option>
                  {years.filter(y => String(y.year_id) !== String(selectedYearId)).map(y => (
                    <option key={y.year_id} value={String(y.year_id)}>{y.year_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase mb-1 font-bold" style={{ color: theme.textSecondary }}>
                  Target Academic Year (Copy To)
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedYearObj?.year_name || 'Selected Target Year'}
                  className="w-full px-3 py-2 text-xs rounded border outline-none font-bold opacity-80"
                  style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2" style={{ borderColor: theme.border }}>
                <button
                  type="button"
                  onClick={() => setShowCopyModal(false)}
                  className="px-3 py-1.5 text-xs rounded border transition-colors"
                  style={{ borderColor: theme.border, color: theme.textPrimary }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!copySourceYearId || copyingCurriculum}
                  onClick={handleCopyCurriculumFromYear}
                  className="px-4 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1.5 disabled:opacity-50"
                  style={{ background: theme.textPrimary, color: theme.cardBg }}
                >
                  {copyingCurriculum && <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />}
                  <span>Start Copy</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
