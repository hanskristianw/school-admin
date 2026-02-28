'use client'

/**
 * WizardStepContent – renders the form fields for each wizard step (0-9).
 *
 * Extracted from page.jsx to reduce file size.
 * Receives all necessary state / callbacks as props.
 */

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

export default function WizardStepContent({
  currentStep,
  // topic state
  selectedTopic, setSelectedTopic,
  // assessment state
  wizardAssessment, setWizardAssessment,
  wizardCriteria, wizardStrands, wizardRubrics,
  loadingStrands,
  // lists
  subjects, allKelas, kelasLoading,
  keyConcepts, globalContexts, globalContextExplorations, learnerProfiles,
  // flags
  isAddMode, topicAssessment,
  // AI
  aiLoading,
  openAiInputModal, requestAiHelp, requestAiHelpAtl, requestAiHelpTSC,
  setAiHelpType, setAiError, setAiResultModalOpen,
  setSelectedKeyConcepts, setSelectedRelatedConcepts, setSelectedGlobalContexts,
  setSelectedStatements, setSelectedConceptualUnderstanding, setSelectedLearnerProfiles, setSelectedServiceLearning,
  setSelectedResources, setSelectedAtlSkills,
  // parent helpers
  isStepCompleted, fetchKelasForSubject, setAllKelas, fetchStrandsForCriteria,
  // i18n
  t,
}) {
  return (
    <div className="space-y-6">
      {/* ─── Step 0: Basic Information ─── */}
      {currentStep === 0 && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('topicNew.fields.subject')} <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedTopic.topic_subject_id || ''}
                onChange={(e) => {
                  const subjectId = e.target.value
                  setSelectedTopic(prev => ({ 
                    ...prev, 
                    topic_subject_id: subjectId,
                    topic_kelas_id: '' // Reset kelas when subject changes
                  }))
                  // Fetch kelas for selected subject
                  if (subjectId) {
                    fetchKelasForSubject(subjectId)
                  } else {
                    setAllKelas([])
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">{t('topicNew.fields.selectSubject')}</option>
                {subjects.map(subject => (
                  <option key={subject.subject_id} value={subject.subject_id}>
                    {subject.subject_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('topicNew.fields.class')} <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedTopic.topic_kelas_id || ''}
                onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_kelas_id: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={!selectedTopic.topic_subject_id || kelasLoading}
              >
                <option value="">
                  {kelasLoading ? 'Loading classes...' : 'Select a class...'}
                </option>
                {allKelas.map(kelas => (
                  <option key={kelas.kelas_id} value={kelas.kelas_id}>
                    {kelas.kelas_nama}
                  </option>
                ))}
              </select>
              {!kelasLoading && selectedTopic.topic_subject_id && allKelas.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">⚠️ No classes mapped to this subject in detail_kelas</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                MYP Year <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedTopic.topic_year || ''}
                onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_year: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Select MYP Year...</option>
                <option value="1">MYP Year 1</option>
                <option value="3">MYP Year 3</option>
                <option value="5">MYP Year 5</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Unit Title <span className="text-red-500">*</span>
            </label>
            <div className="mb-2">
              <button 
                type="button" 
                onClick={() => openAiInputModal('en')}
                disabled={!selectedTopic.topic_subject_id}
                className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selectedTopic.topic_subject_id
                    ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer'
                    : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                title={!selectedTopic.topic_subject_id ? t('topicNew.messages.selectSubjectFirst') : ''}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                </svg>
                AI Help
              </button>
            </div>
            {!selectedTopic.topic_subject_id && (
              <p className="text-xs text-amber-600 mb-2">⚠️ {t('topicNew.messages.selectSubjectFirst')}</p>
            )}
            <input
              type="text"
              value={selectedTopic.topic_nama || ''}
              onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_nama: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-lg"
              placeholder="e.g., How does energy shape our world?"
            />
            <p className="text-xs text-gray-500 mt-1">💡 Tip: Frame as an engaging question to provoke inquiry</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Unit Number <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={selectedTopic.topic_urutan || ''}
                onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_urutan: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="e.g., 1"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Duration (weeks) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={selectedTopic.topic_duration || ''}
                onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_duration: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="e.g., 6"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Hours per Week <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={selectedTopic.topic_hours_per_week || ''}
                onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_hours_per_week: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="e.g., 4"
                min="1"
              />
            </div>
          </div>
        </>
      )}
      
      {/* ─── Step 1: Inquiry Question ─── */}
      {currentStep === 1 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Inquiry Question <span className="text-red-500">*</span>
          </label>
          <div className="mb-2">
            <button 
              type="button" 
              onClick={() => openAiInputModal('en', 'inquiryQuestion')}
              disabled={!isStepCompleted(0)}
              className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                isStepCompleted(0)
                  ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer'
                  : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title={!isStepCompleted(0) ? 'Complete all Step 1 fields first' : ''}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
              </svg>
              AI Help
            </button>
          </div>
          {!isStepCompleted(0) && (
            <p className="text-xs text-amber-600 mb-2">⚠️ Complete all fields in Step 1 (Basic Information) first to use AI Help</p>
          )}
          <textarea
            value={selectedTopic.topic_inquiry_question || ''}
            onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_inquiry_question: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            rows={4}
            placeholder="e.g., How do energy transformations affect our daily lives and environment?"
          />
        </div>
      )}
      
      {/* ─── Step 2: Concepts ─── */}
      {currentStep === 2 && (
        <>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Key Concept <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (isStepCompleted(0)) {
                    setAiHelpType('keyConcept')
                    setAiError('')
                    setSelectedKeyConcepts([])
                    setAiResultModalOpen(false)
                    requestAiHelp('keyConcept')
                  }
                }}
                disabled={!isStepCompleted(0)}
                title={!isStepCompleted(0) ? 'Complete Step 1 (Basic Information) first' : 'Get AI suggestions for Key Concepts'}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 font-medium border ${
                  isStepCompleted(0)
                    ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 cursor-pointer'
                    : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                </svg>
                AI Help
              </button>
            </div>
            {!isStepCompleted(0) && (
              <p className="text-xs text-amber-600 mb-2">⚠️ Complete all fields in Step 1 (Basic Information) first to use AI Help</p>
            )}
            <p className="text-xs text-gray-600 mb-3">Select 1 Key Concept from the 16 IB MYP concepts</p>
            <div className="flex flex-wrap gap-2">
              {keyConcepts.map((concept) => (
                <button
                  key={concept}
                  type="button"
                  onClick={() => {
                    const current = (selectedTopic.topic_key_concept || '').trim()
                    // Single select: toggle off if same, otherwise replace
                    const newValue = current === concept ? '' : concept
                    setSelectedTopic(prev => ({ ...prev, topic_key_concept: newValue }))
                  }}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                    (selectedTopic.topic_key_concept || '').trim() === concept
                      ? 'bg-purple-500 text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {(selectedTopic.topic_key_concept || '').trim() === concept && (
                    <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {concept}
                </button>
              ))}
            </div>
            {selectedTopic.topic_key_concept && (
              <p className="text-xs text-purple-600 mt-2">
                ✓ Selected: {selectedTopic.topic_key_concept.trim()}
              </p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Related Concept <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (isStepCompleted(0)) {
                    setAiHelpType('relatedConcept')
                    setAiError('')
                    setSelectedRelatedConcepts([])
                    setAiResultModalOpen(false)
                    requestAiHelp('relatedConcept')
                  }
                }}
                disabled={!isStepCompleted(0)}
                title={!isStepCompleted(0) ? 'Complete Step 1 (Basic Information) first' : 'Get AI suggestions for Related Concepts'}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 font-medium border ${
                  isStepCompleted(0)
                    ? 'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200 cursor-pointer'
                    : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                </svg>
                AI Help
              </button>
            </div>
            {!isStepCompleted(0) && (
              <p className="text-xs text-amber-600 mb-2">⚠️ Complete all fields in Step 1 (Basic Information) first to use AI Help</p>
            )}
            <p className="text-xs text-gray-600 mb-2">Enter subject-specific concepts, separated by commas</p>
            <textarea
              value={selectedTopic.topic_related_concept || ''}
              onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_related_concept: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              rows={2}
              placeholder="e.g., Energy, Transformation, Environment"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Global Context <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (isStepCompleted(0)) {
                    setAiHelpType('globalContext')
                    setAiError('')
                    setSelectedGlobalContexts([])
                    setAiResultModalOpen(false)
                    requestAiHelp('globalContext')
                  }
                }}
                disabled={!isStepCompleted(0)}
                title={!isStepCompleted(0) ? 'Complete Step 1 (Basic Information) first' : 'Get AI suggestions for Global Context'}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 font-medium border ${
                  isStepCompleted(0)
                    ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 cursor-pointer'
                    : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                </svg>
                AI Help
              </button>
            </div>
            {!isStepCompleted(0) && (
              <p className="text-xs text-amber-600 mb-2">⚠️ Complete all fields in Step 1 (Basic Information) first to use AI Help</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {globalContexts.map((context) => (
                <button
                  key={context}
                  onClick={() => {
                    const current = selectedTopic.topic_global_context || ''
                    const currentArray = current ? current.split(', ').filter(c => c) : []
                    const newArray = currentArray.includes(context)
                      ? currentArray.filter(c => c !== context)
                      : [...currentArray, context]
                    setSelectedTopic(prev => ({ ...prev, topic_global_context: newArray.join(', '), topic_gc_exploration: '' }))
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    (selectedTopic.topic_global_context || '').split(', ').includes(context)
                      ? 'bg-cyan-500 text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {(selectedTopic.topic_global_context || '').split(', ').includes(context) && (
                    <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {context}
                </button>
              ))}
            </div>

            {/* Possible Explorations - shown when a Global Context is selected */}
            {selectedTopic.topic_global_context && (() => {
              const selectedGCs = (selectedTopic.topic_global_context || '').split(', ').filter(Boolean)
              const allExplorations = selectedGCs.flatMap(gc => {
                const explorations = globalContextExplorations[gc] || []
                return explorations.map(exp => ({ gc, exp }))
              })
              if (allExplorations.length === 0) return null

              const currentExploration = selectedTopic.topic_gc_exploration || ''

              return (
                <div className="mt-4 p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Possible Exploration
                    <span className="text-xs font-normal text-gray-500 ml-2">(Select 1 exploration for your unit)</span>
                  </label>
                  {selectedGCs.map(gc => {
                    const explorations = globalContextExplorations[gc] || []
                    if (explorations.length === 0) return null
                    return (
                      <div key={gc} className="mb-3">
                        {selectedGCs.length > 1 && (
                          <p className="text-xs font-semibold text-cyan-700 mb-1.5">{gc}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {explorations.map((exp) => {
                            const isSelected = currentExploration === exp
                            return (
                              <button
                                key={exp}
                                type="button"
                                onClick={() => {
                                  // Single-select: toggle or replace
                                  const updated = isSelected ? '' : exp
                                  setSelectedTopic(prev => ({ ...prev, topic_gc_exploration: updated }))
                                }}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                  isSelected
                                    ? 'bg-cyan-600 text-white shadow-sm'
                                    : 'bg-white text-gray-600 border border-gray-300 hover:border-cyan-400 hover:text-cyan-700'
                                }`}
                              >
                                {isSelected && (
                                  <svg className="w-3 h-3 inline mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {exp}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                  {currentExploration && (
                    <p className="text-xs text-cyan-700 mt-2 font-medium">Selected: {currentExploration}</p>
                  )}
                </div>
              )
            })()}
          </div>
        </>
      )}
      
      {/* ─── Step 3: Conceptual Understanding & Statement of Inquiry ─── */}
      {currentStep === 3 && (
        <div>
          {/* Conceptual Understanding (must be filled first) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Conceptual Understanding <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const hasRequiredFields = selectedTopic.topic_key_concept && 
                                           selectedTopic.topic_related_concept
                  if (hasRequiredFields) {
                    setAiHelpType('conceptualUnderstanding')
                    setAiError('')
                    setSelectedConceptualUnderstanding([])
                    setAiResultModalOpen(false)
                    requestAiHelp('conceptualUnderstanding')
                  }
                }}
                disabled={!selectedTopic.topic_key_concept || !selectedTopic.topic_related_concept}
                title={(!selectedTopic.topic_key_concept || !selectedTopic.topic_related_concept) ? 'Complete Key Concept and Related Concept first' : 'Get AI suggestions for Conceptual Understanding'}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 font-medium border ${
                  (selectedTopic.topic_key_concept && selectedTopic.topic_related_concept)
                    ? 'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200 cursor-pointer'
                    : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                </svg>
                AI Help
              </button>
            </div>
            {(!selectedTopic.topic_key_concept || !selectedTopic.topic_related_concept) && (
              <p className="text-xs text-amber-600 mb-2">⚠️ Complete Key Concept and Related Concept in Step 2 first to use AI Help</p>
            )}
            <p className="text-xs text-gray-500 mb-2">Merge Key Concept + Related Concepts using a vivid verb (e.g., alter, cause, create, establish, influence, shape). Template: "Concept and concept <b>verb</b> concept."</p>
            <textarea
              value={selectedTopic.topic_conceptual_understanding || ''}
              onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_conceptual_understanding: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              rows={4}
              placeholder="e.g., Patterns and change produce consequences."
            />
          </div>

          {/* Statement of Inquiry (disabled until Conceptual Understanding is filled) */}
          <div className={!selectedTopic.topic_conceptual_understanding?.trim() ? 'opacity-50 pointer-events-none' : ''}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Statement of Inquiry <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const hasRequiredFields = selectedTopic.topic_key_concept && 
                                           selectedTopic.topic_related_concept && 
                                           selectedTopic.topic_global_context &&
                                           selectedTopic.topic_nama &&
                                           selectedTopic.topic_conceptual_understanding?.trim()
                  if (hasRequiredFields) {
                    setAiHelpType('statement')
                    setAiError('')
                    setSelectedStatements([])
                    setAiResultModalOpen(false)
                    requestAiHelp('statement')
                  }
                }}
                disabled={!selectedTopic.topic_key_concept || !selectedTopic.topic_related_concept || !selectedTopic.topic_global_context || !selectedTopic.topic_nama || !selectedTopic.topic_conceptual_understanding?.trim()}
                title={(!selectedTopic.topic_key_concept || !selectedTopic.topic_related_concept || !selectedTopic.topic_global_context || !selectedTopic.topic_nama || !selectedTopic.topic_conceptual_understanding?.trim()) ? 'Complete Unit Title, Key Concept, Related Concept, Global Context, and Conceptual Understanding first' : 'Get AI suggestions for Statement of Inquiry'}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 font-medium border ${
                  (selectedTopic.topic_key_concept && selectedTopic.topic_related_concept && selectedTopic.topic_global_context && selectedTopic.topic_nama && selectedTopic.topic_conceptual_understanding?.trim())
                    ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 cursor-pointer'
                    : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                </svg>
                AI Help
              </button>
            </div>
            {!selectedTopic.topic_conceptual_understanding?.trim() && (
              <p className="text-xs text-amber-600 mb-2">⚠️ Fill in Conceptual Understanding above first before writing the Statement of Inquiry</p>
            )}
            <textarea
              value={selectedTopic.topic_statement || ''}
              onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_statement: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              rows={4}
              placeholder="e.g., Understanding energy transformations helps us make informed decisions about sustainability..."
              disabled={!selectedTopic.topic_conceptual_understanding?.trim()}
            />
          </div>
        </div>
      )}
      
      {/* ─── Step 4: Learner Profile & Service ─── */}
      {currentStep === 4 && (
        <>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Learner Profile Attributes <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-600 mb-3">Select IB Learner Profile attributes students will develop</p>
            <div className="mb-2">
              {(() => {
                const canUseAiHelp = !isAddMode || isStepCompleted(2)
                return (
                  <button 
                    type="button" 
                    onClick={() => {
                      if (!canUseAiHelp) return
                      setAiHelpType('learnerProfile')
                      setAiError('')
                      setSelectedLearnerProfiles([])
                      setAiResultModalOpen(false)
                      requestAiHelp('learnerProfile')
                    }}
                    disabled={!canUseAiHelp}
                    className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      canUseAiHelp
                        ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer'
                        : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    title={!canUseAiHelp ? 'Complete Key Concept, Related Concept, and Global Context first' : 'Get AI suggestions for Learner Profile'}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                    </svg>
                    AI Help
                  </button>
                )
              })()}
            </div>
            {isAddMode && !isStepCompleted(2) && (
              <p className="text-xs text-amber-600 mb-2">⚠️ Complete all Step 3 fields first to use AI Help</p>
            )}
            <div className="flex flex-wrap gap-2">
              {learnerProfiles.map((profile) => (
                <button
                  key={profile}
                  type="button"
                  onClick={() => {
                    const current = selectedTopic.topic_learner_profile || ''
                    const currentArray = current ? current.split(', ').filter(c => c) : []
                    const newArray = currentArray.includes(profile)
                      ? currentArray.filter(c => c !== profile)
                      : [...currentArray, profile]
                    setSelectedTopic(prev => ({ ...prev, topic_learner_profile: newArray.join(', ') }))
                  }}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                    (selectedTopic.topic_learner_profile || '').split(', ').includes(profile)
                      ? 'bg-green-500 text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {(selectedTopic.topic_learner_profile || '').split(', ').includes(profile) && (
                    <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {profile}
                </button>
              ))}
            </div>
            {selectedTopic.topic_learner_profile && (
              <p className="text-xs text-green-600 mt-2">
                ✓ Selected: {selectedTopic.topic_learner_profile.split(', ').filter(c => c).length} attribute(s)
              </p>
            )}
          </div>

          {/* ATL (Approaches to Learning) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                ATL Skills (Approaches to Learning) <span className="text-red-500">*</span>
              </label>
              {(() => {
                const canUseAiHelp = !isAddMode || (
                  isStepCompleted(0) && 
                  isStepCompleted(1) && 
                  isStepCompleted(2) && 
                  isStepCompleted(3) &&
                  selectedTopic.topic_learner_profile?.trim()
                )
                return (
                  <button 
                    type="button" 
                    onClick={() => {
                      if (!canUseAiHelp) return
                      setAiHelpType('atl')
                      setAiError('')
                      setSelectedAtlSkills([])
                      setAiResultModalOpen(false)
                      requestAiHelpAtl()
                    }}
                    disabled={!canUseAiHelp}
                    className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      canUseAiHelp
                        ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer'
                        : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    title={!canUseAiHelp ? 'Complete all previous steps and select Learner Profile first' : 'Get AI suggestions for ATL skills based on your unit plan'}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                    </svg>
                    AI Help
                  </button>
                )
              })()}
            </div>
            {isAddMode && !selectedTopic.topic_learner_profile?.trim() && (
              <p className="text-xs text-amber-600 mb-2">⚠️ Complete all previous steps and select Learner Profile first to use AI Help</p>
            )}
            <p className="text-xs text-gray-600 mb-2">
              List the ATL skills students will develop in this unit. Use AI Help to get suggestions based on your unit plan.
            </p>
            <textarea
              value={selectedTopic.topic_atl || ''}
              onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_atl: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              rows={4}
              placeholder="e.g., Communication - Exchanging Information - Giving feedback: Give and receive meaningful feedback&#10;Thinking - Critical Thinking - Analyzing concepts: Analyze complex concepts into parts&#10;Research - Information Literacy - Accessing information: Access information to inform others..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Service Learning <span className="text-red-500">*</span>
            </label>
            <div className="mb-2">
              {(() => {
                const canUseAiHelp = !isAddMode || isStepCompleted(2)
                return (
                  <button 
                    type="button" 
                    onClick={() => {
                      if (!canUseAiHelp) return
                      setAiHelpType('serviceLearning')
                      setAiError('')
                      setSelectedServiceLearning([])
                      setAiResultModalOpen(false)
                      requestAiHelp('serviceLearning')
                    }}
                    disabled={!canUseAiHelp}
                    className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      canUseAiHelp
                        ? 'border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 cursor-pointer'
                        : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    title={!canUseAiHelp ? 'Complete Key Concept, Related Concept, and Global Context first' : 'Get AI suggestions for Service Learning'}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                    </svg>
                    AI Help
                  </button>
                )
              })()}
            </div>
            {isAddMode && !isStepCompleted(2) && (
              <p className="text-xs text-amber-600 mb-2">⚠️ Complete all Step 3 fields first to use AI Help</p>
            )}
            <textarea
              value={selectedTopic.topic_service_learning || ''}
              onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_service_learning: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              rows={3}
              placeholder="e.g., Community energy audit project, raising awareness about renewable energy..."
            />
          </div>
          
          {/* Resources / Bibliography */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Resources / Bibliography
            </label>
            <div className="mb-2">
              {(() => {
                const canUseAiHelp = !isAddMode || isStepCompleted(2)
                return (
                  <button 
                    type="button" 
                    onClick={() => {
                      if (!canUseAiHelp) return
                      setAiHelpType('resources')
                      setAiError('')
                      setSelectedResources([])
                      setAiResultModalOpen(false)
                      requestAiHelp('resources')
                    }}
                    disabled={!canUseAiHelp}
                    className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      canUseAiHelp
                        ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer'
                        : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    title={!canUseAiHelp ? 'Complete Key Concept, Related Concept, and Global Context first' : 'Get AI suggestions for Resources'}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                    </svg>
                    AI Help
                  </button>
                )
              })()}
            </div>
            {isAddMode && !isStepCompleted(2) && (
              <p className="text-xs text-amber-600 mb-2">⚠️ Complete all Step 3 fields first to use AI Help</p>
            )}
            <p className="text-xs text-gray-600 mb-2">List books, websites, articles, videos, or other educational resources for this unit</p>
            <textarea
              value={selectedTopic.topic_resources || ''}
              onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_resources: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              rows={4}
              placeholder="e.g., Book: 'The Energy Bus' by Jon Gordon&#10;Website: National Geographic Education&#10;Video: TED-Ed - How Solar Panels Work..."
            />
          </div>
        </>
      )}
      
      {/* ─── Step 5: Formative Assessment ─── */}
      {currentStep === 5 && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-700">
              <strong>📝 Formative Assessment</strong> — Formative assessments are ongoing, low-stakes assessments used to monitor student learning progress and provide feedback. They help teachers adjust instruction and help students identify areas for improvement.
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Formative Assessment Plan
              </label>
              {(() => {
                const canUseAiHelp = !isAddMode || (isStepCompleted(2) && isStepCompleted(3))
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (!canUseAiHelp) return
                      setAiHelpType('formativeAssessment')
                      setAiError('')
                      setAiResultModalOpen(false)
                      requestAiHelp('formativeAssessment')
                    }}
                    disabled={!canUseAiHelp || aiLoading}
                    className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      canUseAiHelp && !aiLoading
                        ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer'
                        : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    title={!canUseAiHelp ? 'Complete Key Concepts and Statement of Inquiry first' : 'Get AI suggestions for Formative Assessment'}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                    </svg>
                    {aiLoading ? 'Loading...' : 'AI Help'}
                  </button>
                )
              })()}
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Describe the formative assessment strategies you will use throughout this unit. Examples:
              <br/>• Exit tickets / Quick checks
              <br/>• Peer &amp; self-assessment
              <br/>• Journal reflections or learning logs
              <br/>• Class discussions or think-pair-share
              <br/>• Draft submissions with feedback
              <br/>• Quizzes or practice tasks
            </p>
            <textarea
              value={selectedTopic.topic_formative_assessment || ''}
              onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_formative_assessment: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={6}
              placeholder="Describe the formative assessments planned for this unit...&#10;&#10;e.g., Weekly journal reflections on inquiry progress, peer review of draft work, exit tickets after each key lesson, class discussion rubric for participation..."
            />
          </div>
        </>
      )}
      
      {/* ─── Step 6: Assessment (Summative) ─── */}
      {currentStep === 6 && (
        <>
          {(() => {
            const isAssessmentApproved = !isAddMode && topicAssessment && topicAssessment.assessment_status === 1
            const isAssessmentReadOnly = false // TEMPORARY: Allow editing even if approved
            
            return (
              <>
                {isAssessmentApproved && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-amber-700">
                      <strong>⚠️ Temporary:</strong> This assessment is approved but can still be edited. Changes may require re-approval.
                    </p>
                  </div>
                )}
                {!isAddMode && !isAssessmentApproved && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-700">
                      <strong>ℹ️ Note:</strong> You can edit assessment details here. Changes will require re-approval if the assessment date is set.
                    </p>
                  </div>
                )}
          
          {/* Criteria to Assess - Moved to top */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Criteria to Assess <span className="text-red-500">*</span>
            </label>
            {wizardCriteria.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-700">
                  ⚠️ No criteria found for this subject. Please add criteria in Subject Management first.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {wizardCriteria.map(criterion => {
                  const isSelected = wizardAssessment.selected_criteria.includes(criterion.criterion_id)
                  return (
                    <button
                      key={criterion.criterion_id}
                      type="button"
                      onClick={() => {
                        if (!isAssessmentReadOnly) {
                          setWizardAssessment(prev => ({
                            ...prev,
                            selected_criteria: isSelected
                              ? prev.selected_criteria.filter(id => id !== criterion.criterion_id)
                              : [...prev.selected_criteria, criterion.criterion_id]
                          }))
                        }
                      }}
                      disabled={isAssessmentReadOnly}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      } ${isAssessmentReadOnly ? 'cursor-not-allowed opacity-75' : ''}`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                        isSelected ? 'bg-cyan-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {criterion.code}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{criterion.name}</p>
                      </div>
                      {isSelected && (
                        <svg className="w-5 h-5 text-cyan-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
            {wizardAssessment.selected_criteria.length > 0 && (
              <p className="text-xs text-green-600 mt-2">
                ✓ Selected: {wizardAssessment.selected_criteria.length} criteria
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Assessment Name <span className="text-red-500">*</span>
                </label>
                {(() => {
                  const canUseAiHelp = wizardAssessment.selected_criteria.length > 0 && !isAssessmentReadOnly
                  return (
                    <button 
                      type="button" 
                      onClick={() => {
                        if (!canUseAiHelp) return
                        setAiHelpType('assessmentName')
                        setAiError('')
                        setAiResultModalOpen(false)
                        requestAiHelp('assessmentName')
                      }}
                      disabled={!canUseAiHelp}
                      className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        canUseAiHelp
                          ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer'
                          : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      title={!canUseAiHelp ? 'Select at least one Criteria to Assess first' : 'Get AI suggestions for Assessment Name'}
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                      </svg>
                      AI Help
                    </button>
                  )
                })()}
              </div>
              {wizardAssessment.selected_criteria.length === 0 && (
                <p className="text-xs text-amber-600 mb-2">⚠️ Select Criteria to Assess first to use AI Help</p>
              )}
              <input
                type="text"
                value={wizardAssessment.assessment_nama}
                onChange={(e) => setWizardAssessment(prev => ({ ...prev, assessment_nama: e.target.value }))}
                disabled={isAssessmentReadOnly}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isAssessmentReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="e.g., Energy Conservation Project"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Semester <span className="text-red-500">*</span>
              </label>
              <select
                value={wizardAssessment.assessment_semester}
                onChange={(e) => setWizardAssessment(prev => ({ ...prev, assessment_semester: e.target.value }))}
                disabled={isAssessmentReadOnly}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isAssessmentReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">Select Semester...</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Conceptual Understanding <span className="text-red-500">*</span>
              </label>
              {selectedTopic.topic_conceptual_understanding?.trim() && (
                <button
                  type="button"
                  onClick={() => setWizardAssessment(prev => ({ ...prev, assessment_conceptual_understanding: selectedTopic.topic_conceptual_understanding }))}
                  className="text-xs px-3 py-1.5 rounded-full border border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition-colors"
                >
                  ↑ Copy from Unit
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-2">What conceptual understanding does this assessment task measure?</p>
            <textarea
              value={wizardAssessment.assessment_conceptual_understanding}
              onChange={(e) => setWizardAssessment(prev => ({ ...prev, assessment_conceptual_understanding: e.target.value }))}
              disabled={isAssessmentReadOnly}
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isAssessmentReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              rows={2}
              placeholder="e.g., Students understand that human activities have consequences on ecosystem balance and biodiversity..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={wizardAssessment.assessment_keterangan}
              onChange={(e) => setWizardAssessment(prev => ({ ...prev, assessment_keterangan: e.target.value }))}
              disabled={isAssessmentReadOnly}
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isAssessmentReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              rows={2}
              placeholder="Brief description of the assessment task..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Task Specific Description <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">Provide specific details about what students need to do in this assessment</p>
            <textarea
              value={wizardAssessment.assessment_task_specific_description}
              onChange={(e) => setWizardAssessment(prev => ({ ...prev, assessment_task_specific_description: e.target.value }))}
              disabled={isAssessmentReadOnly}
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isAssessmentReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              rows={3}
              placeholder="e.g., Create a multimedia presentation that explains the impact of human activities on local ecosystems..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Assessment Instructions <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">Step-by-step instructions for students to complete the assessment</p>
            <textarea
              value={wizardAssessment.assessment_instructions}
              onChange={(e) => setWizardAssessment(prev => ({ ...prev, assessment_instructions: e.target.value }))}
              disabled={isAssessmentReadOnly}
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isAssessmentReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              rows={4}
              placeholder="1. Research your chosen topic using at least 3 credible sources&#10;2. Create an outline of your presentation&#10;3. Design visuals that support your key points&#10;4. Prepare a 5-minute presentation..."
            />
          </div>
              </>
            )
          })()}
        </>
      )}

      {/* ─── Step 7: Relationship ─── */}
      {currentStep === 7 && (
        <>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Relationship: Summative Assessment & Statement of Inquiry
              </label>
              <button
                type="button"
                onClick={() => {
                  const requiredFields = [
                    selectedTopic.topic_nama,
                    selectedTopic.topic_inquiry_question,
                    selectedTopic.topic_key_concept,
                    selectedTopic.topic_statement,
                    wizardAssessment.assessment_nama
                  ];
                  
                  const allFilled = requiredFields.every(field => field && field.toString().trim() !== '');
                  
                  if (!allFilled) {
                    alert('Please complete all previous steps (1-7) before using AI assistance.');
                    return;
                  }
                  
                  setAiHelpType('assessmentRelationship');
                  setAiError('');
                  setAiResultModalOpen(false);
                  requestAiHelp('assessmentRelationship');
                }}
                disabled={
                  aiLoading || 
                  !selectedTopic.topic_nama || 
                  !selectedTopic.topic_inquiry_question || 
                  !selectedTopic.topic_key_concept || 
                  !selectedTopic.topic_statement || 
                  !wizardAssessment.assessment_nama
                }
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  aiLoading || 
                  !selectedTopic.topic_nama || 
                  !selectedTopic.topic_inquiry_question || 
                  !selectedTopic.topic_key_concept || 
                  !selectedTopic.topic_statement || 
                  !wizardAssessment.assessment_nama
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                }`}
              >
                {aiLoading ? (
                  <FontAwesomeIcon icon={faSpinner} className="text-xs animate-spin" />
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                AI Help
              </button>
            </div>
            <textarea
              value={wizardAssessment.assessment_relationship}
              onChange={(e) => setWizardAssessment(prev => ({ ...prev, assessment_relationship: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              rows={4}
              placeholder="Explain how the summative assessment relates to the statement of inquiry..."
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              💡 <strong>Tip:</strong> A strong relationship statement explains how the assessment task allows students to demonstrate their understanding of the Statement of Inquiry and the conceptual understanding developed in this unit.
            </p>
          </div>
        </>
      )}

      {/* ─── Step 8: Task Specific Clarification (TSC) ─── */}
      {currentStep === 8 && (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between">
              <p className="text-sm text-amber-700 flex-1">
                <strong>📝 Task Specific Clarification (TSC)</strong> helps students understand what is expected at each achievement level for this specific assessment task. Fill in the clarifications below to customize the rubric for your assessment.
              </p>
              {wizardStrands.length > 0 && (
                <button
                  onClick={() => requestAiHelpTSC()}
                  disabled={aiLoading || !wizardAssessment.assessment_nama?.trim() || !wizardAssessment.assessment_task_specific_description?.trim()}
                  className="ml-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {aiLoading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
                      <span>Generating TSC...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      AI Help
                    </>
                  )}
                </button>
              )}
            </div>
            {wizardStrands.length > 0 && (!wizardAssessment.assessment_nama?.trim() || !wizardAssessment.assessment_task_specific_description?.trim()) && (
              <p className="text-xs text-amber-600 mt-2">⚠️ Complete Assessment Name and Task Specific Description in Step 6 first to use AI Help</p>
            )}
          </div>

          {loadingStrands ? (
            <div className="flex items-center justify-center py-8">
              <FontAwesomeIcon icon={faSpinner} className="text-2xl text-cyan-500 mr-3 animate-spin" />
              <span className="text-gray-600">Loading rubric structure...</span>
            </div>
          ) : wizardStrands.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <p className="text-gray-600">
                No strands found for the selected criteria and MYP Year level.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Please ensure you have selected criteria in Step 6 and the MYP Year is set in Step 1.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (wizardAssessment.selected_criteria.length > 0 && selectedTopic.topic_year) {
                    fetchStrandsForCriteria(wizardAssessment.selected_criteria, selectedTopic.topic_year)
                  }
                }}
                className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
              >
                Reload Strands
              </button>
            </div>
          ) : (
            <>
              {/* Group by Criterion */}
              {wizardAssessment.selected_criteria.map(criterionId => {
                const criterion = wizardCriteria.find(c => c.criterion_id === criterionId)
                if (!criterion) return null
                
                const criterionStrands = wizardStrands.filter(s => s.criterion_id === criterionId)
                if (criterionStrands.length === 0) return null
                
                const bandLevels = ['7-8', '5-6', '3-4', '1-2']
                
                return (
                  <div key={criterionId} className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-3">
                      <h4 className="font-bold text-lg">Criterion {criterion.code}: {criterion.name}</h4>
                    </div>
                    
                    <div className="divide-y divide-gray-200">
                      {bandLevels.map(bandLabel => {
                        const bandRubrics = wizardRubrics.filter(r => {
                          const strand = criterionStrands.find(s => s.strand_id === r.strand_id)
                          return strand && r.band_label === bandLabel
                        })
                        
                        const getBandColor = (band) => {
                          switch(band) {
                            case '7-8': return 'bg-green-100 text-green-800 border-green-300'
                            case '5-6': return 'bg-blue-100 text-blue-800 border-blue-300'
                            case '3-4': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
                            case '1-2': return 'bg-red-100 text-red-800 border-red-300'
                            case '0': return 'bg-gray-100 text-gray-800 border-gray-300'
                            default: return 'bg-gray-100 text-gray-800 border-gray-300'
                          }
                        }
                        
                        return (
                          <div key={bandLabel} className="p-4">
                            <div className="flex items-start gap-4">
                              <div className={`flex-shrink-0 w-14 h-10 rounded-lg border flex items-center justify-center font-bold text-sm ${getBandColor(bandLabel)}`}>
                                {bandLabel}
                              </div>
                              
                              <div className="flex-1 space-y-3">
                                {criterionStrands.map(strand => {
                                  const rubric = bandRubrics.find(r => r.strand_id === strand.strand_id)
                                  const tscKey = `${criterionId}_${bandLabel}_${strand.label}`
                                  
                                  if (!rubric) return null
                                  
                                  return (
                                    <div key={strand.strand_id} className="bg-gray-50 rounded-lg p-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="inline-flex items-center justify-center w-6 h-6 bg-cyan-100 text-cyan-700 rounded-full text-xs font-bold">
                                          {strand.label}
                                        </span>
                                        <p className="text-xs font-semibold text-gray-500">STRAND {strand.label.toUpperCase()}</p>
                                      </div>
                                      
                                      <div className="mb-2">
                                        <p className="text-xs text-gray-400 mb-1">Subject Criteria:</p>
                                        <p className="text-sm text-gray-700">
                                          <span className="font-medium">{strand.label}.</span> {rubric.description}
                                        </p>
                                      </div>
                                      
                                      <div>
                                        <label className="text-xs text-gray-400 mb-1 block">Task-Specific Clarification:</label>
                                        <textarea
                                          value={wizardAssessment.assessment_tsc?.[tscKey] || ''}
                                          onChange={(e) => {
                                            console.log('🔄 Updating TSC:', tscKey, '=', e.target.value)
                                            setWizardAssessment(prev => {
                                              const newState = {
                                                ...prev,
                                                assessment_tsc: {
                                                  ...prev.assessment_tsc,
                                                  [tscKey]: e.target.value
                                                }
                                              }
                                              console.log('📊 New assessment_tsc state:', newState.assessment_tsc)
                                              return newState
                                            })
                                          }}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                                          rows={2}
                                          placeholder={`TSC for strand ${strand.label} at level ${bandLabel}...`}
                                        />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-700">
                  ⚠️ <strong>Important:</strong> Task Specific Clarification (TSC) must be completed before giving this assessment to students. Each achievement level should have clear descriptions.
                </p>
              </div>
            </>
          )}
        </>
      )}
      
      {/* ─── Step 9: Unit Reflection (Prior & After) ─── */}
      {currentStep === 9 && (
        <>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-purple-700">
              <strong>💭 Unit Reflection</strong> - Reflect on your planning before teaching and your outcomes after teaching. This helps improve your practice and future unit planning.
            </p>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📝</span>
              <label className="block text-base font-semibold text-gray-800">
                Prior Reflection (Before Teaching)
              </label>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Before you begin teaching, reflect on your expectations and planning:
              <br/>• What do you hope students will achieve?
              <br/>• What potential challenges do you foresee?
              <br/>• How will you engage different learners?
              <br/>• What prior knowledge should students have?
            </p>
            <textarea
              value={selectedTopic.topic_reflection_prior || ''}
              onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_reflection_prior: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={5}
              placeholder="Reflect on your planning, expectations, and anticipated challenges..."
            />
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">✅</span>
              <label className="block text-base font-semibold text-gray-800">
                After Reflection (After Teaching)
              </label>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              After completing the unit, reflect on the outcomes:
              <br/>• What worked well in this unit?
              <br/>• What would you change or improve next time?
              <br/>• How did students perform and engage?
              <br/>• What did you learn as an educator?
            </p>
            <textarea
              value={selectedTopic.topic_reflection_after || ''}
              onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_reflection_after: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={5}
              placeholder="Complete this after teaching the unit. Reflect on successes, improvements, and learning outcomes..."
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              💡 <strong>Note:</strong> You can fill "After Reflection" later by editing this unit after you've completed teaching it. The "Prior Reflection" helps you start with clear intentions.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
