/**
 * PDF / Document generation utilities for Topic New page.
 * 
 * Extracted from page.jsx to reduce file size.
 * All functions are pure — they receive dependencies (supabase, jsPDF, etc.) as parameters.
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '@/lib/supabase'

// ─── Pure Helpers ────────────────────────────────────────────────────────────

export const openAssessmentHtml = async (payload) => {
  const res = await fetch('/api/assessment-html', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload) });
  if (!res.ok) {
    let message = '';
    try {
      const err = await res.json();
      message = err?.message || err?.error || '';
    } catch {
      message = await res.text().catch(() => '');
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
  const html = await res.text();
  const blob = new Blob([html], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

export const downloadAssessmentDocx = async (payload, fileName) => {
  const res = await fetch('/api/assessment-docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload) });
  if (!res.ok) {
    let message = '';
    try {
      const err = await res.json();
      message = err?.message || err?.error || '';
    } catch {
      message = await res.text().catch(() => '');
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export const buildAssessmentCriteriaForPdf = ({
  selectedCriteriaIds,
  criteriaList,
  strandsData,
  rubricsData,
  tscMap }) => {
  const romanOrder = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
  const getRomanIndex = (label) => {
    const idx = romanOrder.indexOf((label || '').toLowerCase());
    return idx >= 0 ? idx : 999;
  };

  const criteriaById = new Map((criteriaList || []).map(c => [c.criterion_id, c]));
  const result = [];

  for (const criterionId of selectedCriteriaIds || []) {
    const criterion = criteriaById.get(criterionId);
    const criterionCode = criterion?.code || '';

    const criterionStrands = (strandsData || []).filter(s => s.criterion_id === criterionId);
    if (criterionStrands.length === 0) continue;

    const strandById = new Map(criterionStrands.map(s => [s.strand_id, s]));
    const criterionRubrics = (rubricsData || []).filter(r => strandById.has(r.strand_id));
    if (criterionRubrics.length === 0) continue;

    const bandGroups = {};
    for (const rubric of criterionRubrics) {
      const bandKey = `${rubric.max_score}-${rubric.min_score}`;
      if (!bandGroups[bandKey]) {
        bandGroups[bandKey] = {
          bandLabel: rubric.band_label || bandKey,
          maxScore: rubric.max_score,
          minScore: rubric.min_score,
          subjectItems: [] };
      }
      const strand = strandById.get(rubric.strand_id);
      if (!strand) continue;
      bandGroups[bandKey].subjectItems.push({
        label: strand.label || '',
        text: rubric.description || '' });
    }

    const bands = Object.values(bandGroups)
      .sort((a, b) => (b.maxScore || 0) - (a.maxScore || 0))
      .map(band => {
        const subjectItems = (band.subjectItems || []).slice().sort((a, b) => {
          return getRomanIndex(a.label) - getRomanIndex(b.label);
        });
        const tscItems = subjectItems
          .map(item => {
            const tscKey = `${criterionId}_${band.bandLabel}_${item.label}`;
            const tsc = (tscMap || {})?.[tscKey] || '';
            return tsc ? { label: item.label, text: tsc } : null;
          })
          .filter(Boolean);

        return {
          bandLabel: band.bandLabel,
          subjectItems,
          tscItems };
      });

    if (bands.length > 0) {
      result.push({
        code: criterionCode,
        bands });
    }
  }

  return result;
};

// ─── Unit Planner PDF ────────────────────────────────────────────────────────

/**
 * Generate MYP Unit Planner PDF.
 * @param {Object} topic - The topic object
 * @param {Object} deps - { currentUserId, onSuccess, onError }
 */
