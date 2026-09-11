'use client'

import React, { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTimes,
  faSave,
  faFilePdf,
  faWandMagicSparkles,
  faChevronDown,
  faChevronUp,
  faCheck,
  faInfoCircle,
  faSpinner,
  faArrowLeft,
  faArrowRight,
  faLayerGroup,
  faBookOpen,
  faFileLines,
} from '@fortawesome/free-solid-svg-icons'

/**
 * UnitPlannerDocumentEditor
 * 
 * 100% WYSIWYG IB MYP Editor supporting both:
 * 1. Unit Planner Document (Landscape A4)
 *    - Page 1: Overview Table & Inquiry Table (Image 1)
 *    - Page 2: Assessment Overview (Image 2: MYP objectives, Summative assessment, Connections with GC)
 *    - Page 3: Action & Reflection (ATL, Content & Learning Process, Resources, Reflection)
 * 2. Assessment Task Sheet & Rubrics (Portrait A4)
 *    - Official Portrait printout with Header, Result box, Info table, Task Overview, Instructions,
 *      and SUBJECT CRITERIA AND TASK-SPECIFIC CLARIFICATION (Rubric Matrix).
 */
export default function UnitPlannerDocumentEditor({
  isOpen,
  onClose,
  isAddMode,
  // Topic state & setter
  selectedTopic,
  setSelectedTopic,
  // Assessment state & setter
  wizardAssessment,
  setWizardAssessment,
  wizardCriteria = [],
  wizardStrands = [],
  wizardRubrics = [],
  loadingStrands = false,
  // Dropdown options & data lists
  subjects = [],
  allKelas = [],
  allKelasRaw = [],
  yearOptions = [],
  wizardYear,
  onWizardYearChange,
  onKelasChange,
  subjectsForSelectedKelas = [],
  keyConcepts = [],
  globalContexts = [],
  globalContextExplorations = {},
  learnerProfiles = [],
  // Save & Export handlers
  saving = false,
  onSave,
  onExportPDF,
  onExportAssessmentPDF,
  // AI Help handlers
  aiLoading = false,
  openAiInputModal,
  requestAiHelp,
  requestAiHelpAtl,
  requestAiHelpTSC,
  // Criteria & Strand fetchers
  fetchCriteriaForSubject,
  fetchStrandsForCriteria,
  // i18n & Theme
  t = (k) => k,
  isDark = false,
  theme = {},
}) {
  // Document Mode: 'planner' (Landscape A4) | 'assessment' (Portrait A4)
  const [activeDoc, setActiveDoc] = useState('planner')
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'p1' | 'p2' | 'p3'
  const [inquiryMode, setInquiryMode] = useState('categorized') // 'categorized' | 'raw'
  const [keyConceptDropdownOpen, setKeyConceptDropdownOpen] = useState(false)
  const [validationErrors, setValidationErrors] = useState([])

  const page1Ref = useRef(null)
  const page2Ref = useRef(null)
  const page3Ref = useRef(null)

  // Ensure criteria are loaded when subject is set
  useEffect(() => {
    if (selectedTopic?.topic_subject_id && (!wizardCriteria || wizardCriteria.length === 0) && fetchCriteriaForSubject) {
      fetchCriteriaForSubject(selectedTopic.topic_subject_id)
    }
  }, [selectedTopic?.topic_subject_id])

  // Ensure strands are loaded when criteria and year are present
  useEffect(() => {
    if (
      wizardAssessment?.selected_criteria?.length > 0 &&
      selectedTopic?.topic_year &&
      (!wizardStrands || wizardStrands.length === 0) &&
      fetchStrandsForCriteria
    ) {
      fetchStrandsForCriteria(wizardAssessment.selected_criteria, selectedTopic.topic_year)
    }
  }, [wizardAssessment?.selected_criteria, selectedTopic?.topic_year])

  // Jump to specific page
  const scrollToPage = (tab) => {
    setActiveTab(tab)
    if (tab === 'p1' && page1Ref.current) page1Ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (tab === 'p2' && page2Ref.current) page2Ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (tab === 'p3' && page3Ref.current) page3Ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Auto-resize textarea helper
  const handleAutoResize = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.max(45, e.target.scrollHeight)}px`
  }

  // Parse inquiry questions into Factual, Conceptual, Debatable
  const parseInquiryQuestions = (text = '') => {
    let factual = ''
    let conceptual = ''
    let debatable = ''

    if (!text) return { factual, conceptual, debatable }

    const factualMatch = text.match(/Factual:\s*([\s\S]*?)(?=(?:\r?\n\r?\n)?(?:Conceptual:|Debatable:|$))/i)
    const conceptualMatch = text.match(/Conceptual:\s*([\s\S]*?)(?=(?:\r?\n\r?\n)?(?:Factual:|Debatable:|$))/i)
    const debatableMatch = text.match(/Debatable:\s*([\s\S]*?)(?=(?:\r?\n\r?\n)?(?:Factual:|Conceptual:|$))/i)

    if (factualMatch || conceptualMatch || debatableMatch) {
      factual = factualMatch ? factualMatch[1].trim() : ''
      conceptual = conceptualMatch ? conceptualMatch[1].trim() : ''
      debatable = debatableMatch ? debatableMatch[1].trim() : ''
    } else {
      factual = text
    }

    return { factual, conceptual, debatable }
  }

  // Local state for smooth multi-line typing without regex trim mangling newlines
  const [inquiryParts, setInquiryParts] = useState(() => parseInquiryQuestions(selectedTopic?.topic_inquiry_question || ''))
  const lastTopicInquiryRef = useRef(selectedTopic?.topic_inquiry_question)

  useEffect(() => {
    if (selectedTopic?.topic_inquiry_question !== lastTopicInquiryRef.current) {
      lastTopicInquiryRef.current = selectedTopic?.topic_inquiry_question
      setInquiryParts(parseInquiryQuestions(selectedTopic?.topic_inquiry_question || ''))
    }
  }, [selectedTopic?.topic_inquiry_question])

  const handleInquiryPartChange = (part, value) => {
    const nextParts = { ...inquiryParts, [part]: value }
    setInquiryParts(nextParts)

    const parts = []
    if (nextParts.factual) parts.push(`Factual:\n${nextParts.factual}`)
    if (nextParts.conceptual) parts.push(`Conceptual:\n${nextParts.conceptual}`)
    if (nextParts.debatable) parts.push(`Debatable:\n${nextParts.debatable}`)
    const combined = parts.join('\n\n')
    lastTopicInquiryRef.current = combined
    setSelectedTopic(prev => ({ ...prev, topic_inquiry_question: combined }))
  }

  // Single Key Concept helper (Strictly 1 Key Concept per IB MYP unit)
  const selectedKeyConcept = selectedTopic?.topic_key_concept
    ? selectedTopic.topic_key_concept.split(',')[0].trim()
    : ''

  const handleSelectKeyConcept = (kc) => {
    setSelectedTopic(prev => ({ ...prev, topic_key_concept: kc }))
    setKeyConceptDropdownOpen(false)
  }

  // Toggle Assessed Criterion
  const toggleCriterion = (criterionId) => {
    const current = wizardAssessment?.selected_criteria || []
    const next = current.includes(criterionId)
      ? current.filter(id => id !== criterionId)
      : [...current, criterionId]

    setWizardAssessment(prev => ({ ...prev, selected_criteria: next }))

    if (fetchStrandsForCriteria && selectedTopic?.topic_year) {
      fetchStrandsForCriteria(next, selectedTopic.topic_year)
    }
  }

  // Validation before saving
  const handleValidateAndSave = (isDraft = false) => {
    const errors = []
    if (!selectedTopic?.topic_nama?.trim()) errors.push('Unit Title is required')
    if (!selectedTopic?.topic_kelas_id) errors.push('Class is required')
    if (!selectedTopic?.topic_subject_id) errors.push('Subject is required')
    if (!selectedTopic?.topic_year) errors.push('MYP Year is required')

    if (errors.length > 0 && !isDraft) {
      setValidationErrors(errors)
      setActiveDoc('planner')
      scrollToPage('p1')
      return
    }

    setValidationErrors([])
    onSave(isDraft)
  }

  // Current Subject and Class objects
  const currentSubject = subjects.find(s => String(s.subject_id) === String(selectedTopic?.topic_subject_id))
  const currentKelas = (allKelasRaw || []).find(k => String(k.kelas_id) === String(selectedTopic?.topic_kelas_id))
  const teacherName = currentKelas?.teacher_name || (typeof window !== 'undefined' ? localStorage.getItem('user_nama') : '') || 'Hans Kristian Wijaya'
  const subjectName = currentSubject?.subject_name || 'Design'
  const kelasName = currentKelas?.kelas_nama || 'MYP 1'
  const unitName = selectedTopic?.topic_urutan ? `Unit ${selectedTopic.topic_urutan}` : (selectedTopic?.topic_nama || 'Unit 1')

  if (!isOpen || !selectedTopic) return null

  // Group strands by criterion
  const topicYearNum = Number(selectedTopic.topic_year) || 1
  const selectedCriteriaList = (wizardCriteria || []).filter(c => 
    (wizardAssessment?.selected_criteria || []).includes(c.criterion_id)
  )
  const selectedCriteriaCodes = selectedCriteriaList.map(c => c.code).join('/') || 'A/B/C/D'
  const proficiencyLevel = selectedTopic.topic_year ? `Phase ${selectedTopic.topic_year}` : 'Phase 1'

  const bandLevels = ['7-8', '5-6', '3-4', '1-2']

  return (
    <div className="fixed inset-0 z-50 bg-[#525659] overflow-y-auto flex flex-col font-[Arial,Helvetica,sans-serif]">
      {/* ─── STICKY TOP TOOLBAR (WYSIWYG BAR) ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 py-2 bg-[#2D3134] text-white border-b border-[#1E2124] shadow-md select-none">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-stone-700 hover:bg-stone-600 text-stone-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Exit Editor"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="min-w-0 flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-400/30">
              {isAddMode ? 'NEW UNIT PLAN' : 'IB UNIT PLANNER'}
            </span>
            <span className="text-xs font-semibold text-stone-200 truncate max-w-xs sm:max-w-sm">
              {selectedTopic.topic_nama || 'Untitled Unit'}
            </span>
          </div>
        </div>

        {/* Center: Document Mode & Page Navigation */}
        <div className="flex items-center gap-1 bg-[#1E2124] p-1 rounded-md text-xs">
          {/* Main Document Switcher */}
          <button
            type="button"
            onClick={() => setActiveDoc('planner')}
            className={`px-3 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeDoc === 'planner'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
            }`}
          >
            <FontAwesomeIcon icon={faBookOpen} className="text-[10px]" />
            <span>Unit Planner (Landscape)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDoc('assessment')}
            className={`px-3 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeDoc === 'assessment'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
            }`}
          >
            <FontAwesomeIcon icon={faFileLines} className="text-[10px]" />
            <span>Assessment Sheet (Portrait)</span>
          </button>

          {/* Sub-tabs for Landscape Unit Planner */}
          {activeDoc === 'planner' && (
            <div className="hidden lg:flex items-center border-l border-stone-600 pl-1 ml-1 gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => scrollToPage('all')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${activeTab === 'all' ? 'bg-stone-700 text-white font-bold' : 'text-stone-400 hover:text-white'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => scrollToPage('p1')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${activeTab === 'p1' ? 'bg-stone-700 text-white font-bold' : 'text-stone-400 hover:text-white'}`}
              >
                Page 1
              </button>
              <button
                type="button"
                onClick={() => scrollToPage('p2')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${activeTab === 'p2' ? 'bg-stone-700 text-white font-bold' : 'text-stone-400 hover:text-white'}`}
              >
                Page 2
              </button>
              <button
                type="button"
                onClick={() => scrollToPage('p3')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${activeTab === 'p3' ? 'bg-stone-700 text-white font-bold' : 'text-stone-400 hover:text-white'}`}
              >
                Page 3
              </button>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Export button contextual to active document */}
          {activeDoc === 'planner' && onExportPDF && (
            <button
              type="button"
              onClick={onExportPDF}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-stone-700 hover:bg-stone-600 text-stone-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Export Official IB Unit Planner (Landscape PDF)"
            >
              <FontAwesomeIcon icon={faFilePdf} className="text-red-400" />
              <span className="hidden sm:inline">Print Unit Planner</span>
            </button>
          )}

          {activeDoc === 'assessment' && onExportAssessmentPDF && (
            <button
              type="button"
              onClick={onExportAssessmentPDF}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-purple-700 hover:bg-purple-600 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Export Official Assessment Task Sheet (Portrait PDF)"
            >
              <FontAwesomeIcon icon={faFilePdf} className="text-white" />
              <span className="hidden sm:inline">Print Assessment</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleValidateAndSave(true)}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-stone-700 hover:bg-stone-600 text-stone-200 transition-colors disabled:opacity-50 cursor-pointer hidden sm:inline"
          >
            Save Draft
          </button>

          <button
            type="button"
            onClick={() => handleValidateAndSave(false)}
            disabled={saving}
            className="px-4 py-1.5 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-500 shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="text-xs" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} className="text-xs" />
                <span>Save Unit Plan</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Validation Banner */}
      {validationErrors.length > 0 && (
        <div className="max-w-[1100px] mx-auto w-full px-4 pt-4">
          <div className="p-3 text-xs bg-red-100 border border-red-400 text-red-900 rounded flex items-start justify-between gap-3 shadow">
            <div>
              <strong className="font-bold flex items-center gap-1.5 mb-1">
                <FontAwesomeIcon icon={faInfoCircle} />
                Please complete the following required fields:
              </strong>
              <ul className="list-disc list-inside pl-1 text-[11px] space-y-0.5">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setValidationErrors([])}
              className="text-red-700 hover:text-red-900 text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ─── DOCUMENT CANVAS ─────────────────────────────────────────────────── */}
      <main className="flex-1 w-full py-8 px-2 sm:px-6 space-y-12">

        {/* ══════════════════════════════════════════════════════════════════════
            MODE A: UNIT PLANNER (LANDSCAPE A4 SHEETS)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeDoc === 'planner' && (
          <>
            {/* ────── PAGE 1: OVERVIEW & INQUIRY (IMAGE 1) ────── */}
            <section
              ref={page1Ref}
              style={{ display: activeTab === 'all' || activeTab === 'p1' ? 'block' : 'none' }}
              className="bg-white text-black shadow-2xl border border-gray-400 p-8 sm:p-12 max-w-[1100px] w-full mx-auto font-[Arial,Helvetica,sans-serif]"
            >
              <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mb-4 border-b pb-1">
                <span>MYP UNIT PLANNER — PAGE 1</span>
                <span className="uppercase">Section: Inquiry</span>
              </div>

              {/* TABLE 1: HEADER TABLE */}
              <table className="w-full border-collapse border border-black text-[12px] mb-4">
                <tbody>
                  {/* Row 1: Teacher(s) & Subject groups */}
                  <tr>
                    <td className="w-[15%] bg-[#E8E8E8] font-bold border border-black px-2.5 py-1.5 align-middle">
                      Teacher(s)
                    </td>
                    <td className="w-[40%] border border-black px-2.5 py-1.5 align-middle">
                      <div className="font-semibold text-black">{teacherName}</div>
                    </td>
                    <td className="w-[15%] bg-[#E8E8E8] font-bold border border-black px-2.5 py-1.5 align-middle">
                      Subject groups
                    </td>
                    <td className="w-[30%] border border-black px-2.5 py-1.5 align-middle" colSpan={3}>
                      <select
                        value={selectedTopic.topic_subject_id || ''}
                        onChange={(e) => {
                          const sid = e.target.value
                          setSelectedTopic(prev => ({ ...prev, topic_subject_id: sid }))
                          if (sid && fetchCriteriaForSubject) fetchCriteriaForSubject(sid)
                        }}
                        className="w-full bg-transparent font-semibold text-black outline-none cursor-pointer hover:bg-yellow-50 focus:bg-white"
                      >
                        <option value="">-- Select Subject Group --</option>
                        {(subjectsForSelectedKelas.length > 0 ? subjectsForSelectedKelas : subjects).map(s => (
                          <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>

                  {/* Row 2: Unit title, MYP year, Unit duration */}
                  <tr>
                    <td className="w-[15%] bg-[#E8E8E8] font-bold border border-black px-2.5 py-1.5 align-middle">
                      Unit title
                    </td>
                    <td className="w-[40%] border border-black px-2.5 py-1.5 align-middle">
                      <input
                        type="text"
                        value={selectedTopic.topic_nama || ''}
                        onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_nama: e.target.value }))}
                        placeholder="Enter unit title (e.g. What role might our classroom walls play in our learning?)"
                        className="w-full bg-transparent font-bold text-black outline-none hover:bg-yellow-50 focus:bg-white placeholder:font-normal placeholder:text-gray-400"
                      />
                    </td>
                    <td className="w-[15%] bg-[#E8E8E8] font-bold border border-black px-2.5 py-1.5 align-middle">
                      MYP year
                    </td>
                    <td className="w-[12%] border border-black px-2.5 py-1.5 align-middle">
                      <select
                        value={selectedTopic.topic_year || ''}
                        onChange={(e) => {
                          const yr = e.target.value
                          setSelectedTopic(prev => ({ ...prev, topic_year: yr }))
                          if (fetchStrandsForCriteria && wizardAssessment?.selected_criteria?.length > 0) {
                            fetchStrandsForCriteria(wizardAssessment.selected_criteria, yr)
                          }
                        }}
                        className="w-full bg-transparent font-semibold text-black outline-none cursor-pointer hover:bg-yellow-50 focus:bg-white"
                      >
                        <option value="">Year</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                      </select>
                    </td>
                    <td className="w-[11%] bg-[#E8E8E8] font-bold border border-black px-2.5 py-1.5 align-middle">
                      Unit duration
                    </td>
                    <td className="w-[7%] border border-black px-2.5 py-1.5 align-middle">
                      <input
                        type="text"
                        value={selectedTopic.topic_duration || ''}
                        onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_duration: e.target.value }))}
                        placeholder="14"
                        className="w-full bg-transparent text-center font-semibold text-black outline-none hover:bg-yellow-50 focus:bg-white"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Subtitle paragraph below Table 1 */}
              <p className="text-[12px] text-black my-3 leading-normal">
                Inquiry: The &quot;Inquiry&quot; section of the MYP unit planner identifies the purpose of the unit to ensure its alignment with MYP philosophy and requirements
              </p>

              {/* TABLE 2: INQUIRY TABLE */}
              <table className="w-full border-collapse border border-black text-[12px]">
                <tbody>
                  {/* Row 1: Headers */}
                  <tr>
                    <th className="w-[30%] bg-[#E8E8E8] font-bold text-left border border-black px-2.5 py-2">
                      Key concept
                    </th>
                    <th className="w-[31%] bg-[#E8E8E8] font-bold text-left border border-black px-2.5 py-2">
                      Related concept(s)
                    </th>
                    <th className="w-[39%] bg-[#E8E8E8] font-bold text-left border border-black px-2.5 py-2">
                      Global context (and exploration)
                    </th>
                  </tr>

                  {/* Row 2: Content */}
                  <tr>
                    {/* Col 1: Key Concept (Single select) */}
                    <td className="border border-black p-2.5 align-top">
                      <div className="space-y-1.5">
                        {selectedKeyConcept ? (
                          <div className="font-bold text-black text-[12px]">
                            {selectedKeyConcept}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No key concept selected</span>
                        )}

                        <div className="relative pt-1">
                          <button
                            type="button"
                            onClick={() => setKeyConceptDropdownOpen(prev => !prev)}
                            className="text-[10px] text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>[ Choose Key Concept ]</span>
                            <FontAwesomeIcon icon={keyConceptDropdownOpen ? faChevronUp : faChevronDown} className="text-[8px]" />
                          </button>

                          {keyConceptDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-60 p-2 bg-white border border-gray-400 shadow-xl z-30 max-h-56 overflow-y-auto space-y-1 text-xs">
                              {selectedKeyConcept && (
                                <div
                                  onClick={() => handleSelectKeyConcept('')}
                                  className="px-2 py-1 rounded cursor-pointer text-gray-500 hover:bg-gray-100 italic border-b pb-1 mb-1 text-[11px]"
                                >
                                  -- Clear Selection --
                                </div>
                              )}
                              {(keyConcepts || []).map((kc, i) => {
                                const name = typeof kc === 'string' ? kc : (kc.concept_name || kc.name || '')
                                const isSel = selectedKeyConcept === name
                                return (
                                  <div
                                    key={i}
                                    onClick={() => handleSelectKeyConcept(name)}
                                    className={`px-2 py-1 rounded cursor-pointer flex items-center justify-between ${
                                      isSel ? 'bg-gray-200 font-bold text-black' : 'hover:bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    <span>{name}</span>
                                    {isSel && <FontAwesomeIcon icon={faCheck} className="text-xs text-green-700" />}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Col 2: Related concept(s) */}
                    <td className="border border-black p-2.5 align-top">
                      <textarea
                        value={selectedTopic.topic_related_concept || ''}
                        onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_related_concept: e.target.value }))}
                        onInput={handleAutoResize}
                        placeholder="Enter related concepts (e.g. Evaluation, Function, Innovation)"
                        rows={3}
                        className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white"
                      />
                    </td>

                    {/* Col 3: Global context (and exploration) */}
                    <td className="border border-black p-2.5 align-top">
                      <div className="space-y-2">
                        <select
                          value={selectedTopic.topic_global_context || ''}
                          onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_global_context: e.target.value }))}
                          className="w-full bg-transparent font-semibold text-black outline-none cursor-pointer border-b border-gray-300 pb-1 hover:bg-yellow-50 focus:bg-white"
                        >
                          <option value="">-- Select Global Context --</option>
                          {(globalContexts || []).map((gc, i) => {
                            const name = typeof gc === 'string' ? gc : (gc.gc_name || gc.name || '')
                            return (
                              <option key={i} value={name}>{name}</option>
                            )
                          })}
                        </select>

                        <div>
                          <span className="text-[11px] font-bold text-gray-700 block">Possible exploration:</span>
                          {selectedTopic.topic_global_context && (globalContextExplorations?.[selectedTopic.topic_global_context] || []).length > 0 && (
                            <select
                              value={selectedTopic.topic_gc_exploration || ''}
                              onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_gc_exploration: e.target.value }))}
                              className="w-full bg-transparent text-[11px] text-gray-800 outline-none cursor-pointer border-b border-gray-300 pb-1 mb-1"
                            >
                              <option value="">-- Choose suggested exploration --</option>
                              {(globalContextExplorations[selectedTopic.topic_global_context] || []).map((exp, eIdx) => (
                                <option key={eIdx} value={exp}>{exp}</option>
                              ))}
                            </select>
                          )}
                          <input
                            type="text"
                            value={selectedTopic.topic_gc_exploration || ''}
                            onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_gc_exploration: e.target.value }))}
                            placeholder="e.g. Motivations"
                            className="w-full bg-transparent text-black outline-none hover:bg-yellow-50 focus:bg-white"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Row 3: Statement of inquiry Header */}
                  <tr>
                    <th colSpan={3} className="bg-[#E8E8E8] font-bold text-left border border-black px-2.5 py-1.5">
                      <div className="flex items-center justify-between">
                        <span>Statement of inquiry</span>
                        {requestAiHelp && (
                          <button
                            type="button"
                            onClick={() => requestAiHelp('statement')}
                            disabled={aiLoading}
                            className="text-[11px] text-purple-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[10px]" />
                            <span>AI Suggest SOI</span>
                          </button>
                        )}
                      </div>
                    </th>
                  </tr>

                  {/* Row 4: Statement of inquiry Content */}
                  <tr>
                    <td colSpan={3} className="border border-black p-2.5 align-top">
                      <textarea
                        value={selectedTopic.topic_statement || ''}
                        onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_statement: e.target.value }))}
                        onInput={handleAutoResize}
                        placeholder="We must evaluate the role played by individual parts of the systems we belong to, if we hope to improve them."
                        rows={3}
                        className="w-full bg-transparent text-black font-medium outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white"
                      />
                    </td>
                  </tr>

                  {/* Row 5: Inquiry questions Header */}
                  <tr>
                    <th colSpan={3} className="bg-[#E8E8E8] font-bold text-left border border-black px-2.5 py-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <span>Inquiry questions</span>
                          {/* Mode Switcher: Categorized vs Raw Document */}
                          <div className="flex items-center text-[10px] font-normal gap-0.5 bg-white border border-gray-400 rounded p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setInquiryMode('categorized')}
                              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                                inquiryMode === 'categorized'
                                  ? 'bg-black text-white font-bold'
                                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
                              }`}
                            >
                              Categorized
                            </button>
                            <button
                              type="button"
                              onClick={() => setInquiryMode('raw')}
                              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                                inquiryMode === 'raw'
                                  ? 'bg-black text-white font-bold'
                                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
                              }`}
                            >
                              Raw Document
                            </button>
                          </div>
                        </div>

                        {requestAiHelp && (
                          <button
                            type="button"
                            onClick={() => requestAiHelp('inquiry_question')}
                            disabled={aiLoading}
                            className="text-[11px] text-purple-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[10px]" />
                            <span>AI Suggest Questions</span>
                          </button>
                        )}
                      </div>
                    </th>
                  </tr>

                  {/* Row 6: Inquiry questions Content */}
                  <tr>
                    <td colSpan={3} className="border border-black p-3 align-top">
                      {inquiryMode === 'raw' ? (
                        <div>
                          <textarea
                            value={selectedTopic.topic_inquiry_question || ''}
                            onChange={(e) => {
                              const val = e.target.value
                              lastTopicInquiryRef.current = val
                              setSelectedTopic(prev => ({ ...prev, topic_inquiry_question: val }))
                              setInquiryParts(parseInquiryQuestions(val))
                            }}
                            onInput={handleAutoResize}
                            rows={Math.max(6, (selectedTopic.topic_inquiry_question || '').split('\n').length)}
                            placeholder="Factual:\nWhat is the third teacher?\nWhat posters exist in our current learning environment?\n\nConceptual:\nHow might the appearance of the space we learn in change the way we learn?\n\nDebatable:\nDoes an effective learning environment need effective displays?"
                            className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white text-[12px] min-h-[140px] font-sans"
                          />
                          <span className="text-[10px] text-gray-500 block pt-1 border-t border-gray-200">
                            Type freely using <strong>Factual:</strong>, <strong>Conceptual:</strong>, and <strong>Debatable:</strong> headers.
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <div className="font-bold text-black mb-0.5">Factual:</div>
                            <textarea
                              value={inquiryParts.factual || ''}
                              onChange={(e) => handleInquiryPartChange('factual', e.target.value)}
                              onInput={handleAutoResize}
                              placeholder="What is the third teacher?\nWhat posters exist in our current learning environment? How do we use our classroom posters?"
                              rows={Math.max(2, (inquiryParts.factual || '').split('\n').length)}
                              className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white text-[12px] min-h-[45px]"
                            />
                          </div>

                          <div>
                            <div className="font-bold text-black mb-0.5">Conceptual:</div>
                            <textarea
                              value={inquiryParts.conceptual || ''}
                              onChange={(e) => handleInquiryPartChange('conceptual', e.target.value)}
                              onInput={handleAutoResize}
                              placeholder="How might the appearance of the space we learn in change the way we learn?\nHow do visuals help us learn?"
                              rows={Math.max(2, (inquiryParts.conceptual || '').split('\n').length)}
                              className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white text-[12px] min-h-[45px]"
                            />
                          </div>

                          <div>
                            <div className="font-bold text-black mb-0.5">Debatable:</div>
                            <textarea
                              value={inquiryParts.debatable || ''}
                              onChange={(e) => handleInquiryPartChange('debatable', e.target.value)}
                              onInput={handleAutoResize}
                              placeholder="Does an effective learning environment need effective displays?"
                              rows={Math.max(2, (inquiryParts.debatable || '').split('\n').length)}
                              className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white text-[12px] min-h-[45px]"
                            />
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* ────── PAGE 2: ASSESSMENT OVERVIEW (IMAGE 2) ────── */}
            <section
              ref={page2Ref}
              style={{ display: activeTab === 'all' || activeTab === 'p2' ? 'block' : 'none' }}
              className="bg-white text-black shadow-2xl border border-gray-400 p-8 sm:p-12 max-w-[1100px] w-full mx-auto font-[Arial,Helvetica,sans-serif]"
            >
              <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mb-4 border-b pb-1">
                <span>MYP UNIT PLANNER — PAGE 2</span>
                <span className="uppercase">Section: Assessment Overview</span>
              </div>

              {/* TABLE: ASSESSMENT OVERVIEW (EXACT MATCH TO IMAGE 2) */}
              <table className="w-full border-collapse border border-black text-[12px]">
                <thead>
                  <tr>
                    <th className="w-[31%] bg-[#E8E8E8] font-bold text-left border border-black px-2.5 py-2">
                      <div className="flex items-center justify-between">
                        <span>MYP objectives</span>
                        {loadingStrands && <FontAwesomeIcon icon={faSpinner} spin className="text-xs text-blue-600" />}
                      </div>
                    </th>
                    <th colSpan={2} className="w-[69%] bg-[#E8E8E8] font-bold text-left border border-black px-2.5 py-2">
                      Summative assessment
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {/* Col 1: MYP objectives & strands */}
                    <td className="w-[31%] border border-black p-2.5 align-top space-y-4">
                      {/* Interactive Criteria Toggle Pills */}
                      <div className="p-1.5 bg-gray-100 border border-gray-300 rounded mb-2">
                        <span className="text-[10px] font-bold uppercase text-gray-600 block mb-1">Select Criteria to Assess:</span>
                        <div className="flex flex-wrap gap-1">
                          {(wizardCriteria || []).map(crit => {
                            const isSelected = (wizardAssessment?.selected_criteria || []).includes(crit.criterion_id)
                            const code = crit.code || crit.name?.charAt(0) || 'Crit'
                            return (
                              <button
                                key={crit.criterion_id}
                                type="button"
                                onClick={() => toggleCriterion(crit.criterion_id)}
                                className={`px-2 py-0.5 text-xs font-bold rounded border transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-black text-white border-black shadow-xs'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-200'
                                }`}
                                title={crit.name || ''}
                              >
                                {code}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Dynamic Rendered Strands (Image 2 style) */}
                      {selectedCriteriaList.length > 0 ? (
                        selectedCriteriaList.map(crit => {
                          const cStrands = (wizardStrands || []).filter(s => s.criterion_id === crit.criterion_id)
                          let matched = cStrands.filter(s => Number(s.year_level) === topicYearNum)
                          if (matched.length === 0 && cStrands.length > 0) matched = cStrands

                          return (
                            <div key={crit.criterion_id} className="space-y-1">
                              <div className="font-bold text-black text-[12px]">
                                {crit.code} - {crit.name}
                              </div>
                              <div className="space-y-0.5 text-[11px] leading-snug text-black">
                                {matched.map((s, idx) => (
                                  <div key={s.strand_id || idx} className="pl-1">
                                    <span className="font-medium">{s.label ? `${s.label} ` : ''}</span>
                                    <span>{s.content}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-gray-400 italic text-xs py-4 text-center">
                          Please select criteria above to display MYP objectives and strands.
                        </div>
                      )}
                    </td>

                    {/* Col 2: Summative assessment task & instructions */}
                    <td className="w-[35%] border border-black p-2.5 align-top space-y-2">
                      <div>
                        <div className="font-bold text-black mb-1">
                          Task:
                        </div>
                        <input
                          type="text"
                          value={wizardAssessment?.assessment_nama || ''}
                          onChange={(e) => setWizardAssessment(prev => ({ ...prev, assessment_nama: e.target.value }))}
                          placeholder="e.g. PREPARING TO CREATE YOUR LEARNING WALL POSTER"
                          className="w-full bg-transparent font-bold text-black uppercase outline-none border-b border-gray-300 pb-1 hover:bg-yellow-50 focus:bg-white text-[12px]"
                        />
                      </div>

                      <textarea
                        value={wizardAssessment?.assessment_task_specific_description || wizardAssessment?.assessment_instructions || ''}
                        onChange={(e) => setWizardAssessment(prev => ({
                          ...prev,
                          assessment_task_specific_description: e.target.value,
                          assessment_instructions: e.target.value,
                        }))}
                        onInput={handleAutoResize}
                        placeholder="You will present the preliminary research highlights of your poster project which include:\n- identifying the need for the poster in your classroom (literacy skill)\n- planning of the research (self-management skill)\n- analysis of existing product (critical thinking skill)\n- presentation of the research findings (communication skill)"
                        rows={12}
                        className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white text-[12px]"
                      />
                    </td>

                    {/* Col 3: Connections with Global Context (with red fallback) */}
                    <td className="w-[34%] border border-black p-2.5 align-top space-y-2">
                      <div className="font-bold text-black">
                        Connections with the Global Context:
                      </div>

                      <textarea
                        value={selectedTopic.topic_connections_global_context || ''}
                        onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_connections_global_context: e.target.value }))}
                        onInput={handleAutoResize}
                        placeholder="Enter how students will make connections with the global context through this assessment..."
                        rows={10}
                        className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white text-[12px]"
                      />

                      {(!selectedTopic.topic_connections_global_context || !selectedTopic.topic_connections_global_context.trim()) && (
                        <div className="font-bold text-red-600 text-[11px] pt-2">
                          Not filled yet - You can fill this here or in Step 3
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* ────── PAGE 3: ACTION & REFLECTION ────── */}
            <section
              ref={page3Ref}
              style={{ display: activeTab === 'all' || activeTab === 'p3' ? 'block' : 'none' }}
              className="bg-white text-black shadow-2xl border border-gray-400 p-8 sm:p-12 max-w-[1100px] w-full mx-auto font-[Arial,Helvetica,sans-serif]"
            >
              <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mb-4 border-b pb-1">
                <span>MYP UNIT PLANNER — PAGE 3</span>
                <span className="uppercase">Section: Action & Reflection</span>
              </div>

              {/* TABLE: ATL */}
              <table className="w-full border-collapse border border-black text-[12px] mb-4">
                <thead>
                  <tr>
                    <th className="bg-[#E8E8E8] font-bold text-left border border-black px-2.5 py-1.5">
                      <div className="flex items-center justify-between">
                        <span>Approaches to learning (ATL)</span>
                        {requestAiHelpAtl && (
                          <button
                            type="button"
                            onClick={requestAiHelpAtl}
                            disabled={aiLoading}
                            className="text-[11px] text-purple-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[10px]" />
                            <span>AI Suggest ATL</span>
                          </button>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2.5 align-top">
                      <textarea
                        value={selectedTopic.topic_atl || ''}
                        onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_atl: e.target.value }))}
                        onInput={handleAutoResize}
                        placeholder="Enter ATL skills, categories, clusters, and specific indicators targeted in this unit..."
                        rows={4}
                        className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* TABLE: CONTENT & LEARNING PROCESS */}
              <table className="w-full border-collapse border border-black text-[12px] mb-4">
                <thead>
                  <tr>
                    <th className="w-[33%] bg-[#E8E8E8] font-bold text-left border border-black px-2.5 py-1.5">
                      Content
                    </th>
                    <th className="w-[67%] bg-[#E8E8E8] font-bold text-left border border-black px-2.5 py-1.5">
                      Learning process
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td rowSpan={3} className="w-[33%] border border-black p-2.5 align-top">
                      <textarea
                        value={selectedTopic.topic_content || ''}
                        onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_content: e.target.value }))}
                        onInput={handleAutoResize}
                        placeholder="Topics, subject knowledge, essential skills, and disciplinary syllabus content..."
                        rows={12}
                        className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white"
                      />
                    </td>

                    <td className="w-[67%] border border-black p-2.5 align-top">
                      <textarea
                        value={selectedTopic.topic_learning_process || selectedTopic.topic_keterangan || ''}
                        onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_learning_process: e.target.value, topic_keterangan: e.target.value }))}
                        onInput={handleAutoResize}
                        placeholder="Learning activities, inquiries, pedagogical strategies, teaching methodologies..."
                        rows={5}
                        className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white"
                      />
                    </td>
                  </tr>

                  {/* Sub-row: Formative Assessment */}
                  <tr>
                    <td className="w-[67%] border border-black p-2.5 align-top space-y-1">
                      <div className="font-bold text-black">Formative Assessment</div>
                      <textarea
                        value={selectedTopic.topic_formative_assessment || ''}
                        onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_formative_assessment: e.target.value }))}
                        onInput={handleAutoResize}
                        placeholder="Exit tickets, quizzes, peer feedback, discussions, checkpoint rubrics..."
                        rows={3}
                        className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white"
                      />
                      {(!selectedTopic.topic_formative_assessment || !selectedTopic.topic_formative_assessment.trim()) && (
                        <div className="font-bold text-red-600 text-[11px]">
                          Not filled yet - You can fill this in Step 6
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Sub-row: Differentiation */}
                  <tr>
                    <td className="w-[67%] border border-black p-2.5 align-top space-y-1">
                      <div className="font-bold text-black">Differentiation</div>
                      <textarea
                        value={selectedTopic.topic_differentiation || ''}
                        onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_differentiation: e.target.value }))}
                        onInput={handleAutoResize}
                        placeholder="Accommodations, scaffolding, extensions for advanced learners, language support..."
                        rows={3}
                        className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white"
                      />
                      {(!selectedTopic.topic_differentiation || !selectedTopic.topic_differentiation.trim()) && (
                        <div className="font-bold text-red-600 text-[11px]">
                          Not filled yet - You can fill this in Step 6
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* TABLE: RESOURCES */}
              <table className="w-full border-collapse border border-black text-[12px] mb-6">
                <thead>
                  <tr>
                    <th className="bg-[#E8E8E8] font-bold text-left border border-black px-2.5 py-1.5">
                      Resources
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2.5 align-top">
                      <textarea
                        value={selectedTopic.topic_resources || ''}
                        onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_resources: e.target.value }))}
                        onInput={handleAutoResize}
                        placeholder="Textbooks, digital tools, guest speakers, laboratory materials, links, bibliography..."
                        rows={3}
                        className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* REFLECTION SECTION */}
              <p className="text-[12px] text-black my-2 font-normal">
                Reflection: Considering the planning, process and impact of the inquiry
              </p>

              <table className="w-full border-collapse border border-black text-[12px]">
                <thead>
                  <tr>
                    <th className="w-[33%] bg-[#E8E8E8] font-bold text-left border border-black px-2.5 py-1.5">
                      Prior to teaching the unit
                    </th>
                    <th className="w-[33%] bg-[#E8E8E8] font-bold text-left border border-black px-2.5 py-1.5">
                      During teaching
                    </th>
                    <th className="w-[34%] bg-[#E8E8E8] font-bold text-left border border-black px-2.5 py-1.5">
                      After teaching the unit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="w-[33%] border border-black p-2.5 align-top">
                      <textarea
                        value={selectedTopic.topic_reflection_prior || ''}
                        onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_reflection_prior: e.target.value }))}
                        onInput={handleAutoResize}
                        placeholder="Anticipate student questions, prior knowledge, challenges..."
                        rows={6}
                        className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white"
                      />
                    </td>

                    <td className="w-[33%] border border-black p-2.5 align-top">
                      <textarea
                        value={selectedTopic.topic_reflection_during || ''}
                        onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_reflection_during: e.target.value }))}
                        onInput={handleAutoResize}
                        placeholder="Observations during unit execution, student responses, adjustments made..."
                        rows={6}
                        className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white"
                      />
                    </td>

                    <td className="w-[34%] border border-black p-2.5 align-top">
                      <textarea
                        value={selectedTopic.topic_reflection_after || ''}
                        onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_reflection_after: e.target.value }))}
                        onInput={handleAutoResize}
                        placeholder="Reflect on student achievement, engagement, improvements for future iterations..."
                        rows={6}
                        className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODE B: ASSESSMENT TASK SHEET & RUBRICS (PORTRAIT A4 SHEET)
            Exact 1:1 match to the official Assessment PDF layout
        ══════════════════════════════════════════════════════════════════════ */}
        {activeDoc === 'assessment' && (
          <section className="bg-white text-black shadow-2xl border border-gray-400 p-8 sm:p-12 max-w-[850px] w-full mx-auto font-[Arial,Helvetica,sans-serif] space-y-6">
            {/* Top Indicator */}
            <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono border-b pb-1">
              <span>MYP ASSESSMENT DOCUMENT — PORTRAIT FORMAT</span>
              <span className="uppercase">Task Sheet & Rubrics</span>
            </div>

            {/* ─── HEADER: TITLE & RESULT BOX ─── */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[20pt] font-bold text-black tracking-tight uppercase leading-none">
                  ASSESSMENT
                </h1>
                <p className="text-xs text-gray-500 mt-1">Official Student Task Sheet & Criteria Clarification</p>
              </div>

              {/* Result Box (matching /api/assessment-html) */}
              <div className="flex flex-col items-center select-none">
                <div className="w-[85px] h-[72px] border-2 border-black rounded-xl bg-white shadow-2xs flex items-center justify-center text-gray-300 font-bold text-sm">
                  SCORE
                </div>
                <span className="font-bold text-[11pt] text-black mt-1">RESULT</span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-b border-[#9a9a9a]" />

            {/* ─── INFO SECTION (2 COLUMNS) ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-[11pt]">
              {/* Left Column */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-[70px_10px_1fr] items-baseline">
                  <span className="font-normal text-black">Name</span>
                  <span>:</span>
                  <span className="border-b border-dotted border-gray-400 min-h-[18px]"></span>
                </div>
                <div className="grid grid-cols-[70px_10px_1fr] items-baseline">
                  <span className="font-normal text-black">Class</span>
                  <span>:</span>
                  <span className="font-semibold text-black">{kelasName}</span>
                </div>
                <div className="grid grid-cols-[70px_10px_1fr] items-baseline">
                  <span className="font-normal text-black">Day/Date</span>
                  <span>:</span>
                  <span className="border-b border-dotted border-gray-400 min-h-[18px]"></span>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-[70px_10px_1fr] items-baseline">
                  <span className="font-normal text-black">Subject</span>
                  <span>:</span>
                  <span className="font-semibold text-black">{subjectName}</span>
                </div>
                <div className="grid grid-cols-[70px_10px_1fr] items-baseline">
                  <span className="font-normal text-black">Unit</span>
                  <span>:</span>
                  <span className="font-semibold text-black">{unitName}</span>
                </div>
                <div className="grid grid-cols-[70px_10px_1fr] items-baseline">
                  <span className="font-normal text-black">Teacher</span>
                  <span>:</span>
                  <span className="font-semibold text-black">{teacherName}</span>
                </div>
              </div>
            </div>

            {/* ─── ASSESSMENT TITLE (CENTERED) ─── */}
            <div className="pt-2 text-center">
              <input
                type="text"
                value={wizardAssessment.assessment_nama || ''}
                onChange={(e) => setWizardAssessment(prev => ({ ...prev, assessment_nama: e.target.value }))}
                placeholder="ENTER ASSESSMENT TITLE HERE"
                className="w-full text-center text-[18pt] font-bold text-black uppercase outline-none hover:bg-yellow-50 focus:bg-white border-b border-gray-300 pb-1"
              />
            </div>

            {/* ─── TASK OVERVIEW TABLE (8 ROWS MATCHING PDF) ─── */}
            <div>
              <div className="font-bold text-[11pt] text-black mb-1.5 uppercase">
                Task Overview
              </div>
              <table className="w-full border-collapse border border-black text-[11pt]">
                <tbody>
                  {/* Row 1: Criterion */}
                  <tr>
                    <td className="w-[180px] font-bold border border-black p-2 bg-[#f0f0f0]/40">
                      Criterion
                    </td>
                    <td className="border border-black p-2 font-semibold">
                      {selectedCriteriaCodes}
                    </td>
                  </tr>

                  {/* Row 2: Proficiency Level */}
                  <tr>
                    <td className="font-bold border border-black p-2 bg-[#f0f0f0]/40">
                      Proficiency Level
                    </td>
                    <td className="border border-black p-2 font-semibold">
                      {proficiencyLevel}
                    </td>
                  </tr>

                  {/* Row 3: Key Concept */}
                  <tr>
                    <td className="font-bold border border-black p-2 bg-[#f0f0f0]/40">
                      Key Concept
                    </td>
                    <td className="border border-black p-2">
                      {selectedKeyConcept || 'N/A'}
                    </td>
                  </tr>

                  {/* Row 4: Related Concepts */}
                  <tr>
                    <td className="font-bold border border-black p-2 bg-[#f0f0f0]/40">
                      Related Concepts
                    </td>
                    <td className="border border-black p-2">
                      {selectedTopic.topic_related_concept || 'N/A'}
                    </td>
                  </tr>

                  {/* Row 5: Conceptual Understanding */}
                  <tr>
                    <td className="font-bold border border-black p-2 bg-[#f0f0f0]/40">
                      Conceptual Understanding
                    </td>
                    <td className="border border-black p-2">
                      <textarea
                        value={wizardAssessment.assessment_conceptual_understanding || selectedTopic.topic_conceptual_understanding || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setWizardAssessment(prev => ({ ...prev, assessment_conceptual_understanding: val }))
                          setSelectedTopic(prev => ({ ...prev, topic_conceptual_understanding: val }))
                        }}
                        onInput={handleAutoResize}
                        placeholder="Enter conceptual understanding..."
                        rows={2}
                        className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white text-[11pt]"
                      />
                    </td>
                  </tr>

                  {/* Row 6: Global Context Exploration */}
                  <tr>
                    <td className="font-bold border border-black p-2 bg-[#f0f0f0]/40">
                      Global Context Exploration
                    </td>
                    <td className="border border-black p-2">
                      {selectedTopic.topic_global_context ? (
                        <span>
                          {selectedTopic.topic_global_context}
                          {selectedTopic.topic_gc_exploration ? ` (Exploration: ${selectedTopic.topic_gc_exploration})` : ''}
                        </span>
                      ) : 'N/A'}
                    </td>
                  </tr>

                  {/* Row 7: Statement of Inquiry */}
                  <tr>
                    <td className="font-bold border border-black p-2 bg-[#f0f0f0]/40">
                      Statement of Inquiry
                    </td>
                    <td className="border border-black p-2 font-medium">
                      {selectedTopic.topic_statement || 'N/A'}
                    </td>
                  </tr>

                  {/* Row 8: Task Specific Description */}
                  <tr>
                    <td className="font-bold border border-black p-2 bg-[#f0f0f0]/40">
                      Task Specific Description
                    </td>
                    <td className="border border-black p-2">
                      <textarea
                        value={wizardAssessment.assessment_task_specific_description || ''}
                        onChange={(e) => setWizardAssessment(prev => ({ ...prev, assessment_task_specific_description: e.target.value }))}
                        onInput={handleAutoResize}
                        placeholder="Detailed outline of what students are required to do and produce..."
                        rows={3}
                        className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white text-[11pt]"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ─── INSTRUCTIONS SECTION ─── */}
            <div className="pt-2">
              <div className="font-bold text-[11pt] text-black uppercase mb-1">
                INSTRUCTIONS:
              </div>
              <textarea
                value={wizardAssessment.assessment_instructions || ''}
                onChange={(e) => setWizardAssessment(prev => ({ ...prev, assessment_instructions: e.target.value }))}
                onInput={handleAutoResize}
                placeholder="1. Read all criteria carefully before starting your work.\n2. Ensure all research findings are documented with citations.\n3. Complete the task within the designated timeline."
                rows={4}
                className="w-full bg-transparent text-black outline-none resize-y leading-relaxed hover:bg-yellow-50 focus:bg-white text-[11pt] border border-gray-300 p-2.5 rounded"
              />
            </div>

            {/* ─── SUBJECT CRITERIA AND TASK-SPECIFIC CLARIFICATION (PORTRAIT RUBRICS) ─── */}
            <div className="pt-4 space-y-6">
              <div className="flex items-center justify-between border-b border-black pb-1">
                <h3 className="font-bold text-[12pt] uppercase tracking-wide text-black">
                  SUBJECT CRITERIA AND TASK-SPECIFIC CLARIFICATION
                </h3>
                {requestAiHelpTSC && (
                  <button
                    type="button"
                    onClick={requestAiHelpTSC}
                    disabled={aiLoading}
                    className="text-xs text-purple-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="text-xs" />
                    <span>AI Assist Clarifications</span>
                  </button>
                )}
              </div>

              {selectedCriteriaList.length > 0 ? (
                selectedCriteriaList.map(criterion => {
                  const criterionStrands = (wizardStrands || []).filter(s => s.criterion_id === criterion.criterion_id)
                  const criterionRubrics = (wizardRubrics || []).filter(r =>
                    criterionStrands.some(s => s.strand_id === r.strand_id)
                  )

                  return (
                    <div key={criterion.criterion_id} className="space-y-2">
                      <div className="font-bold text-[11pt] text-black">
                        Criteria {criterion.code}
                      </div>

                      <table className="w-full border-collapse border border-black text-[10.5pt]">
                        <thead>
                          <tr>
                            <th className="w-[45px] border border-black p-1.5 bg-[#f0f0f0] text-center font-bold"></th>
                            <th className="w-[48%] border border-black p-1.5 bg-[#f0f0f0] text-center font-bold">
                              SUBJECT CRITERIA
                            </th>
                            <th className="w-[48%] border border-black p-1.5 bg-[#f0f0f0] text-center font-bold">
                              TASK-SPECIFIC CLARIFICATION
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {bandLevels.map(bandLabel => {
                            const rubricsInBand = criterionRubrics.filter(r => r.band_label === bandLabel)

                            return (
                              <tr key={bandLabel} className="align-top">
                                {/* Band Label (7-8, 5-6, etc.) */}
                                <td className="border border-black p-2 text-center font-bold bg-[#f0f0f0]/30 text-[11pt]">
                                  {bandLabel}
                                </td>

                                {/* Subject Criteria Strand Descriptors */}
                                <td className="border border-black p-2.5 space-y-1">
                                  <div className="font-semibold text-black">The student:</div>
                                  {criterionStrands.map(strand => {
                                    const rubric = rubricsInBand.find(r => r.strand_id === strand.strand_id)
                                    if (!rubric) return null
                                    return (
                                      <div key={strand.strand_id} className="text-[10pt] leading-relaxed text-black">
                                        <span className="font-bold">{strand.label ? `${strand.label}. ` : ''}</span>
                                        <span>{rubric.description}</span>
                                      </div>
                                    )
                                  })}
                                </td>

                                {/* Task-Specific Clarification Editable Textareas */}
                                <td className="border border-black p-2.5 space-y-2">
                                  <div className="font-semibold text-black">The student:</div>
                                  {criterionStrands.map(strand => {
                                    const tscKey = `${criterion.criterion_id}_${bandLabel}_${strand.label}`
                                    const currentVal = wizardAssessment?.assessment_tsc?.[tscKey] ||
                                      wizardAssessment?.assessment_tsc?.[strand.strand_id]?.[bandLabel] || ''

                                    return (
                                      <div key={strand.strand_id} className="space-y-0.5">
                                        <div className="font-bold text-[10px] text-gray-700">
                                          {strand.label ? `${strand.label}. ` : ''}
                                        </div>
                                        <textarea
                                          value={currentVal}
                                          onChange={(e) => {
                                            const val = e.target.value
                                            setWizardAssessment(prev => {
                                              const nextTsc = { ...(prev.assessment_tsc || {}) }
                                              nextTsc[tscKey] = val
                                              nextTsc[strand.strand_id] = {
                                                ...(nextTsc[strand.strand_id] || {}),
                                                [bandLabel]: val,
                                              }
                                              return { ...prev, assessment_tsc: nextTsc }
                                            })
                                          }}
                                          onInput={handleAutoResize}
                                          placeholder={`Task-specific clarification for ${strand.label || ''} at level ${bandLabel}...`}
                                          rows={2}
                                          className="w-full bg-transparent text-black text-[10pt] outline-none resize-y leading-relaxed border-b border-gray-200 hover:bg-yellow-50 focus:bg-white"
                                        />
                                      </div>
                                    )
                                  })}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                })
              ) : (
                <div className="text-center text-gray-400 italic py-6 text-xs border border-dashed border-gray-300 rounded">
                  No criteria selected. Select criteria in the Unit Planner (Page 2) or choose criteria for this subject to generate rubrics.
                </div>
              )}
            </div>
          </section>
        )}

      </main>
    </div>
  )
}