export const generateUnitPlannerPDF = async (topic, { currentUserId, onSuccess, onError }) => {
  try {
    // Load complete topic data
    const { data: topicData, error: topicErr } = await supabase
      .from("topic")
      .select("*")
      .eq("topic_id", topic.topic_id)
      .single();
    
    if (topicErr) throw new Error(topicErr.message);

    // Load subject data
    let subject = null;
    let teacher = null;
    if (topicData.topic_subject_id) {
      const { data: subjectData, error: subjectErr } = await supabase
        .from("subject")
        .select("subject_name, subject_user_id")
        .eq("subject_id", topicData.topic_subject_id)
        .single();
      
      if (!subjectErr && subjectData) {
        subject = subjectData;

        if (subjectData?.subject_user_id) {
          const { data: teacherData, error: teacherErr } = await supabase
            .from("users")
            .select("user_nama_depan, user_nama_belakang")
            .eq("user_id", subjectData.subject_user_id)
            .single();
          
          if (!teacherErr && teacherData) {
            teacher = {
              name: `${teacherData.user_nama_depan || ''} ${teacherData.user_nama_belakang || ''}`.trim()
            };
          }
        }
      }
    }

    // Fallback: if teacher still null, try to get current user name
    if (!teacher && currentUserId) {
      const { data: currentUser, error: userErr } = await supabase
        .from("users")
        .select("user_nama_depan, user_nama_belakang")
        .eq("user_id", currentUserId)
        .single();
      
      if (!userErr && currentUser) {
        teacher = {
          name: `${currentUser.user_nama_depan || ''} ${currentUser.user_nama_belakang || ''}`.trim()
        };
      }
    }

    // Load kelas data
    let kelas = null;
    if (topicData.topic_kelas_id) {
      const { data: kelasData, error: kelasErr } = await supabase
        .from("kelas")
        .select("kelas_nama")
        .eq("kelas_id", topicData.topic_kelas_id)
        .single();
      
      if (!kelasErr && kelasData) {
        kelas = kelasData;
      }
    }

    // Load weekly planner data
    const { data: weeklyPlans, error: weeklyErr } = await supabase
      .from("topic_weekly_plan")
      .select("*")
      .eq("topic_id", topic.topic_id)
      .order("week_number", { ascending: true });

    // Generate PDF
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 14;
    let yPos = 10;

    // Calculate total hours
    const duration = parseFloat(topicData.topic_duration) || 0;
    const hoursPerWeek = parseFloat(topicData.topic_hours_per_week) || 0;
    const totalHours = duration * hoursPerWeek;

    const availableWidth = pageWidth - (margin * 2);

    // MYP unit planner title
    pdf.setFontSize(13.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MYP unit planner', margin, yPos);
    yPos += 8;

    // Header Table  
    autoTable(pdf, {
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [],
      body: [
        [
          { content: 'Teacher(s)', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
          { content: teacher?.name || 'N/A', colSpan: 2 },
          { content: 'Subject group and discipline', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
          { content: subject?.subject_name || 'N/A', colSpan: 2 },
        ],
        [
          { content: 'Unit title', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
          { content: topicData.topic_nama || 'N/A' },
          { content: 'MYP year', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
          { content: topicData.topic_year ? `Year ${topicData.topic_year}` : 'N/A' },
          { content: 'Unit duration (hrs)', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
          { content: totalHours > 0 ? totalHours.toString() : (topicData.topic_duration || 'N/A') },
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: availableWidth * 0.15 },
        1: { cellWidth: availableWidth * 0.18 },
        2: { cellWidth: availableWidth * 0.17 },
        3: { cellWidth: availableWidth * 0.17 },
        4: { cellWidth: availableWidth * 0.15 },
        5: { cellWidth: availableWidth * 0.18 } } });

    // Inquiry section
    yPos = pdf.lastAutoTable.finalY + 8;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Inquiry: Establishing the purpose of the unit', margin, yPos);
    yPos += 6;

    autoTable(pdf, {
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [],
      body: [
        [
          { content: 'Key concept', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
          { content: topicData.topic_key_concept || 'N/A' },
          { content: 'Related concept(s)', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
          { content: topicData.topic_related_concept || 'N/A' },
          { content: 'Global context', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
          { content: (topicData.topic_global_context || 'N/A') + (topicData.topic_gc_exploration ? '\nExplorations: ' + topicData.topic_gc_exploration : '') },
        ],
        [
          { content: 'Statement of inquiry', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }, colSpan: 6 },
        ],
        [
          { content: topicData.topic_statement || 'N/A', colSpan: 6, styles: { cellPadding: 3 } },
        ],
        [
          { content: 'Inquiry questions', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }, colSpan: 6 },
        ],
        [
          { content: topicData.topic_inquiry_question || 'N/A', colSpan: 6, styles: { cellPadding: 3 } },
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, valign: 'top', textColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: availableWidth * 0.15 },
        1: { cellWidth: availableWidth * 0.18 },
        2: { cellWidth: availableWidth * 0.17 },
        3: { cellWidth: availableWidth * 0.17 },
        4: { cellWidth: availableWidth * 0.15 },
        5: { cellWidth: availableWidth * 0.18 } } });

    // Add new page for remaining sections
    pdf.addPage();
    yPos = 10;

    // Objectives section
    if (topicData.topic_myp_objectives) {
      autoTable(pdf, {
        startY: yPos,
        head: [],
        body: [
          [{ content: 'Objectives', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }}],
          [{ content: topicData.topic_myp_objectives || 'N/A', styles: { cellPadding: 3 } }],
        ],
        theme: 'grid',
        styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] } });
      yPos = pdf.lastAutoTable.finalY + 5;
    }

    // Summative assessment
    autoTable(pdf, {
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [],
      body: [
        [
          { content: 'Objectives', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }, rowSpan: 2 },
          { content: 'Summative assessment', styles: { fontStyle: 'bold', fillColor: [232, 232, 232], halign: 'center' }, colSpan: 2 },
        ],
        [
          { content: 'Outline of summative assessment task(s) including assessment criteria:', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
          { content: 'Relationship between summative assessment task(s) and statement of inquiry:', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
        ],
        [
          { content: '', styles: { cellPadding: 3 }},
          { content: topicData.topic_summative_assessment || 'N/A', styles: { cellPadding: 3 }},
          { content: topicData.topic_relationship_summative_assessment_statement_of_inquiry || 'N/A', styles: { cellPadding: 3 }},
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, valign: 'top', textColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: availableWidth * 0.33 },
        1: { cellWidth: availableWidth * 0.335 },
        2: { cellWidth: availableWidth * 0.335 } } });
    yPos = pdf.lastAutoTable.finalY + 5;

    // ATL section
    autoTable(pdf, {
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [],
      body: [
        [{ content: 'Approaches to learning (ATL)', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }}],
        [{ content: topicData.topic_atl || 'No ATL skills defined', styles: { cellPadding: 3 }}],
      ],
      theme: 'grid',
      styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, valign: 'top', textColor: [0, 0, 0] } });
    yPos = pdf.lastAutoTable.finalY + 5;

    // Content & Learning process
    let learningProcessContent = '';
    if (weeklyPlans && weeklyPlans.length > 0) {
      learningProcessContent = weeklyPlans.map(week => {
        let weekText = `Week ${week.week_number}\n`;
        if (week.week_activities) weekText += week.week_activities;
        return weekText;
      }).join('\n\n');
    }

    autoTable(pdf, {
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [],
      body: [
        [
          { content: 'Content', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
          { content: 'Learning process', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
        ],
        [
          { content: '', styles: { cellPadding: 3 }, rowSpan: 2 },
          { content: learningProcessContent, styles: { cellPadding: 3 }},
        ],
        [
          { content: `Formative assessment:\n\n${topicData.topic_formative_assessment || ''}`, styles: { cellPadding: 3 }},
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, valign: 'top', textColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: availableWidth * 0.33 },
        1: { cellWidth: availableWidth * 0.67 } } });
    yPos = pdf.lastAutoTable.finalY + 5;

    // Resources section
    autoTable(pdf, {
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [],
      body: [
        [{ content: 'Resources', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }}],
        [{ content: topicData.topic_resources || '', styles: { cellPadding: 3 }}],
      ],
      theme: 'grid',
      styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, valign: 'top', textColor: [0, 0, 0] } });
    yPos = pdf.lastAutoTable.finalY + 5;

    // Reflection section
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Reflection: Considering the planning, process and impact of the inquiry', margin, yPos);
    yPos += 6;

    autoTable(pdf, {
      startY: yPos,
      margin: { left: margin, right: margin },
      head: [],
      body: [
        [
          { content: 'Prior to teaching the unit', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
          { content: 'During teaching', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
          { content: 'After teaching the unit', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
        ],
        [
          { content: topicData.topic_reflection_prior || '', styles: { cellPadding: 3 }},
          { content: topicData.topic_reflection_during || '', styles: { cellPadding: 3 }},
          { content: topicData.topic_reflection_after || '', styles: { cellPadding: 3 }},
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, valign: 'top', textColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: availableWidth * 0.33 },
        1: { cellWidth: availableWidth * 0.33 },
        2: { cellWidth: availableWidth * 0.34 } } });
    yPos = pdf.lastAutoTable.finalY + 5;

    // Remaining sections
    const sections = [
      { label: 'Differentiation', content: topicData.topic_differentiation },
    ];

    sections.forEach((section) => {
      if (section.content) {
        autoTable(pdf, {
          startY: yPos,
          head: [],
          body: [
            [{ content: section.label, styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }, colSpan: 8 }],
            [{ content: section.content, colSpan: 8, styles: { cellPadding: 3 } }],
          ],
          theme: 'grid',
          styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] }
        });
        yPos = pdf.lastAutoTable.finalY + 5;
      }
    });

    // Save PDF
    const fileName = `unit-planner-${topicData.topic_nama?.replace(/[^a-z0-9]/gi, '-') || 'topic'}.pdf`;
    pdf.save(fileName);
    
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (onError) onError(error);
    else alert(`Failed to generate PDF: ${error.message}`);
  }
};

// ─── Assessment PDF (from wizard modal) ──────────────────────────────────────

/**
 * Render criteria rubrics into a jsPDF document.
 * Shared by both wizard-based and card-based PDF generators.
 */
const renderCriteriaRubricsToPdf = (pdf, { selectedCriteriaIds, criteriaList, strandsData, rubricsData, tscMap, margin, availableWidth, startY }) => {
  let yPos = startY;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('SUBJECT CRITERIA AND TASK-SPECIFIC CLARIFICATION', margin, yPos);
  yPos += 6;

  const romanOrder = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
  const getRomanIndex = (label) => {
    const idx = romanOrder.indexOf(label.toLowerCase());
    return idx >= 0 ? idx : 999;
  };

  for (const criterionId of selectedCriteriaIds) {
    const criterion = (criteriaList || []).find(c => c.criterion_id === criterionId);
    if (!criterion) continue;

    const criterionStrands = strandsData.filter(s => s.criterion_id === criterionId);
    if (criterionStrands.length === 0) continue;

    const pageHeight = pdf.internal.pageSize.getHeight();
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      yPos = 25;
    }

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Criteria ${criterion.code}`, margin, yPos);
    yPos += 6;

    const criterionRubrics = (rubricsData || []).filter(r => 
      criterionStrands.some(s => s.strand_id === r.strand_id)
    );

    const bandGroups = {};
    criterionRubrics.forEach(rubric => {
      const bandKey = `${rubric.max_score}-${rubric.min_score}`;
      if (!bandGroups[bandKey]) {
        bandGroups[bandKey] = {
          band_label: rubric.band_label || bandKey,
          max_score: rubric.max_score,
          min_score: rubric.min_score,
          rubricsData: []
        };
      }
      const strand = criterionStrands.find(s => s.strand_id === rubric.strand_id);
      if (strand) {
        bandGroups[bandKey].rubricsData.push({
          label: strand.label || '',
          description: rubric.description || ''
        });
      }
    });

    const sortedBands = Object.values(bandGroups).sort((a, b) => b.max_score - a.max_score);
    sortedBands.forEach(band => {
      band.rubricsData.sort((a, b) => getRomanIndex(a.label) - getRomanIndex(b.label));
    });

    if (sortedBands.length > 0) {
      const tableHead = [['', 'SUBJECT CRITERIA', 'TASK-SPECIFIC CLARIFICATION']];

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const colWidth = (availableWidth - 12) / 2;
      const innerWidth = colWidth - 4;
      const spaceWidth = Math.max(0.1, pdf.getTextWidth(' '));
      const labelColWidth = pdf.getTextWidth('viii. ');
      
      const buildHangingContent = (pairs) => {
        if (!pairs || pairs.length === 0) return '';
        const lines = ['The student:'];
        for (const p of pairs) {
          const cleanText = (p?.text ?? '').toString().trim();
          if (!cleanText) continue;
          const cleanLabel = (p?.label ?? '').toString().trim();
          const labelToken = cleanLabel ? `${cleanLabel}.` : '';
          const maxDescWidth = Math.max(12, innerWidth - labelColWidth);
          const wrapped = pdf.splitTextToSize(cleanText, maxDescWidth);
          if (!wrapped || wrapped.length === 0) continue;

          const labelWidth = labelToken ? pdf.getTextWidth(labelToken) : 0;
          const padWidth = labelToken ? Math.max(0, labelColWidth - labelWidth) : 0;
          const padSpacesCount = labelToken ? Math.max(1, Math.ceil(padWidth / spaceWidth)) : 0;
          const prefix = labelToken ? `${labelToken}${' '.repeat(padSpacesCount)}` : '';
          const indentSpacesCount = Math.max(0, Math.ceil(labelColWidth / spaceWidth));
          const indent = indentSpacesCount > 0 ? ' '.repeat(indentSpacesCount) : '';

          lines.push(`${prefix}${wrapped[0]}`.trimEnd());
          for (let i = 1; i < wrapped.length; i++) {
            lines.push(`${indent}${wrapped[i]}`.trimEnd());
          }
        }
        return lines.length > 1 ? lines.join('\n') : '';
      };
      
      const tableBody = sortedBands.map(band => {
        const subjectPairs = (band.rubricsData || []).map(r => ({
          label: r.label,
          text: r.description }));
        const subjectContent = buildHangingContent(subjectPairs);
        
        const tscPairs = (band.rubricsData || []).map(r => {
          const tscKey = `${criterionId}_${band.band_label}_${r.label}`;
          const tsc = (tscMap || {})?.[tscKey] || '';
          return tsc ? { label: r.label, text: tsc } : null;
        }).filter(Boolean);
        const tscContent = tscPairs.length > 0 ? buildHangingContent(tscPairs) : '';
        
        return [band.band_label, subjectContent, tscContent];
      });

      autoTable(pdf, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: tableHead,
        body: tableBody,
        theme: 'grid',
        styles: { 
          fontSize: 8, 
          cellPadding: 2, 
          valign: 'top', 
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.2 },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center' },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: (availableWidth - 12) / 2 },
          2: { cellWidth: (availableWidth - 12) / 2 } } });
      yPos = pdf.lastAutoTable.finalY + 8;
    }
  }

  return yPos;
};

/**
 * Render assessment header + task overview into a jsPDF document.
 * Shared by wizard-based and card-based PDF generators.
 */
const renderAssessmentHeaderToPdf = (pdf, { assessmentName, subjectName, kelasName, teacherName, unitNumber, selectedCriteriaNames, proficiencyLevel, topicData, assessmentData, margin, availableWidth }) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  let yPos = 15;

  // Header
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('ASSESSMENT', margin, yPos);
  yPos += 8;

  // Info section
  pdf.setFontSize(9);
  const leftCol = margin;
  const midCol = margin + 90;
  const lineHeight = 6;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Name', leftCol, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text('', leftCol + 25, yPos);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Subject', midCol, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(subjectName, midCol + 25, yPos);
  yPos += lineHeight;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Class', leftCol, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(kelasName, leftCol + 25, yPos);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Unit', midCol, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(unitNumber, midCol + 25, yPos);
  yPos += lineHeight;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Day/Date', leftCol, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text('', leftCol + 25, yPos);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Teacher', midCol, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(teacherName, midCol + 25, yPos);
  
  // Logo and RESULT box
  const resultBoxX = pageWidth - margin - 30;
  const logoY = yPos - 20;
  const resultBoxWidth = 30;
  const resultBoxHeight = 18;
  const borderRadius = 3;
  
  try {
    const logoImg = new Image();
    logoImg.src = '/images/login-logo.png';
    pdf.addImage(logoImg, 'PNG', resultBoxX + 2, logoY, resultBoxWidth - 4, 15);
  } catch (e) {
    console.warn('Could not load logo image:', e);
  }
  
  const resultBoxY = logoY + 17;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(resultBoxX, resultBoxY, resultBoxWidth, resultBoxHeight, borderRadius, borderRadius, 'S');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text('RESULT', resultBoxX + resultBoxWidth/2, resultBoxY + resultBoxHeight + 5, { align: 'center' });
  
  yPos += 25;

  // Assessment Title
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(assessmentName.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // TASK OVERVIEW
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('TASK OVERVIEW', margin, yPos + 3);
  yPos += 8;

  const taskOverviewData = [
    ['Criterion', selectedCriteriaNames || 'N/A'],
    ['Proficiency Level', proficiencyLevel],
    ['Key Concept', topicData.topic_key_concept || 'N/A'],
    ['Related Concepts', topicData.topic_related_concept || 'N/A'],
    ['Conceptual Understanding', assessmentData.assessment_conceptual_understanding || assessmentData.conceptual_understanding || 'N/A'],
    ['Global Context Exploration', (topicData.topic_global_context || 'N/A') + (topicData.topic_gc_exploration ? ' — Explorations: ' + topicData.topic_gc_exploration : '')],
    ['Statement of Inquiry', topicData.topic_statement || 'N/A'],
    ['Task Specific Description', assessmentData.assessment_task_specific_description || assessmentData.task_specific_description || 'N/A'],
  ];

  autoTable(pdf, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [],
    body: taskOverviewData.map(row => [
      { content: row[0], styles: { fontStyle: 'bold', cellWidth: 50 }},
      { content: `: ${row[1]}`, styles: { cellWidth: availableWidth - 50 }},
    ]),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4, lineColor: [200, 200, 200], lineWidth: 0.1, valign: 'top', textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: availableWidth - 50 } } });
  
  return pdf.lastAutoTable.finalY + 8;
};

/**
 * Render instructions page into a jsPDF document.
 */
const renderInstructionsToPdf = (pdf, { instructions, margin }) => {
  let yPos = 25;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('INSTRUCTIONS:', margin, yPos);
  yPos += 8;

  const instructionText = instructions;
  const instructionItems = [];
  
  const regex = /(\d+\.\s*)/g;
  const parts = instructionText.split(regex).filter(p => p.trim());
  
  for (let i = 0; i < parts.length; i++) {
    if (/^\d+\.\s*$/.test(parts[i]) && parts[i + 1]) {
      instructionItems.push([parts[i].trim(), parts[i + 1].trim()]);
      i++;
    } else if (!/^\d+\.\s*$/.test(parts[i])) {
      instructionItems.push(['', parts[i].trim()]);
    }
  }

  autoTable(pdf, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [],
    body: instructionItems.map(item => [
      { content: item[0], styles: { fontStyle: 'bold', cellWidth: 8 }},
      { content: item[1], styles: { cellWidth: 'auto' }},
    ]),
    theme: 'plain',
    styles: { 
      fontSize: 9, 
      cellPadding: { top: 2, bottom: 2, left: 1, right: 1 }, 
      valign: 'top', 
      textColor: [0, 0, 0],
      lineWidth: 0 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 'auto' } } });
  
  return pdf.lastAutoTable.finalY + 8;
};

/**
 * Add page numbers to all pages
 */
const addPageNumbers = (pdf, margin) => {
  const totalPages = pdf.internal.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(128, 128, 128);
    pdf.text(`${i}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }
};

/**
 * Fetch teacher name from user ID.
 */
const fetchTeacherName = async (userId) => {
  if (!userId) return 'N/A';
  const { data, error } = await supabase
    .from("users")
    .select("user_nama_depan, user_nama_belakang")
    .eq("user_id", userId)
    .single();
  if (error || !data) return 'N/A';
  return `${data.user_nama_depan || ''} ${data.user_nama_belakang || ''}`.trim() || 'N/A';
};

/**
 * Fetch strands+rubrics for selected criteria and year level.
 */
const fetchStrandsAndRubrics = async (selectedCriteriaIds, yearLevel) => {
  const { data: strandsData } = await supabase
    .from('strands')
    .select('*')
    .in('criterion_id', selectedCriteriaIds)
    .eq('year_level', yearLevel)
    .order('label');

  const strandIds = (strandsData || []).map(s => s.strand_id);
  let rubricsData = [];
  if (strandIds.length > 0) {
    const { data } = await supabase
      .from('rubrics')
      .select('*')
      .in('strand_id', strandIds)
      .order('max_score', { ascending: false });
    rubricsData = data || [];
  }

  return { strandsData: strandsData || [], rubricsData };
};

// ─── Assessment PDF from Wizard ──────────────────────────────────────────────

/**
 * Generate Assessment PDF from the wizard modal.
 * @param {Object} deps - { selectedTopic, wizardAssessment, wizardCriteria, subjectMap, kelasNameMap, currentUserId, onSuccess, onError }
 */
export const generateAssessmentPDFFromWizard = async ({ selectedTopic, wizardAssessment, wizardCriteria, subjectMap, kelasNameMap, currentUserId, onSuccess, onError }) => {
  try {
    const topicData = selectedTopic;
    if (!topicData || !wizardAssessment.assessment_nama) {
      alert('Please complete assessment name first');
      return;
    }

    const subjectName = subjectMap.get(topicData.topic_subject_id) || 'N/A';
    const kelasName = kelasNameMap.get(topicData.topic_kelas_id) || 'N/A';
    const teacherName = await fetchTeacherName(currentUserId);

    const selectedCriteriaNames = wizardCriteria
      .filter(c => wizardAssessment.selected_criteria.includes(c.criterion_id))
      .map(c => c.code)
      .join('/');

    const proficiencyLevel = topicData.topic_year ? `Phase ${topicData.topic_year}` : 'N/A';

    // Try server-side HTML->PDF first
    try {
      const selectedCriteriaIds = wizardAssessment.selected_criteria || [];
      const yearLevel = topicData.topic_year || 1;
      const { strandsData, rubricsData } = await fetchStrandsAndRubrics(selectedCriteriaIds, yearLevel);

      const criteriaSections = buildAssessmentCriteriaForPdf({
        selectedCriteriaIds,
        criteriaList: wizardCriteria || [],
        strandsData,
        rubricsData,
        tscMap: wizardAssessment.assessment_tsc || {} });

      const unitName = topicData.topic_urutan
        ? `Unit ${topicData.topic_urutan}`
        : (topicData.topic_nama || 'N/A');

      const payload = {
        meta: {
          subjectName,
          kelasName,
          unitName,
          assessmentTitle: wizardAssessment.assessment_nama || '',
          teacherName,
          criteriaCodes: selectedCriteriaNames,
          proficiencyLevel,
          keyConcept: topicData.topic_key_concept || 'N/A',
          relatedConcepts: topicData.topic_related_concept || 'N/A',
          conceptualUnderstanding: wizardAssessment.assessment_conceptual_understanding || 'N/A',
          globalContext: topicData.topic_global_context || 'N/A',
          gcExploration: topicData.topic_gc_exploration || '',
          statementOfInquiry: topicData.topic_statement || 'N/A',
          taskSpecificDescription: wizardAssessment.assessment_task_specific_description || 'N/A',
          instructions: wizardAssessment.assessment_instructions || '' },
        criteria: criteriaSections };

      await openAssessmentHtml(payload);
      if (onSuccess) onSuccess();
      return;
    } catch (serverErr) {
      console.warn('Server-side assessment PDF failed, falling back to jsPDF:', serverErr);
    }

    // Fallback: jsPDF
    const pdf = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 14;
    const availableWidth = pageWidth - (margin * 2);
    const unitNumber = topicData.topic_urutan ? topicData.topic_urutan.toString() : '-';

    let yPos = renderAssessmentHeaderToPdf(pdf, {
      assessmentName: wizardAssessment.assessment_nama,
      subjectName, kelasName, teacherName, unitNumber,
      selectedCriteriaNames, proficiencyLevel,
      topicData,
      assessmentData: wizardAssessment,
      margin, availableWidth
    });

    // Instructions on page 2
    if (wizardAssessment.assessment_instructions) {
      pdf.addPage();
      yPos = renderInstructionsToPdf(pdf, { instructions: wizardAssessment.assessment_instructions, margin });
    }

    // Criteria rubrics
    const selectedCriteriaIds = wizardAssessment.selected_criteria || [];
    if (selectedCriteriaIds.length > 0) {
      const { strandsData, rubricsData } = await fetchStrandsAndRubrics(selectedCriteriaIds, topicData.topic_year || 1);
      if (strandsData.length > 0) {
        yPos = renderCriteriaRubricsToPdf(pdf, {
          selectedCriteriaIds,
          criteriaList: wizardCriteria,
          strandsData, rubricsData,
          tscMap: wizardAssessment.assessment_tsc || {},
          margin, availableWidth, startY: yPos
        });
      }
    }

    addPageNumbers(pdf, margin);

    const fileName = `assessment-${wizardAssessment.assessment_nama?.replace(/[^a-z0-9]/gi, '-') || 'assessment'}.pdf`;
    pdf.save(fileName);
    
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error('Error generating Assessment PDF:', error);
    if (onError) onError(error);
    else alert(`Failed to generate Assessment PDF: ${error.message}`);
  }
};

// ─── Assessment Word from Wizard ─────────────────────────────────────────────

/**
 * Export Assessment to Word from the wizard modal.
 * @param {Object} deps - { selectedTopic, wizardAssessment, wizardCriteria, subjectMap, kelasNameMap, currentUserId, onSuccess, onError }
 */
export const exportAssessmentWordFromWizard = async ({ selectedTopic, wizardAssessment, wizardCriteria, subjectMap, kelasNameMap, currentUserId, onSuccess, onError }) => {
  try {
    const topicData = selectedTopic;
    if (!topicData || !wizardAssessment.assessment_nama) {
      alert('Please complete assessment name first');
      return;
    }

    const subjectName = subjectMap.get(topicData.topic_subject_id) || 'N/A';
    const kelasName = kelasNameMap.get(topicData.topic_kelas_id) || 'N/A';
    const teacherName = await fetchTeacherName(currentUserId);

    const selectedCriteriaNames = wizardCriteria
      .filter(c => wizardAssessment.selected_criteria.includes(c.criterion_id))
      .map(c => c.code)
      .join('/');

    const proficiencyLevel = topicData.topic_year ? `Phase ${topicData.topic_year}` : 'N/A';

    const selectedCriteriaIds = wizardAssessment.selected_criteria || [];
    const yearLevel = topicData.topic_year || 1;
    const { strandsData, rubricsData } = await fetchStrandsAndRubrics(selectedCriteriaIds, yearLevel);

    const criteriaSections = buildAssessmentCriteriaForPdf({
      selectedCriteriaIds,
      criteriaList: wizardCriteria || [],
      strandsData,
      rubricsData,
      tscMap: wizardAssessment.assessment_tsc || {} });

    const unitName = topicData.topic_urutan
      ? `Unit ${topicData.topic_urutan}`
      : (topicData.topic_nama || 'N/A');

    const payload = {
      meta: {
        subjectName, kelasName, unitName,
        assessmentTitle: wizardAssessment.assessment_nama || '',
        teacherName,
        criteriaCodes: selectedCriteriaNames,
        proficiencyLevel,
        keyConcept: topicData.topic_key_concept || 'N/A',
        relatedConcepts: topicData.topic_related_concept || 'N/A',
        conceptualUnderstanding: wizardAssessment.assessment_conceptual_understanding || 'N/A',
        globalContext: topicData.topic_global_context || 'N/A',
        gcExploration: topicData.topic_gc_exploration || '',
        statementOfInquiry: topicData.topic_statement || 'N/A',
        taskSpecificDescription: wizardAssessment.assessment_task_specific_description || 'N/A',
        instructions: wizardAssessment.assessment_instructions || '' },
      criteria: criteriaSections };

    const fileName = `assessment-${wizardAssessment.assessment_nama?.replace(/[^a-z0-9]/gi, '-') || 'assessment'}.docx`;
    await downloadAssessmentDocx(payload, fileName);

    if (onSuccess) onSuccess();
  } catch (error) {
    console.error('Error exporting Assessment to Word:', error);
    if (onError) onError(error);
    else alert(`Failed to export Assessment to Word: ${error.message}`);
  }
};

// ─── Assessment PDF from Card ────────────────────────────────────────────────

/**
 * Generate Assessment PDF from a topic card (fetches data from database).
 * @param {Object} topic - The topic object
 * @param {Object} deps - { subjectMap, kelasNameMap, currentUserId, onSuccess, onError }
 */
export const generateAssessmentPDFFromCard = async (topic, { subjectMap, kelasNameMap, currentUserId, onSuccess, onError }) => {
  try {
    // Fetch assessment data
    const { data: assessmentData, error: assessmentErr } = await supabase
      .from('assessment')
      .select(`
        assessment_id,
        assessment_nama,
        assessment_keterangan,
        assessment_semester,
        assessment_conceptual_understanding,
        assessment_task_specific_description,
        assessment_instructions,
        assessment_tsc,
        assessment_criteria (criterion_id)
      `)
      .eq('assessment_topic_id', topic.topic_id)
      .single();
    
    if (assessmentErr || !assessmentData) {
      alert('No assessment found for this unit. Please create an assessment first.');
      return;
    }

    const subjectName = subjectMap.get(topic.topic_subject_id) || 'N/A';
    const kelasName = kelasNameMap.get(topic.topic_kelas_id) || 'N/A';
    const teacherName = await fetchTeacherName(currentUserId);

    // Get criteria
    const { data: criteriaData } = await supabase
      .from('criteria')
      .select('criterion_id, code, name')
      .eq('subject_id', topic.topic_subject_id)
      .order('code');
    
    const criteriaIds = assessmentData.assessment_criteria?.map(ac => ac.criterion_id) || [];
    const selectedCriteriaNames = (criteriaData || [])
      .filter(c => criteriaIds.includes(c.criterion_id))
      .map(c => c.code)
      .join('/');

    const proficiencyLevel = topic.topic_year ? `Phase ${topic.topic_year}` : 'N/A';

    // Try server-side HTML->PDF first
    try {
      const { strandsData, rubricsData } = await fetchStrandsAndRubrics(criteriaIds, topic.topic_year || 1);

      const criteriaSections = buildAssessmentCriteriaForPdf({
        selectedCriteriaIds: criteriaIds,
        criteriaList: criteriaData || [],
        strandsData,
        rubricsData,
        tscMap: assessmentData.assessment_tsc || {} });

      const unitName = topic.topic_urutan
        ? `Unit ${topic.topic_urutan}`
        : (topic.topic_nama || 'N/A');

      const payload = {
        meta: {
          subjectName, kelasName, unitName,
          assessmentTitle: assessmentData.assessment_nama || '',
          teacherName,
          criteriaCodes: selectedCriteriaNames,
          proficiencyLevel,
          keyConcept: topic.topic_key_concept || 'N/A',
          relatedConcepts: topic.topic_related_concept || 'N/A',
          conceptualUnderstanding: assessmentData.assessment_conceptual_understanding || 'N/A',
          globalContext: topic.topic_global_context || 'N/A',
          gcExploration: topic.topic_gc_exploration || '',
          statementOfInquiry: topic.topic_statement || 'N/A',
          taskSpecificDescription: assessmentData.assessment_task_specific_description || 'N/A',
          instructions: assessmentData.assessment_instructions || '' },
        criteria: criteriaSections };

      await openAssessmentHtml(payload);
      if (onSuccess) onSuccess();
      return;
    } catch (serverErr) {
      console.warn('Server-side assessment PDF failed, falling back to jsPDF:', serverErr);
    }

    // Fallback: jsPDF
    const pdf = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const availableWidth = pageWidth - (margin * 2);
    const unitNumber = topic.topic_urutan ? topic.topic_urutan.toString() : '-';

    let yPos = renderAssessmentHeaderToPdf(pdf, {
      assessmentName: assessmentData.assessment_nama,
      subjectName, kelasName, teacherName, unitNumber,
      selectedCriteriaNames, proficiencyLevel,
      topicData: topic,
      assessmentData,
      margin, availableWidth
    });

    // Instructions on page 2
    if (assessmentData.assessment_instructions) {
      pdf.addPage();
      yPos = renderInstructionsToPdf(pdf, { instructions: assessmentData.assessment_instructions, margin });
    }

    // Criteria rubrics
    if (criteriaIds.length > 0) {
      const { data: criteriaDetails } = await supabase
        .from('criteria')
        .select('criterion_id, code, name')
        .in('criterion_id', criteriaIds);

      const { strandsData, rubricsData } = await fetchStrandsAndRubrics(criteriaIds, topic.topic_year || 1);

      if (strandsData.length > 0) {
        yPos = renderCriteriaRubricsToPdf(pdf, {
          selectedCriteriaIds: criteriaIds,
          criteriaList: criteriaDetails || [],
          strandsData, rubricsData,
          tscMap: assessmentData.assessment_tsc || {},
          margin, availableWidth, startY: yPos
        });
      }
    }

    addPageNumbers(pdf, margin);

    const fileName = `assessment-${assessmentData.assessment_nama?.replace(/[^a-z0-9]/gi, '-') || 'assessment'}.pdf`;
    pdf.save(fileName);
    
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error('Error generating Assessment PDF:', error);
    if (onError) onError(error);
    else alert(`Failed to generate Assessment PDF: ${error.message}`);
  }
};

// ─── Assessment Word from Card ───────────────────────────────────────────────

/**
 * Export assessment to Word from a topic card.
 * @param {Object} topic - The topic object
 * @param {Object} deps - { subjectMap, kelasNameMap, currentUserId, onSuccess, onError }
 */
export const exportAssessmentWordFromCard = async (topic, { subjectMap, kelasNameMap, currentUserId, onSuccess, onError }) => {
  try {
    const { data: assessmentData, error: assessmentErr } = await supabase
      .from('assessment')
      .select(`
        assessment_id,
        assessment_nama,
        assessment_keterangan,
        assessment_semester,
        assessment_conceptual_understanding,
        assessment_task_specific_description,
        assessment_instructions,
        assessment_tsc,
        assessment_criteria (criterion_id)
      `)
      .eq('assessment_topic_id', topic.topic_id)
      .single();
    
    if (assessmentErr || !assessmentData) {
      alert('No assessment found for this unit. Please create an assessment first.');
      return;
    }

    const subjectName = subjectMap.get(topic.topic_subject_id) || 'N/A';
    const kelasName = kelasNameMap.get(topic.topic_kelas_id) || 'N/A';
    const teacherName = await fetchTeacherName(currentUserId);

    const { data: criteriaData } = await supabase
      .from('criteria')
      .select('criterion_id, code, name')
      .eq('subject_id', topic.topic_subject_id)
      .order('code');
    
    const criteriaIds = assessmentData.assessment_criteria?.map(ac => ac.criterion_id) || [];
    const selectedCriteriaNames = (criteriaData || [])
      .filter(c => criteriaIds.includes(c.criterion_id))
      .map(c => c.code)
      .join('/');

    const proficiencyLevel = topic.topic_year ? `Phase ${topic.topic_year}` : 'N/A';

    const { strandsData, rubricsData } = await fetchStrandsAndRubrics(criteriaIds, topic.topic_year || 1);

    const criteriaStructure = buildAssessmentCriteriaForPdf({
      selectedCriteriaIds: criteriaIds,
      criteriaList: criteriaData || [],
      strandsData,
      rubricsData,
      tscMap: assessmentData.assessment_tsc || {}
    });

    const payload = {
      meta: {
        subjectName, kelasName,
        unitName: topic.topic_urutan ? topic.topic_urutan.toString() : '-',
        assessmentTitle: assessmentData.assessment_nama || '',
        teacherName,
        criteriaCodes: selectedCriteriaNames,
        proficiencyLevel,
        keyConcept: topic.topic_key_concept || '',
        relatedConcepts: topic.topic_related_concept || '',
        conceptualUnderstanding: assessmentData.assessment_conceptual_understanding || topic.topic_conceptual_understanding || '',
        globalContext: topic.topic_global_context || '',
        gcExploration: topic.topic_gc_exploration || '',
        statementOfInquiry: topic.topic_statement || '',
        taskSpecificDescription: assessmentData.assessment_task_specific_description || '',
        instructions: assessmentData.assessment_instructions || '' },
      criteria: criteriaStructure };

    const fileName = `${assessmentData.assessment_nama.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
    await downloadAssessmentDocx(payload, fileName);

    if (onSuccess) onSuccess();
  } catch (error) {
    console.error('Error exporting Word:', error);
    if (onError) onError(error);
    else alert('Failed to export Word document. Check console for details.');
  }
};

// ─── Student Report HTML ─────────────────────────────────────────────────────

/**
 * Generate student progress report as a printable HTML window.
 * @param {Object} deps - { reportFilters, reportStudents, reportKelasOptions, reportYears, setLoadingReport, onError }
 */
export const generateStudentReportHTML = async ({ reportFilters, reportStudents, reportKelasOptions, reportYears, setLoadingReport, onError }) => {
  if (!reportFilters.kelas || !reportFilters.student) {
    alert('Silakan pilih kelas dan siswa terlebih dahulu');
    return;
  }

  try {
    setLoadingReport(true);
    
    const studentId = parseInt(reportFilters.student);
    const kelasId = parseInt(reportFilters.kelas);
    
    const student = reportStudents.find(s => s.detail_siswa_id === studentId);
    const studentName = student?.nama || 'Unknown';
    const kelasName = reportKelasOptions.find(k => k.kelas_id === kelasId)?.kelas_nama || '';
    const yearName = reportYears.find(y => y.year_id === parseInt(reportFilters.year))?.year_name || '';
    const semester = reportFilters.semester || '1';
    const semesterLabel = semester === '1' ? 'Semester 1' : 'Semester 2';

    // Fetch kelas info for homeroom teacher
    const { data: kelasData } = await supabase
      .from('kelas')
      .select('kelas_user_id')
      .eq('kelas_id', kelasId)
      .single();

    let homeroomTeacherName = '-';
    if (kelasData?.kelas_user_id) {
      const { data: htData } = await supabase
        .from('users')
        .select('user_nama_depan, user_nama_belakang')
        .eq('user_id', kelasData.kelas_user_id)
        .single();
      if (htData) {
        homeroomTeacherName = `${htData.user_nama_depan} ${htData.user_nama_belakang}`.trim();
      }
    }

    // Fetch detail_kelas with subject info + icon
    const { data: detailKelasData, error: dkError } = await supabase
      .from('detail_kelas')
      .select(`
        detail_kelas_id,
        detail_kelas_subject_id,
        subject:detail_kelas_subject_id (
          subject_id,
          subject_name,
          subject_user_id,
          subject_icon
        )
      `)
      .eq('detail_kelas_kelas_id', kelasId);
    
    if (dkError) throw dkError;
    
    // Get student's user_id for subject_comment lookup
    const { data: detailSiswaData } = await supabase
      .from('detail_siswa')
      .select('detail_siswa_user_id')
      .eq('detail_siswa_id', studentId)
      .single();
    const studentUserId = detailSiswaData?.detail_siswa_user_id;

    // Fetch student DOB
    let studentDOB = '-';
    if (studentUserId) {
      const { data: studentUserData } = await supabase
        .from('users')
        .select('user_birth_date')
        .eq('user_id', studentUserId)
        .single();
      if (studentUserData?.user_birth_date) {
        studentDOB = new Date(studentUserData.user_birth_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    }

    // Load logo as base64
    let logoBase64 = '';
    try {
      const logoResponse = await fetch('/images/login-logo.png');
      const logoBlob = await logoResponse.blob();
      logoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(logoBlob);
      });
    } catch (e) {
      console.warn('Could not load logo:', e);
    }
    
    const reportRows = [];
    
    for (const dk of detailKelasData || []) {
      if (!dk.subject) continue;
      
      // Fetch teacher name
      let teacherName = '-';
      if (dk.subject.subject_user_id) {
        const { data: teacherData } = await supabase
          .from('users')
          .select('user_nama_depan, user_nama_belakang')
          .eq('user_id', dk.subject.subject_user_id)
          .single();
        if (teacherData) {
          teacherName = `${teacherData.user_nama_depan} ${teacherData.user_nama_belakang}`.trim();
        }
      }
      
      // Fetch approved assessments for this subject + semester
      const { data: assessmentsData, error: aError } = await supabase
        .from('assessment')
        .select('assessment_id')
        .eq('assessment_detail_kelas_id', dk.detail_kelas_id)
        .eq('assessment_status', 1)
        .eq('assessment_semester', parseInt(semester));
      
      if (aError) continue;
      
      const assessmentIds = (assessmentsData || []).map(a => a.assessment_id);
      
      let grades = { A: null, B: null, C: null, D: null };
      let semesterOverview = null;
      
      if (assessmentIds.length > 0) {
        const { data: gradesData, error: gError } = await supabase
          .from('assessment_grades')
          .select('criterion_a_grade, criterion_b_grade, criterion_c_grade, criterion_d_grade, final_grade')
          .eq('detail_siswa_id', studentId)
          .in('assessment_id', assessmentIds);
        
        if (!gError && gradesData && gradesData.length > 0) {
          const allA = gradesData.map(g => g.criterion_a_grade).filter(g => g !== null);
          const allB = gradesData.map(g => g.criterion_b_grade).filter(g => g !== null);
          const allC = gradesData.map(g => g.criterion_c_grade).filter(g => g !== null);
          const allD = gradesData.map(g => g.criterion_d_grade).filter(g => g !== null);
          const allFinal = gradesData.map(g => g.final_grade).filter(g => g !== null);
          
          grades.A = allA.length > 0 ? Math.max(...allA) : null;
          grades.B = allB.length > 0 ? Math.max(...allB) : null;
          grades.C = allC.length > 0 ? Math.max(...allC) : null;
          grades.D = allD.length > 0 ? Math.max(...allD) : null;
          semesterOverview = allFinal.length > 0 ? Math.round(allFinal.reduce((a, b) => a + b, 0) / allFinal.length) : null;
        }
      }
      
      // Fetch subject_comment from dedicated table
      let comment = '';
      if (studentUserId) {
        const { data: commentData } = await supabase
          .from('subject_comment')
          .select('comment_text')
          .eq('subject_id', dk.subject.subject_id)
          .eq('kelas_id', kelasId)
          .eq('student_user_id', studentUserId)
          .eq('semester', parseInt(semester))
          .single();
        comment = commentData?.comment_text || '';
      }
      
      reportRows.push({
        subject_name: dk.subject.subject_name,
        subject_icon: dk.subject.subject_icon || null,
        teacher_name: teacherName,
        grades,
        semester_overview: semesterOverview,
        comment
      });
    }
    
    reportRows.sort((a, b) => a.subject_name.localeCompare(b.subject_name));
    
    if (reportRows.length === 0) {
      alert('Tidak ada data report untuk siswa ini');
      return;
    }

    // Preload subject icons as base64
    const loadImgBase64 = async (url) => {
      try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch { return null; }
    };

    const iconCache = {};
    for (let i = 0; i < reportRows.length; i++) {
      if (reportRows[i].subject_icon) {
        iconCache[i] = await loadImgBase64(reportRows[i].subject_icon);
      }
    }

    // ─── Build PDF with jsPDF ─────────────────────────────────────────────
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pw = doc.internal.pageSize.getWidth();   // 210
    const ph = doc.internal.pageSize.getHeight();   // 297
    const ml = 18, mr = 18, mt = 16, mb = 24;
    const cw = pw - ml - mr; // content width

    const preparedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    // ── Helper: draw footer on current page ──
    const drawFooter = () => {
      const fy = ph - 12;
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.3);
      doc.line(ml, fy - 3, pw - mr, fy - 3);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(31, 41, 55);
      doc.text(studentName, pw / 2, fy, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(156, 163, 175);
      doc.text('Chung Chung Christian School - Middle School Report', pw / 2, fy + 4, { align: 'center' });
    };

    // ── Helper: draw letter avatar circle ──
    const drawLetterAvatar = (x, y, letter) => {
      doc.setFillColor(219, 234, 254);
      doc.circle(x + 4, y + 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 64, 175);
      doc.text(letter, x + 4, y + 5.5, { align: 'center' });
    };

    // ══════════════════════════════════════════════
    // PAGE 1: COVER
    // ══════════════════════════════════════════════
    let y = mt;

    // Logo + title side by side (resize by height only, preserve aspect ratio)
    let logoW = 0;
    if (logoBase64) {
      try {
        const logoH = 26;
        const imgProps = doc.getImageProperties(logoBase64);
        logoW = (imgProps.width / imgProps.height) * logoH;
        doc.addImage(logoBase64, 'PNG', ml, y, logoW, logoH);
      } catch (e) { logoW = 0; }
    }
    const txStart = ml + (logoW > 0 ? logoW + 6 : 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 95);
    doc.text('Middle School Report', txStart, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.text('Chung Chung Christian School', txStart, y + 17);
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text(`Prepared on ${preparedDate}`, txStart, y + 23);

    // Divider
    y += 30;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.4);
    doc.line(ml, y, pw - mr, y);

    // Student name
    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(17, 24, 39);
    doc.text(studentName, ml, y);

    // Info row: Grade | Date of Birth | Homeroom Teacher
    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(130, 150, 171);
    doc.text('Grade', ml, y);
    doc.text('Date of Birth', ml + 48, y);
    doc.text('Homeroom Teacher', ml + 110, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(31, 41, 55);
    doc.text(kelasName, ml, y);
    doc.text(studentDOB, ml + 48, y);
    doc.text(homeroomTeacherName, ml + 110, y);

    // Dear Parents letter
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(55, 65, 81);
    doc.text('Dear Parents,', ml, y);
    y += 8;

    const paragraphs = [
      `This report is designed to share meaningful feedback about your child's learning journey during ${semesterLabel}. It reflects their engagement, growth, and progress across all subject areas, guided by the principles of the IB Middle Years Programme.`,
      'We encourage you to review the report together with your child and discuss areas of strength and opportunities for growth. Please do not hesitate to contact us should you have any questions or wish to arrange a conference.',
      "Thank you for your continued partnership in your child's education."
    ];
    for (const p of paragraphs) {
      const lines = doc.splitTextToSize(p, cw);
      doc.text(lines, ml, y);
      y += lines.length * 4.5 + 4;
    }

    // Kind regards + signature
    y += 4;
    doc.text('Kind regards,', ml, y);
    y += 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text('Edwin Arlianto', ml, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);
    doc.text('HS Principal', ml, y);

    // No footer on cover page

    // ══════════════════════════════════════════════
    // PAGE 2+: GRADES TABLE
    // ══════════════════════════════════════════════
    doc.addPage();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text(`Summary of ${semesterLabel} Student Progress`, ml, mt + 6);

    // Build table body — one row per subject
    const tableBody = [];
    reportRows.forEach((row, i) => {
      let cellText = row.subject_name + '\n' + row.teacher_name;
      if (row.comment) cellText += '\n' + row.comment;
      tableBody.push([
        cellText,
        row.grades.A !== null ? String(row.grades.A) : '-',
        row.grades.B !== null ? String(row.grades.B) : '-',
        row.grades.C !== null ? String(row.grades.C) : '-',
        row.grades.D !== null ? String(row.grades.D) : '-',
        row.semester_overview !== null ? String(row.semester_overview) : '-'
      ]);
    });

    autoTable(doc, {
      startY: mt + 12,
      head: [['', 'A', 'B', 'C', 'D', `${semesterLabel}\nProgress\nOverview`]],
      body: tableBody,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: { top: 5, right: 2, bottom: 5, left: 2 },
        lineColor: [209, 213, 219],
        lineWidth: 0.3,
        textColor: [31, 41, 55],
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [107, 114, 128],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: { top: 3, right: 2, bottom: 3, left: 2 }
      },
      columnStyles: {
        0: { cellWidth: 'auto', cellPadding: { top: 5, right: 3, bottom: 5, left: 14 }, textColor: [255, 255, 255] },
        1: { cellWidth: 12, halign: 'center', fontStyle: 'bold', valign: 'top' },
        2: { cellWidth: 12, halign: 'center', fontStyle: 'bold', valign: 'top' },
        3: { cellWidth: 12, halign: 'center', fontStyle: 'bold', valign: 'top' },
        4: { cellWidth: 12, halign: 'center', fontStyle: 'bold', valign: 'top' },
        5: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [30, 64, 175], valign: 'top' }
      },
      tableLineColor: [209, 213, 219],
      tableLineWidth: 0.3,
      margin: { left: ml, right: mr, top: mt, bottom: mb },
      didDrawCell: (data) => {
        // Custom render subject column (col 0, body only)
        if (data.column.index === 0 && data.cell.section === 'body') {
          const row = reportRows[data.row.index];
          const cx = data.cell.x;
          const cy = data.cell.y;

          // Draw icon or letter avatar
          const iconX = cx + 2;
          const iconY = cy + 4;
          const iconB64 = iconCache[data.row.index];
          if (iconB64) {
            try { doc.addImage(iconB64, 'PNG', iconX, iconY, 8, 8); } catch (e) {}
          } else {
            drawLetterAvatar(iconX, iconY, row.subject_name.charAt(0).toUpperCase());
          }

          // Subject name (bold)
          const textX = cx + 14;
          let textY = cy + 7;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(30, 58, 95);
          doc.text(row.subject_name, textX, textY);

          // Teacher name (normal, gray)
          textY += 4.5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(107, 114, 128);
          doc.text(row.teacher_name, textX, textY);

          // Comment (normal, dark)
          if (row.comment) {
            textY += 5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(55, 65, 81);
            const maxW = data.cell.width - 16;
            const commentLines = doc.splitTextToSize(row.comment, maxW);
            doc.text(commentLines, textX, textY);
          }
        }
      },
      didDrawPage: () => {
        drawFooter();
      }
    });

    // Open PDF in new tab
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
    
  } catch (err) {
    console.error('Error generating report:', err);
    if (onError) onError(err);
    else alert('Gagal menghasilkan report: ' + err.message);
  } finally {
    setLoadingReport(false);
  }
};

// ─── Class Recap PDF ─────────────────────────────────────────────────────────

/**
 * Generate class recap PDF.
 * @param {Object} deps - { kelasId, semester, subjectId, assessmentKelasOptions, subjects, setLoadingClassRecap, onError }
 */
export const generateClassRecapPDFReport = async ({ kelasId, semester, subjectId, assessmentKelasOptions, subjects, setLoadingClassRecap, onError }) => {
  if (!kelasId) {
    alert('Silakan pilih kelas terlebih dahulu');
    return;
  }
  
  if (!subjectId) {
    alert('Silakan pilih mata pelajaran terlebih dahulu');
    return;
  }
  
  try {
    setLoadingClassRecap(true);
    
    const parsedKelasId = parseInt(kelasId);
    const parsedSubjectId = parseInt(subjectId);
    const semesterFilter = semester ? parseInt(semester) : null;
    
    const kelasInfo = assessmentKelasOptions.find(k => k.kelas_id === parsedKelasId);
    const kelasName = kelasInfo?.kelas_nama || 'Unknown Class';
    const subjectInfo = subjects.find(s => s.subject_id === parsedSubjectId);
    const subjectName = subjectInfo?.subject_name || 'Unknown Subject';
    
    // Get all students in this class
    const { data: detailSiswaData, error: dsError } = await supabase
      .from('detail_siswa')
      .select('detail_siswa_id, detail_siswa_user_id')
      .eq('detail_siswa_kelas_id', parsedKelasId);
    
    if (dsError) throw dsError;
    
    const userIds = [...new Set(detailSiswaData.map(ds => ds.detail_siswa_user_id))];
    
    let userMap = new Map();
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang')
        .in('user_id', userIds);
      
      if (!usersError && usersData) {
        usersData.forEach(u => {
          userMap.set(u.user_id, `${u.user_nama_depan} ${u.user_nama_belakang}`.trim());
        });
      }
    }
    
    const students = detailSiswaData.map(ds => ({
      detail_siswa_id: ds.detail_siswa_id,
      user_id: ds.detail_siswa_user_id,
      nama: userMap.get(ds.detail_siswa_user_id) || 'Unknown'
    })).sort((a, b) => a.nama.localeCompare(b.nama));
    
    // Get detail_kelas
    const { data: detailKelasData, error: dkError } = await supabase
      .from('detail_kelas')
      .select('detail_kelas_id')
      .eq('detail_kelas_kelas_id', parsedKelasId)
      .eq('detail_kelas_subject_id', parsedSubjectId);
    
    if (dkError) throw dkError;
    
    const detailKelasIds = detailKelasData.map(dk => dk.detail_kelas_id);
    
    if (detailKelasIds.length === 0) {
      alert('Tidak ada data mata pelajaran untuk kelas ini.');
      return;
    }
    
    // Get approved assessments
    let assessmentQuery = supabase
      .from('assessment')
      .select('assessment_id, assessment_nama, assessment_tanggal, assessment_semester')
      .in('assessment_detail_kelas_id', detailKelasIds)
      .eq('assessment_status', 1)
      .order('assessment_tanggal', { ascending: true });
    
    if (semesterFilter) {
      assessmentQuery = assessmentQuery.eq('assessment_semester', semesterFilter);
    }
    
    const { data: assessmentsData, error: aError } = await assessmentQuery;
    
    if (aError) throw aError;
    
    if (!assessmentsData || assessmentsData.length === 0) {
      alert(`Tidak ada assessment yang sudah disetujui untuk ${subjectName} di kelas ini${semesterFilter ? ` pada semester ${semesterFilter}` : ''}.`);
      return;
    }
    
    const assessmentIds = assessmentsData.map(a => a.assessment_id);
    
    // Get all grades
    const { data: gradesData, error: gError } = await supabase
      .from('assessment_grades')
      .select('assessment_id, detail_siswa_id, criterion_a_grade, criterion_b_grade, criterion_c_grade, criterion_d_grade')
      .in('assessment_id', assessmentIds);
    
    if (gError) throw gError;
    
    const gradesMap = {};
    assessmentIds.forEach(aid => { gradesMap[aid] = {}; });
    
    if (gradesData) {
      gradesData.forEach(g => {
        gradesMap[g.assessment_id][g.detail_siswa_id] = {
          A: g.criterion_a_grade,
          B: g.criterion_b_grade,
          C: g.criterion_c_grade,
          D: g.criterion_d_grade
        };
      });
    }
    
    // Generate PDF
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rekap Nilai: ${subjectName} - ${kelasName}`, 14, 15);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${semesterFilter ? `Semester ${semesterFilter} • ` : ''}Generated: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 22);
    
    let yPosition = 30;
    
    assessmentsData.forEach((assessment, idx) => {
      if (yPosition > 170) { doc.addPage(); yPosition = 15; }
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}. ${assessment.assessment_nama}`, 14, yPosition);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const dateStr = new Date(assessment.assessment_tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.text(`${dateStr}${assessment.assessment_semester ? ` • Semester ${assessment.assessment_semester}` : ''}`, 14, yPosition + 5);
      
      yPosition += 10;
      
      const tableData = students.map((student, sIdx) => {
        const grades = gradesMap[assessment.assessment_id]?.[student.detail_siswa_id] || {};
        return [
          sIdx + 1,
          student.nama,
          grades.A !== null && grades.A !== undefined ? grades.A : '-',
          grades.B !== null && grades.B !== undefined ? grades.B : '-',
          grades.C !== null && grades.C !== undefined ? grades.C : '-',
          grades.D !== null && grades.D !== undefined ? grades.D : '-',
          ''
        ];
      });
      
      autoTable(doc, {
        startY: yPosition,
        head: [['No', 'Nama Siswa', 'Crit. A', 'Crit. B', 'Crit. C', 'Crit. D', 'Final']],
        body: tableData,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 18, halign: 'center' },
          5: { cellWidth: 18, halign: 'center' },
          6: { cellWidth: 18, halign: 'center' }
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 14, right: 14 }
      });
      
      yPosition = doc.lastAutoTable.finalY + 10;
    });
    
    const fileName = `rekap-nilai-${subjectName.replace(/\s+/g, '-').toLowerCase()}-${kelasName.replace(/\s+/g, '-').toLowerCase()}${semesterFilter ? `-sem${semesterFilter}` : ''}.pdf`;
    doc.save(fileName);
    
  } catch (err) {
    console.error('Error generating class recap PDF:', err);
    if (onError) onError(err);
    else alert('Gagal membuat PDF rekap: ' + err.message);
  } finally {
    setLoadingClassRecap(false);
  }
};
