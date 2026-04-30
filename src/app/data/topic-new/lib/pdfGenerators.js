/**
 * PDF / Document generation utilities for Topic New page.
 * 
 * Extracted from page.jsx to reduce file size.
 * All functions are pure — they receive dependencies (supabase, jsPDF, etc.) as parameters.
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '@/lib/supabase'
import JSZip from 'jszip'

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

// ─── Build Single Student Report PDF ────────────────────────────────────────

/**
 * Build a single student report as a PDF.
 * Returns a Blob of the generated PDF.
 * Extracted from generateStudentReportHTML to enable both single and batch generation.
 */
const buildStudentReportPDF = ({
  studentName, studentFirstName, studentDOB,
  kelasName, semester, semesterLabel, yearName,
  homeroomTeacherName, unitPrincipalName, unitPrincipalTitle, unitGreeting, unitReportDate,
  logoBase64, reportRows, iconCache, iconBySubjectId,
  criteriaNameCache, descriptorCache, mentorComment,
  semester1Rows
}) => {
const doc = new jsPDF('portrait', 'mm', 'a4');
const pw = doc.internal.pageSize.getWidth();   // 210
const ph = doc.internal.pageSize.getHeight();   // 297
const ml = 18, mr = 18, mt = 16, mb = 24;
const cw = pw - ml - mr; // content width

const preparedDate = unitReportDate
  ? new Date(unitReportDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  : new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

// ── Helper: draw footer on current page ──
const drawFooter = () => {
  const fy = ph - 12;
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.line(ml, fy - 3, pw - mr, fy - 3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.text(studentName, ml, fy);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text('Chung Chung Christian School - Middle School Report', ml, fy + 4);
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

// Divider removed — no line after header

// Student name
y += 40;
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
doc.setTextColor(17, 24, 39);
const lineH = 5.2; // line height for greeting text

// Helper: render one paragraph justified (last line or short lines = left-aligned)
const drawJustifiedParagraph = (text, addGapAfter = true) => {
  const lines = doc.splitTextToSize(text, cw);
  lines.forEach((line, idx) => {
    const isLast = idx === lines.length - 1;
    const words = line.trimEnd().split(' ');
    const lineW = doc.getTextWidth(line.trimEnd());
    const isShort = lineW < cw * 0.75; // don't justify lines shorter than 75% of width
    if (isLast || words.length <= 1 || isShort) {
      doc.text(line, ml, y);
    } else {
      const textOnlyW = doc.getTextWidth(words.join(''));
      const spaceW = (cw - textOnlyW) / (words.length - 1);
      let xPos = ml;
      words.forEach((word) => {
        doc.text(word, xPos, y);
        xPos += doc.getTextWidth(word) + spaceW;
      });
    }
    y += lineH;
  });
  if (addGapAfter) y += 3;
};

const defaultParagraphs = [
  `Dear Parents,`,
  `This report is designed to share meaningful feedback about your child's learning journey during ${semesterLabel}. It reflects their engagement, growth, and progress across all subject areas, guided by the principles of the IB Middle Years Programme.`,
  'We encourage you to review the report together with your child and discuss areas of strength and opportunities for growth. Please do not hesitate to contact us should you have any questions or wish to arrange a conference.',
  "Thank you for your continued partnership in your child's education."
];

// Use custom greeting from unit if available, otherwise default paragraphs
if (unitGreeting) {
  const greetingText = unitGreeting.replace(/\{semester\}/g, semesterLabel);
  drawJustifiedParagraph(greetingText);
} else {
  for (const p of defaultParagraphs) {
    drawJustifiedParagraph(p);
  }
}

// Kind regards + signature
y += 4;
doc.text('Kind regards,', ml, y);
y += 22;
if (unitPrincipalName) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text(unitPrincipalName, ml, y);
  y += 5;
}
if (unitPrincipalTitle) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text(unitPrincipalTitle, ml, y);
}

// No footer on cover page

// ══════════════════════════════════════════════
// PAGE 2+: GRADES TABLE
// ══════════════════════════════════════════════
doc.addPage();

doc.setFont('helvetica', 'bold');
doc.setFontSize(14);
doc.setTextColor(17, 24, 39);
doc.text(`Summary of ${semesterLabel} Student Progress`, ml, mt + 6);

// Build table body helper — one row per subject, optional comment row (colSpan 6)
const buildTableData = (rows, indexOffset) => {
  const body = [];
  const meta = [];
  rows.forEach((row, i) => {
    const si = indexOffset + i;
    const cellText = row.subject_name + '\n' + row.teacher_name;
    body.push([
      cellText,
      row.grades.A !== null ? String(row.grades.A) : '-',
      row.grades.B !== null ? String(row.grades.B) : '-',
      row.grades.C !== null ? String(row.grades.C) : '-',
      row.grades.D !== null ? String(row.grades.D) : '-',
      row.semester_overview !== null ? String(row.semester_overview) : '-'
    ]);
    meta.push({ isComment: false, subjectIndex: si });
    if (row.comment) {
      body.push([{
        content: row.comment,
        colSpan: 6,
        styles: {
          fontSize: 9,
          fontStyle: 'normal',
          cellPadding: { top: 5, right: 4, bottom: 5, left: 4 },
          textColor: [255, 255, 255],
          overflow: 'linebreak'
        }
      }]);
      meta.push({ isComment: true, subjectIndex: si });
    }
  });
  return { body, meta };
};

// Build non-core table body — 2 columns only: subject name + final grade + optional comment
const buildNonCoreTableData = (rows, indexOffset) => {
  const body = [];
  const meta = [];
  rows.forEach((row, i) => {
    const si = indexOffset + i;
    body.push([
      row.subject_name + '\n' + row.teacher_name,
      row.semester_overview !== null ? String(row.semester_overview) : '-'
    ]);
    meta.push({ isComment: false, subjectIndex: si });
    if (row.comment) {
      body.push([{
        content: row.comment,
        colSpan: 2,
        styles: {
          fontSize: 9,
          fontStyle: 'normal',
          cellPadding: { top: 5, right: 4, bottom: 5, left: 4 },
          textColor: [255, 255, 255],
          overflow: 'linebreak'
        }
      }]);
      meta.push({ isComment: true, subjectIndex: si });
    }
  });
  return { body, meta };
};

const nonCoreTableOptions = (body, rowMeta, startY) => ({
  startY,
  head: [['', `${semesterLabel}\nProgress Overview`]],
  body,
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
    valign: 'middle',
    cellPadding: { top: 4, right: 2, bottom: 4, left: 2 }
  },
  columnStyles: {
    0: { cellWidth: 'auto', cellPadding: { top: 5, right: 3, bottom: 5, left: 14 }, textColor: [255, 255, 255] },
    1: { cellWidth: 22, halign: 'center', fontStyle: 'normal', textColor: [17, 24, 39], valign: 'middle' }
  },
  tableLineColor: [209, 213, 219],
  tableLineWidth: 0.3,
  margin: { left: ml, right: mr, top: mt, bottom: mb },
  didDrawCell: (data) => {
    if (data.cell.section !== 'body') return;
    const meta = rowMeta[data.row.index];
    if (!meta) return;
    const row = allRows[meta.subjectIndex];
    if (meta.isComment) {
      if (data.column.index !== 0) return;
      const cx = data.cell.x;
      const cy = data.cell.y;
      const padL = 2;
      const maxW = data.cell.width - padL - 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      const lines = doc.splitTextToSize(row.comment, maxW);
      const lineHeight = 5;
      const blockSpan = (lines.length - 1) * lineHeight;
      let textY = cy + (data.cell.height - blockSpan) / 2 + 1.5;
      lines.forEach(line => { doc.text(line, cx + padL, textY); textY += lineHeight; });
    } else {
      if (data.column.index !== 0) return;
      const cx = data.cell.x;
      const cy = data.cell.y;
      const iconB64 = iconCache[meta.subjectIndex];
      if (iconB64) {
        try { doc.addImage(iconB64, 'PNG', cx + 2, cy + 4, 8, 8); } catch (e) {}
      } else {
        drawLetterAvatar(cx + 2, cy + 4, row.subject_name.charAt(0).toUpperCase());
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 58, 95);
      doc.text(row.subject_name, cx + 14, cy + 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(row.teacher_name, cx + 14, cy + 12);
    }
  },
  didDrawPage: () => { drawFooter(); }
});

const coreRows = reportRows.filter(r => r.core_subject);
const nonCoreRows = reportRows.filter(r => !r.core_subject);
// Flatten: core first, then non-core (already sorted) — then chunk by page
const allRows = [...coreRows, ...nonCoreRows];
const SUBJECTS_PER_PAGE = 5;
const coreChunks = [];
for (let i = 0; i < coreRows.length; i += SUBJECTS_PER_PAGE) {
  coreChunks.push(coreRows.slice(i, i + SUBJECTS_PER_PAGE));
}
const nonCoreChunks = [];
for (let i = 0; i < nonCoreRows.length; i += SUBJECTS_PER_PAGE) {
  nonCoreChunks.push(nonCoreRows.slice(i, i + SUBJECTS_PER_PAGE));
}

// Shared autoTable options factory
const tableOptions = (body, rowMeta, startY) => ({
  startY,
  head: [['', 'A', 'B', 'C', 'D', `${semesterLabel}\nProgress\nOverview`]],
  body,
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
    valign: 'middle',
    cellPadding: { top: 4, right: 2, bottom: 4, left: 2 }
  },
  columnStyles: {
    0: { cellWidth: 'auto', cellPadding: { top: 5, right: 3, bottom: 5, left: 14 }, textColor: [255, 255, 255] },
    1: { cellWidth: 12, halign: 'center', fontStyle: 'normal', valign: 'middle', textColor: [17, 24, 39] },
    2: { cellWidth: 12, halign: 'center', fontStyle: 'normal', valign: 'middle', textColor: [17, 24, 39] },
    3: { cellWidth: 12, halign: 'center', fontStyle: 'normal', valign: 'middle', textColor: [17, 24, 39] },
    4: { cellWidth: 12, halign: 'center', fontStyle: 'normal', valign: 'middle', textColor: [17, 24, 39] },
    5: { cellWidth: 20, halign: 'center', fontStyle: 'normal', textColor: [17, 24, 39], valign: 'middle' }
  },
  tableLineColor: [209, 213, 219],
  tableLineWidth: 0.3,
  margin: { left: ml, right: mr, top: mt, bottom: mb },
  didDrawCell: (data) => {
    if (data.cell.section !== 'body') return;
    const meta = rowMeta[data.row.index];
    if (!meta) return;

    if (!meta.isComment) {
      if (data.column.index !== 0) return;
      const row = allRows[meta.subjectIndex];
      const cx = data.cell.x;
      const cy = data.cell.y;
      const iconX = cx + 2;
      const iconY = cy + 4;
      const iconB64 = iconCache[meta.subjectIndex];
      if (iconB64) {
        try { doc.addImage(iconB64, 'PNG', iconX, iconY, 8, 8); } catch (e) {}
      } else {
        drawLetterAvatar(iconX, iconY, row.subject_name.charAt(0).toUpperCase());
      }
      const textX = cx + 14;
      let textY = cy + 7;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 58, 95);
      doc.text(row.subject_name, textX, textY);
      textY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(row.teacher_name, textX, textY);
    } else {
      if (data.column.index !== 0) return;
      const row = allRows[meta.subjectIndex];
      const cx = data.cell.x;
      const cy = data.cell.y;
      const padL = 2;
      const padR = 4;
      const maxW = data.cell.width - padL - padR;
      const textX = cx + padL;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      const lines = doc.splitTextToSize(row.comment, maxW);
      const lineHeight = 5;
      const blockSpan = (lines.length - 1) * lineHeight;
      let textY = cy + (data.cell.height - blockSpan) / 2 + 1.5;
      lines.forEach((line, idx) => {
        const isLast = idx === lines.length - 1;
        const words = line.trimEnd().split(' ');
        if (isLast || words.length <= 1) {
          doc.text(line, textX, textY);
        } else {
          const textOnlyW = doc.getTextWidth(words.join(''));
          const spaceW = (maxW - textOnlyW) / (words.length - 1);
          let xPos = textX;
          words.forEach((word) => {
            doc.text(word, xPos, textY);
            xPos += doc.getTextWidth(word) + spaceW;
          });
        }
        textY += 5;
      });
    }
  },
  didDrawPage: () => { drawFooter(); }
});

// Render core subjects (5 per page)
for (let ci = 0; ci < coreChunks.length; ci++) {
  if (ci > 0) {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text(`Summary of ${semesterLabel} Student Progress`, ml, mt + 6);
  }
  const indexOffset = ci * SUBJECTS_PER_PAGE;
  const { body: chunkBody, meta: chunkMeta } = buildTableData(coreChunks[ci], indexOffset);
  autoTable(doc, tableOptions(chunkBody, chunkMeta, mt + 12));
}

// Render non-core subjects (5 per page, 2-column table, no title)
for (let ci = 0; ci < nonCoreChunks.length; ci++) {
  doc.addPage();
  const indexOffset = coreRows.length + ci * SUBJECTS_PER_PAGE;
  const { body: chunkBody, meta: chunkMeta } = buildNonCoreTableData(nonCoreChunks[ci], indexOffset);
  autoTable(doc, nonCoreTableOptions(chunkBody, chunkMeta, mt + 6));
}

// ── Attendance + Mentor Comment section ──────────────────────────────────
const hasAttendanceOrComment =
  mentorComment.absent > 0 || mentorComment.present > 0 ||
  mentorComment.late > 0 || mentorComment.sick > 0 ||
  mentorComment.excused > 0 || mentorComment.comment_text;

if (hasAttendanceOrComment) {
  let sectionY = doc.lastAutoTable
    ? doc.lastAutoTable.finalY + 12
    : mt + 12;

  // New page if not enough space
  if (sectionY > ph - 55) {
    doc.addPage();
    drawFooter();
    sectionY = mt + 8;
  }

  // Section: Attendance
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Attendance', ml, sectionY);
  sectionY += 7;

  const badges = [
    { label: 'Absent',  value: mentorComment.absent,  bg: [239, 68, 68],   fg: [255, 255, 255] },
    { label: 'Present', value: mentorComment.present, bg: [34, 197, 94],   fg: [255, 255, 255] },
    { label: 'Late',    value: mentorComment.late,    bg: [249, 115, 22],  fg: [255, 255, 255] },
    { label: 'Sick',    value: mentorComment.sick,    bg: [107, 114, 128], fg: [255, 255, 255] },
    { label: 'Excused', value: mentorComment.excused, bg: [59, 130, 246],  fg: [255, 255, 255] },
  ];

  let bx = ml;
  doc.setFontSize(8);
  for (const badge of badges) {
    const txt = `${badge.value} ${badge.label}`;
    const tw = doc.getTextWidth(txt);
    const ph2 = 2.5, pv = 0.8;
    const bw = tw + ph2 * 2;
    const bh = 5 + pv * 2;
    const r = 1.2;
    doc.setFillColor(...badge.bg);
    doc.roundedRect(bx, sectionY, bw, bh, r, r, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...badge.fg);
    doc.text(txt, bx + ph2, sectionY + pv + 3.8);
    bx += bw + 3;
  }
  sectionY += 13;

  // Section: Mentor Comment
  if (mentorComment.comment_text) {
    // Check space again before comment
    if (sectionY > ph - 40) {
      doc.addPage();
      drawFooter();
      sectionY = mt + 8;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(17, 24, 39);
    const nameLabel = `${homeroomTeacherName} `;
    doc.text(nameLabel, ml, sectionY);
    const nameLabelW = doc.getTextWidth(nameLabel);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('\u2014 Grade Mentor Comments', ml + nameLabelW, sectionY);
    sectionY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    const commentLines = doc.splitTextToSize(mentorComment.comment_text, cw);
    commentLines.forEach((line, idx) => {
      const isLast = idx === commentLines.length - 1;
      const words = line.trimEnd().split(' ');
      if (isLast || words.length <= 1) {
        doc.text(line, ml, sectionY);
      } else {
        const textOnlyW = words.reduce((s, w) => s + doc.getTextWidth(w), 0);
        const spaceW = (cw - textOnlyW) / (words.length - 1);
        let xPos = ml;
        words.forEach((word) => {
          doc.text(word, xPos, sectionY);
          xPos += doc.getTextWidth(word) + spaceW;
        });
      }
      sectionY += 4.5;
    });
  }
}

// ── Per-subject detail pages (core subjects) ────────────────────────────
const gradeToBandMin = (g) => g <= 2 ? 1 : g <= 4 ? 3 : g <= 6 ? 5 : 7;

for (const row of coreRows) {
  doc.addPage();
  const y = mt + 6;

  const subIconB64 = iconBySubjectId[row.subject_id];
  const mypYr = semester === '1' ? (row.myp_year_s1 || 1) : (row.myp_year_s2 || 1);
  const dKey = row.subject_group_id ? `${row.subject_group_id}_${mypYr}_${parseInt(semester)}` : null;
  const descriptors = dKey ? (descriptorCache[dKey] || null) : null;
  const crNames = criteriaNameCache[row.subject_id] || {};

  // Build ONE unified table: subject row + cd header row + criterion rows + comment row
  // Meta array maps body row index → rendering instructions
  const body = [];
  const meta = [];

  // Row 0: subject name / teacher + grades
  body.push([
    { content: row.subject_name + '\n' + row.teacher_name, styles: { textColor: [255, 255, 255] } },
    row.grades.A !== null ? String(row.grades.A) : '-',
    row.grades.B !== null ? String(row.grades.B) : '-',
    row.grades.C !== null ? String(row.grades.C) : '-',
    row.grades.D !== null ? String(row.grades.D) : '-',
    row.semester_overview !== null ? String(row.semester_overview) : '-'
  ]);
  meta.push({ type: 'subject' });

  // Row 1: "Criterion Descriptors" label spanning all 6 cols
  body.push([{ content: 'Criterion Descriptors', colSpan: 6, styles: { textColor: [255, 255, 255], cellPadding: { top: 5, right: 2, bottom: 1, left: 2 } } }]);
  meta.push({ type: 'cd_header' });

  // Rows 2+: one row per criterion
  const _criterionMaxW = pw - ml - mr - 10;
  for (const cr of ['A', 'B', 'C', 'D']) {
    const gradeVal = row.grades[cr];
    if (gradeVal === null) continue;
    const crLabel = crNames[cr] ? `${cr}: ${crNames[cr]}` : `Criterion ${cr}`;
    const bMin = descriptors ? gradeToBandMin(gradeVal) : null;
    const descText = (descriptors && bMin) ? (descriptors[cr]?.[bMin] || '').replace(/\bStudent\b/g, studentFirstName) : '';
    // Pre-compute lines so autoTable sizes the cell to exactly what we'll draw
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const descLines = descText ? doc.splitTextToSize(descText, _criterionMaxW) : [];
    const contentStr = crLabel + (descLines.length ? '\n' + descLines.join('\n') : '');
    // minCellHeight ensures enough vertical space regardless of autoTable's internal line-height calculation
    // Formula: 5 (label row) + descLines * 5 (desc rows) + 9 (padding + baseline offset)
    const minCellHeight = 11 + descLines.length * 5;
    body.push([{ content: contentStr, colSpan: 6, styles: { textColor: [255, 255, 255], cellPadding: { top: 4, right: 2, bottom: 6, left: 2 }, minCellHeight } }]);
    meta.push({ type: 'criterion', label: crLabel, desc: descText });
  }

  // Last row: teacher comment
  if (row.comment) {
    body.push([{ content: row.comment, colSpan: 6, styles: { textColor: [255, 255, 255], cellPadding: { top: 5, right: 2, bottom: 8, left: 2 } } }]);
    meta.push({ type: 'comment', text: row.comment });
  }

  autoTable(doc, {
    startY: y,
    head: [['', 'A', 'B', 'C', 'D', `${semesterLabel}\nProgress\nOverview`]],
    body,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: { top: 5, right: 2, bottom: 5, left: 2 },
      lineColor: [209, 213, 219],
      lineWidth: 0.3,
      overflow: 'linebreak',
      textColor: [255, 255, 255],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [107, 114, 128],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 'auto', cellPadding: { top: 5, right: 3, bottom: 5, left: 14 } },
      1: { cellWidth: 14, halign: 'center', fontStyle: 'bold', valign: 'top', textColor: [31, 41, 55] },
      2: { cellWidth: 14, halign: 'center', fontStyle: 'bold', valign: 'top', textColor: [31, 41, 55] },
      3: { cellWidth: 14, halign: 'center', fontStyle: 'bold', valign: 'top', textColor: [31, 41, 55] },
      4: { cellWidth: 14, halign: 'center', fontStyle: 'bold', valign: 'top', textColor: [31, 41, 55] },
      5: { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: [31, 41, 55], valign: 'top' }
    },
    tableLineColor: [209, 213, 219],
    tableLineWidth: 0.3,
    margin: { left: ml, right: mr },
    didDrawCell: (data) => {
      if (data.cell.section !== 'body') return;
      const m = meta[data.row.index];
      if (!m) return;

      if (m.type === 'subject') {
        // Only col 0 needs custom drawing; grade cols rendered via columnStyles textColor override
        if (data.column.index !== 0) return;
        const cx = data.cell.x;
        const cy = data.cell.y;
        if (subIconB64) {
          try { doc.addImage(subIconB64, 'PNG', cx + 2, cy + 4, 8, 8); } catch (_e) {}
        } else {
          drawLetterAvatar(cx + 2, cy + 4, row.subject_name.charAt(0).toUpperCase());
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(30, 58, 95);
        doc.text(row.subject_name, cx + 14, cy + 8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text(row.teacher_name, cx + 14, cy + 14);

      } else if (m.type === 'cd_header') {
        if (data.column.index !== 0) return;
        const cx = data.cell.x + 2;
        const cy = data.cell.y + data.cell.height / 2 + 1;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text('Criterion Descriptors', cx, cy);

      } else if (m.type === 'criterion') {
        if (data.column.index !== 0) return;
        const cx = data.cell.x + 2;
        const cy = data.cell.y;
        const maxW = data.cell.width - 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(17, 24, 39);
        doc.text(m.label, cx, cy + 5);
        if (m.desc) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(17, 24, 39);
          const dLines = doc.splitTextToSize(m.desc, maxW);
          let ty = cy + 11;
          dLines.forEach(dl => { doc.text(dl, cx, ty); ty += 5; });
        }

      } else if (m.type === 'comment') {
        if (data.column.index !== 0) return;
        const cx = data.cell.x + 2;
        const cy = data.cell.y;
        const maxW = data.cell.width - 16;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(17, 24, 39);
        const cLines = doc.splitTextToSize(m.text, maxW);
        let ty = cy + 7;
        cLines.forEach(cl => { doc.text(cl, cx, ty); ty += 5; });
      }
    },
    didDrawPage: () => { drawFooter(); },
  });

  // Separate boundaries table below (with proper columns)
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY,
    head: [['', '1', '2', '3', '4', '5', '6', '7']],
    body: [[
      'Boundaries',
      ...(() => {
        if (row.custom_grade_boundaries && row.custom_grade_boundaries.length === 6) {
          const cb = row.custom_grade_boundaries;
          return [
            `0–${cb[0]}`,
            `${cb[0]+1}–${cb[1]}`,
            `${cb[1]+1}–${cb[2]}`,
            `${cb[2]+1}–${cb[3]}`,
            `${cb[3]+1}–${cb[4]}`,
            `${cb[4]+1}–${cb[5]}`,
            `${cb[5]+1}+`
          ];
        }
        return ['0–5', '6–9', '10–14', '15–18', '19–23', '24–27', '28–32'];
      })()
    ]],
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: { top: 2, right: 2, bottom: 2, left: 3 },
      lineColor: [209, 213, 219],
      lineWidth: 0.3,
      halign: 'center',
      textColor: [55, 65, 81],
    },
    headStyles: {
      fontStyle: 'normal',
      textColor: [107, 114, 128],
      fontSize: 8,
      halign: 'center',
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [107, 114, 128], halign: 'left' },
    },
    tableLineColor: [209, 213, 219],
    tableLineWidth: 0.3,
    margin: { left: ml, right: mr },
  });
}

// ── Per-subject detail pages (non-core subjects) ───────────────────────
for (const row of nonCoreRows) {
  doc.addPage();
  const y = mt + 6;

  const subIconB64 = iconBySubjectId[row.subject_id];
  const mypYr = semester === '1' ? (row.myp_year_s1 || 1) : (row.myp_year_s2 || 1);
  const dKey = row.subject_group_id ? `${row.subject_group_id}_${mypYr}_${parseInt(semester)}` : null;
  const descriptors = dKey ? (descriptorCache[dKey] || null) : null;
  const crNames = criteriaNameCache[row.subject_id] || {};

  // Only include criteria that have a grade value
  const activeCriteria = ['A', 'B', 'C', 'D'].filter(cr => row.grades[cr] !== null);
  const totalCols = 1 + activeCriteria.length + 1; // name col + active criteria + overview

  const body = [];
  const meta = [];

  // Subject header row
  body.push([
    { content: row.subject_name + '\n' + row.teacher_name, styles: { textColor: [255, 255, 255] } },
    ...activeCriteria.map(cr => String(row.grades[cr])),
    row.semester_overview !== null ? String(row.semester_overview) : '-'
  ]);
  meta.push({ type: 'subject' });

  // Criterion Descriptors header
  body.push([{ content: 'Criterion Descriptors', colSpan: totalCols, styles: { textColor: [255, 255, 255], cellPadding: { top: 5, right: 2, bottom: 1, left: 2 } } }]);
  meta.push({ type: 'cd_header' });

  const _ncCriterionMaxW = pw - ml - mr - 10;
  for (const cr of activeCriteria) {
    const gradeVal = row.grades[cr];
    const crLabel = crNames[cr] ? `${cr}: ${crNames[cr]}` : `Criterion ${cr}`;
    const bMin = descriptors ? gradeToBandMin(gradeVal) : null;
    const descText = (descriptors && bMin) ? (descriptors[cr]?.[bMin] || '').replace(/\bStudent\b/g, studentFirstName) : '';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const descLines = descText ? doc.splitTextToSize(descText, _ncCriterionMaxW) : [];
    const contentStr = crLabel + (descLines.length ? '\n' + descLines.join('\n') : '');
    const minCellHeight = 11 + descLines.length * 5;
    body.push([{ content: contentStr, colSpan: totalCols, styles: { textColor: [255, 255, 255], cellPadding: { top: 4, right: 2, bottom: 6, left: 2 }, minCellHeight } }]);
    meta.push({ type: 'criterion', label: crLabel, desc: descText });
  }

  if (row.comment) {
    body.push([{ content: row.comment, colSpan: totalCols, styles: { textColor: [255, 255, 255], cellPadding: { top: 5, right: 2, bottom: 8, left: 2 } } }]);
    meta.push({ type: 'comment', text: row.comment });
  }

  // Build dynamic column styles based on active criteria count
  const ncColStyles = {
    0: { cellWidth: 'auto', cellPadding: { top: 5, right: 3, bottom: 5, left: 14 } },
  };
  activeCriteria.forEach((_, i) => {
    ncColStyles[i + 1] = { cellWidth: 14, halign: 'center', fontStyle: 'bold', valign: 'top', textColor: [31, 41, 55] };
  });
  ncColStyles[activeCriteria.length + 1] = { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: [31, 41, 55], valign: 'top' };

  autoTable(doc, {
    startY: y,
    head: [['', ...activeCriteria, `${semesterLabel}\nProgress\nOverview`]],
    body,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: { top: 5, right: 2, bottom: 5, left: 2 },
      lineColor: [209, 213, 219],
      lineWidth: 0.3,
      overflow: 'linebreak',
      textColor: [255, 255, 255],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [107, 114, 128],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    columnStyles: ncColStyles,
    tableLineColor: [209, 213, 219],
    tableLineWidth: 0.3,
    margin: { left: ml, right: mr },
    didDrawCell: (data) => {
      if (data.cell.section !== 'body') return;
      const m = meta[data.row.index];
      if (!m) return;

      if (m.type === 'subject') {
        if (data.column.index !== 0) return;
        const cx = data.cell.x;
        const cy = data.cell.y;
        if (subIconB64) {
          try { doc.addImage(subIconB64, 'PNG', cx + 2, cy + 4, 8, 8); } catch (_e) {}
        } else {
          drawLetterAvatar(cx + 2, cy + 4, row.subject_name.charAt(0).toUpperCase());
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(30, 58, 95);
        doc.text(row.subject_name, cx + 14, cy + 8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text(row.teacher_name, cx + 14, cy + 14);

      } else if (m.type === 'cd_header') {
        if (data.column.index !== 0) return;
        const cx = data.cell.x + 2;
        const cy = data.cell.y + data.cell.height / 2 + 1;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text('Criterion Descriptors', cx, cy);

      } else if (m.type === 'criterion') {
        if (data.column.index !== 0) return;
        const cx = data.cell.x + 2;
        const cy = data.cell.y;
        const maxW = data.cell.width - 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(17, 24, 39);
        doc.text(m.label, cx, cy + 5);
        if (m.desc) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(17, 24, 39);
          const dLines = doc.splitTextToSize(m.desc, maxW);
          let ty = cy + 11;
          dLines.forEach(dl => { doc.text(dl, cx, ty); ty += 5; });
        }

      } else if (m.type === 'comment') {
        if (data.column.index !== 0) return;
        const cx = data.cell.x + 2;
        const cy = data.cell.y;
        const maxW = data.cell.width - 16;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(17, 24, 39);
        const cLines = doc.splitTextToSize(m.text, maxW);
        let ty = cy + 7;
        cLines.forEach(cl => { doc.text(cl, cx, ty); ty += 5; });
      }
    },
    didDrawPage: () => { drawFooter(); },
  });
  // No boundaries table for non-core subjects
}

// ── Achievement Level Descriptors (last page) ─────────────────────────
doc.addPage();

doc.setFont('helvetica', 'bold');
doc.setFontSize(16);
doc.setTextColor(17, 24, 39);
doc.text('Achievement Level Descriptors', ml, mt + 6);

doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(55, 65, 81);
doc.text('Final Grade', ml, mt + 16);

const aldRows = [
  ['7:', 'A+', 'Produces high-quality, frequently innovative work. Communicates comprehensive, nuanced understanding of concepts and contexts. Consistently demonstrates sophisticated critical and creative thinking. Frequently transfers knowledge and skills with independence and expertise in a variety of complex classroom and real-world situations.'],
  ['6:', 'A',  'Produces high-quality, occasionally innovative work. Communicates extensive understanding of concepts and contexts. Demonstrates critical and creative thinking, frequently with sophistication. Uses knowledge and skills in familiar and unfamiliar classroom and real-world situations, often with independence.'],
  ['5:', 'B+', 'Produces generally high-quality work. Communicates secure understanding of concepts and contexts. Demonstrates critical and creative thinking, sometimes with sophistication. Uses knowledge and skills in familiar classroom and real-world situations and, with support, some unfamiliar real-world situations.'],
  ['4:', 'B',  'Produces good-quality work. Communicates basic understanding of most concepts and contexts with few misunderstandings and minor gaps. Often demonstrates basic critical and creative thinking. Uses knowledge and skills with some flexibility in familiar classroom situations, but requires support in unfamiliar situations.'],
  ['3:', 'C+', 'Produces work of an acceptable quality. Communicates basic understanding of many concepts and contexts, with occasionally significant misunderstandings or gaps. Begins to demonstrate some basic critical and creative thinking. Is often inflexible in the use of knowledge and skills, requiring support even in familiar classroom situations.'],
  ['2:', 'C',  'Produces work of limited quality. Expresses misunderstandings or significant gaps in understanding for many concepts and contexts. Infrequently demonstrates critical or creative thinking. Generally inflexible in the use of knowledge and skills, infrequently applying knowledge and skills.'],
  ['1:', 'D',  'Produces work of very limited quality. Conveys many significant misunderstandings or lacks understanding of most concepts and contexts. Very rarely demonstrates critical or creative thinking. Very inflexible, rarely using knowledge or skills.'],
  ['N/A', 'F', 'Not Yet Assessed.'],
];

autoTable(doc, {
  startY: mt + 20,
  head: [['Final Grade', 'Local Grade', 'Descriptor']],
  body: aldRows,
  theme: 'plain',
  styles: {
    fontSize: 9,
    cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
    lineColor: [209, 213, 219],
    lineWidth: 0.3,
    textColor: [31, 41, 55],
    overflow: 'linebreak',
  },
  headStyles: {
    fillColor: [255, 255, 255],
    textColor: [107, 114, 128],
    fontStyle: 'bold',
    fontSize: 8,
    cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
  },
  columnStyles: {
    0: { cellWidth: 22, halign: 'center', fontStyle: 'bold', valign: 'middle' },
    1: { cellWidth: 24, halign: 'center', valign: 'middle' },
    2: { cellWidth: 'auto', valign: 'middle' },
  },
  tableLineColor: [209, 213, 219],
  tableLineWidth: 0.3,
  margin: { left: ml, right: mr },
  didDrawPage: () => { drawFooter(); },
});

// ══════════════════════════════════════════════
// PROGRESSION REPORT PAGE (Semester 2 only)
// ══════════════════════════════════════════════
if (semester === '2') {
  doc.addPage();

  // ── Watermark: logo behind content ──
  if (logoBase64) {
    try {
      const wmH = 80;
      const imgProps = doc.getImageProperties(logoBase64);
      const wmW = (imgProps.width / imgProps.height) * wmH;
      // Save state, set opacity, draw centered
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.07 }));
      doc.addImage(logoBase64, 'PNG', (pw - wmW) / 2, (ph - wmH) / 2, wmW, wmH);
      doc.restoreGraphicsState();
    } catch (e) { /* skip watermark on error */ }
  }

  // ── Header: Logo + Title (same style as cover) ──
  let py = mt;
  let pLogoW = 0;
  if (logoBase64) {
    try {
      const logoH = 26;
      const imgProps = doc.getImageProperties(logoBase64);
      pLogoW = (imgProps.width / imgProps.height) * logoH;
      doc.addImage(logoBase64, 'PNG', ml, py, pLogoW, logoH);
    } catch (e) { pLogoW = 0; }
  }
  const ptxStart = ml + (pLogoW > 0 ? pLogoW + 6 : 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(55, 65, 81);
  doc.text('Middle School Report', ptxStart, py + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39);
  doc.text('Chung Chung Christian School', ptxStart, py + 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text(`Prepared on ${preparedDate}`, ptxStart, py + 24);

  // ── Student Info ──
  py += 34;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text(studentName, ml, py);

  py += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Grade', ml, py);
  doc.text('Year Program', ml + 45, py);
  py += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.text(kelasName, ml, py);
  doc.text(yearName || '', ml + 45, py);

  // ── Progression Table ──
  py += 8;

  // ── DIKNAS conversion lookup table (core subjects, 4 criteria, boundary 4–32) ──
  const CORE_DIKNAS = {
    4: 60,  5: 61,  6: 63,  7: 64,  8: 66,  9: 67,
    10: 69, 11: 70, 12: 71, 13: 73, 14: 74,
    15: 76, 16: 77, 17: 79, 18: 80, 19: 81,
    20: 83, 21: 84, 22: 86, 23: 87,
    24: 89, 25: 90, 26: 91, 27: 93,
    28: 94, 29: 96, 30: 97, 31: 99, 32: 100
  };

  // Helper: get DIKNAS score.
  // Normalizes raw criteria sum to 4-criteria equivalent so subjects with
  // fewer graded criteria (e.g. 2 criteria) still map correctly into the table.
  const getDiknas = (isCore, criteriaTotal, numCriteria) => {
    if (!isCore || criteriaTotal === null || criteriaTotal === undefined) return '';
    const n = (numCriteria && numCriteria > 0) ? numCriteria : 4;
    // Scale to 4-criteria equivalent, clamp to valid range [4, 32]
    const normalized = Math.min(32, Math.max(4, Math.round(criteriaTotal * 4 / n)));
    return CORE_DIKNAS[normalized] !== undefined ? String(CORE_DIKNAS[normalized]) : '';
  };

  // Build s1 lookup map: subject_id → { semester_overview, criteriaTotal, numCriteria, core_subject }
  const s1Map = {};
  if (semester1Rows && semester1Rows.length > 0) {
    semester1Rows.forEach(r => {
      s1Map[r.subject_id] = {
        semester_overview: r.semester_overview,
        criteriaTotal:     r.criteriaTotal  ?? null,
        numCriteria:       r.numCriteria    ?? 4,
        core_subject:      r.core_subject   ?? false,
      };
    });
  }

  const progBody = reportRows.map((row, idx) => {
    // S1 IB score + DIKNAS (conversion only if all 4 criteria were graded in S1)
    const s1Entry       = s1Map[row.subject_id];
    const s1Score       = s1Entry?.semester_overview != null ? String(s1Entry.semester_overview) : '-';
    const s1AllFour     = row.core_subject && (s1Entry?.numCriteria ?? 0) === 4;
    const s1Diknas      = s1AllFour ? getDiknas(row.core_subject, s1Entry?.criteriaTotal ?? null, 4) : '';

    // S2 IB score + DIKNAS (conversion only if all 4 criteria are graded in S2)
    const s2Score       = row.semester_overview != null ? String(row.semester_overview) : '-';
    const s2Grades      = row.grades || {};
    const s2Vals        = [s2Grades.A, s2Grades.B, s2Grades.C, s2Grades.D].filter(g => g !== null && g !== undefined);
    const s2Total       = s2Vals.length > 0 ? s2Vals.reduce((a, b) => a + b, 0) : null;
    const s2AllFour     = row.core_subject && s2Vals.length === 4;
    const s2Diknas      = s2AllFour ? getDiknas(row.core_subject, s2Total, 4) : '';

    // Final Grade: only show when ALL 4 criteria graded in S2
    const finalScore    = s2AllFour ? s2Score  : '';
    const finalDiknas   = s2AllFour ? getDiknas(row.core_subject, s2Total, 4) : '';

    return [
      String(idx + 1),
      row.subject_name,
      s1Score,    s1Diknas,    // S1 IB | S1 Conversion
      s2Score,    s2Diknas,    // S2 IB | S2 Conversion
      finalScore, finalDiknas, // Final IB | Final Conversion
    ];
  });



  // Column widths: must sum to cw (210 - 18 - 18 = 174mm)
  // No | Subjects | S1IB | S1Conv | S2IB | S2Conv | FinalIB | FinalConv
  //  8 |    44    |  16  |   24   |  16  |   24   |   18    |   24      = 174
  autoTable(doc, {
    startY: py,
    head: [[
      { content: 'No',          rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Subjects',    rowSpan: 2, styles: { valign: 'middle' } },
      { content: 'Semester 1\nProgression', colSpan: 2, styles: { halign: 'center' } },
      { content: 'Semester 2\nProgression', colSpan: 2, styles: { halign: 'center' } },
      { content: 'Final Grade', colSpan: 2, styles: { halign: 'center' } },
    ], [
      { content: 'IB\nScores',    styles: { halign: 'center' } },
      { content: 'Conversion',    styles: { halign: 'center' } },
      { content: 'IB\nScores',    styles: { halign: 'center' } },
      { content: 'Conversion',    styles: { halign: 'center' } },
      { content: 'IB\nScores',    styles: { halign: 'center' } },
      { content: 'Conversion',    styles: { halign: 'center' } },
    ]],
    body: progBody,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 },
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
      fillColor: [255, 255, 255],   // plain white, no alternating
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      valign: 'middle',
      cellPadding: { top: 2, right: 1.5, bottom: 2, left: 1.5 },
    },
    columnStyles: {
      0: { cellWidth: 8,  halign: 'center' },
      1: { cellWidth: 44 },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 24, halign: 'center' },
      6: { cellWidth: 18, halign: 'center' },
      7: { cellWidth: 24, halign: 'center' },
    },
    margin: { left: ml, right: mr },
  });

  let afterTableY = doc.lastAutoTable.finalY + 10;

  // ── Academic Status ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text('Academic Status', ml, afterTableY);
  afterTableY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 41, 55);
  const statusText = `After the evaluation of academic performance, attendance, and behavior for the academic year ${yearName || ''}, it is hereby confirmed that:`;
  const statusLines = doc.splitTextToSize(statusText, cw);
  statusLines.forEach(line => {
    doc.text(line, ml, afterTableY);
    afterTableY += 4;
  });
  afterTableY += 3;

  // Helper: draw checkbox + optional manual checkmark tick (V shape with lines)
  const drawCheckbox = (x, y, checked) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    const sz = 3.5;
    doc.rect(x, y - sz + 0.5, sz, sz);
    if (checked) {
      // Draw a V-shaped tick manually inside the box
      doc.setLineWidth(0.5);
      doc.setDrawColor(0, 0, 0);
      const tx = x + 0.5, ty = y - sz + 0.5;
      doc.line(tx + 0.4, ty + sz * 0.55, tx + sz * 0.38, ty + sz * 0.85);
      doc.line(tx + sz * 0.38, ty + sz * 0.85, tx + sz - 0.3, ty + sz * 0.15);
      doc.setLineWidth(0.3);
    }
  };

  // Checkbox 1: Promoted (checked ✓)
  drawCheckbox(ml, afterTableY, true);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 41, 55);
  const cb1Text = 'The student has met the required standards and is eligible to be promoted to the next grade level';
  const cb1Lines = doc.splitTextToSize(cb1Text, cw - 6);
  cb1Lines.forEach((line, i) => { doc.text(line, ml + 5, afterTableY + (i * 4)); });
  afterTableY += cb1Lines.length * 4 + 4;

  // Checkbox 2: Conditional promotion (unchecked)
  drawCheckbox(ml, afterTableY, false);
  const cb2Text = 'The student is recommended for conditional promotion with required academic support';
  const cb2Lines = doc.splitTextToSize(cb2Text, cw - 6);
  cb2Lines.forEach((line, i) => { doc.text(line, ml + 5, afterTableY + (i * 4)); });
  afterTableY += cb2Lines.length * 4 + 14;

  // ── Signature Section ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text(`Surabaya, ${preparedDate}`, pw / 2, afterTableY, { align: 'center' });
  afterTableY += 20;

  const colW = cw / 3;
  const col1X = ml + colW / 2;
  const col2X = ml + colW + colW / 2;
  const col3X = ml + colW * 2 + colW / 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('....................', col1X, afterTableY, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(homeroomTeacherName, col2X, afterTableY, { align: 'center' });
  doc.text(unitPrincipalName || '', col3X, afterTableY, { align: 'center' });

  afterTableY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Parent', col1X, afterTableY, { align: 'center' });
  doc.text('Grade Mentor', col2X, afterTableY, { align: 'center' });
  doc.text(unitPrincipalTitle || 'Principal', col3X, afterTableY, { align: 'center' });

  drawFooter();
}



  const pdfBlob = doc.output('blob');
  return pdfBlob;
};

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
    const studentFirstName = studentName.split(' ')[0] || studentName;
    const kelasName = reportKelasOptions.find(k => k.kelas_id === kelasId)?.kelas_nama || '';
    const yearName = reportYears.find(y => y.year_id === parseInt(reportFilters.year))?.year_name || '';
    const semester = reportFilters.semester || '1';
    const semesterLabel = semester === '1' ? 'Semester 1' : 'Semester 2';

    // Fetch kelas info for homeroom teacher + unit
    const { data: kelasData } = await supabase
      .from('kelas')
      .select('kelas_user_id, kelas_unit_id')
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

    // Fetch report settings (principal name/title/greeting/date) per unit + year
    let unitPrincipalName = '';
    let unitPrincipalTitle = '';
    let unitGreeting = null;
    let unitReportDate = null;
    if (kelasData?.kelas_unit_id && reportFilters.year) {
      const { data: rsData } = await supabase
        .from('report_settings')
        .select('principal_name, principal_title, report_greeting, report_date_s1, report_date_s2')
        .eq('unit_id', kelasData.kelas_unit_id)
        .eq('year_id', parseInt(reportFilters.year))
        .single();
      if (rsData) {
        if (rsData.principal_name) unitPrincipalName = rsData.principal_name;
        if (rsData.principal_title) unitPrincipalTitle = rsData.principal_title;
        if (rsData.report_greeting) unitGreeting = rsData.report_greeting;
        const rawDate = semester === '1' ? rsData.report_date_s1 : rsData.report_date_s2;
        if (rawDate) unitReportDate = rawDate;
      }
    }

    // Fetch detail_kelas with subject info + icon
    const { data: detailKelasData, error: dkError } = await supabase
      .from('detail_kelas')
      .select(`
        detail_kelas_id,
        detail_kelas_subject_id,
        myp_year_s1,
        myp_year_s2,
        subject:detail_kelas_subject_id (
          subject_id,
          subject_name,
          subject_user_id,
          subject_icon,
          core_subject,
          print_order,
          include_in_print,
          subject_group_id,
          custom_grade_boundaries
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

    // Fetch mentor comment (attendance + comment text)
    let mentorComment = { absent: 0, present: 0, late: 0, sick: 0, excused: 0, comment_text: '' };
    if (studentUserId) {
      const { data: mentorData } = await supabase
        .from('mentor_comment')
        .select('absent, present, late, sick, excused, comment_text')
        .eq('kelas_id', kelasId)
        .eq('student_user_id', studentUserId)
        .eq('semester', parseInt(semester))
        .single();
      if (mentorData) {
        mentorComment = {
          absent: mentorData.absent ?? 0,
          present: mentorData.present ?? 0,
          late: mentorData.late ?? 0,
          sick: mentorData.sick ?? 0,
          excused: mentorData.excused ?? 0,
          comment_text: mentorData.comment_text || ''
        };
      }
    }

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
      if (dk.subject.include_in_print === false) continue; // skip subjects marked as not for print
      
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
      
      // Fetch assessments for this subject + semester (draft or approved)
      const { data: assessmentsData, error: aError } = await supabase
        .from('assessment')
        .select('assessment_id')
        .eq('assessment_detail_kelas_id', dk.detail_kelas_id)
        .in('assessment_status', [0, 1, 3])
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
          // IB MYP standard: sum of max criteria → boundary table (not average of per-assessment final_grade)
          const criteriaValues = [grades.A, grades.B, grades.C, grades.D].filter(g => g !== null);
          if (criteriaValues.length > 0) {
            const total = criteriaValues.reduce((a, b) => a + b, 0);
            const customBounds = dk.subject.custom_grade_boundaries;
            const scale = criteriaValues.length / 4;
            const b = (customBounds && customBounds.length === 6)
              ? customBounds
              : [5, 9, 14, 18, 23, 27].map(v => Math.round(v * scale));
            if (total <= b[0]) semesterOverview = 1;
            else if (total <= b[1]) semesterOverview = 2;
            else if (total <= b[2]) semesterOverview = 3;
            else if (total <= b[3]) semesterOverview = 4;
            else if (total <= b[4]) semesterOverview = 5;
            else if (total <= b[5]) semesterOverview = 6;
            else semesterOverview = 7;
          }
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

      // Skip subjects with no grades at all
      const hasGrades = grades.A !== null || grades.B !== null || grades.C !== null || grades.D !== null || semesterOverview !== null;
      if (!hasGrades) continue;
      
      reportRows.push({
        subject_id: dk.subject.subject_id,
        subject_name: dk.subject.subject_name,
        subject_icon: dk.subject.subject_icon || null,
        core_subject: dk.subject.core_subject || false,
        print_order: dk.subject.print_order ?? 0,
        teacher_name: teacherName,
        grades,
        semester_overview: semesterOverview,
        comment,
        subject_group_id: dk.subject.subject_group_id || null,
        myp_year_s1: dk.myp_year_s1 || 1,
        myp_year_s2: dk.myp_year_s2 || 1,
        custom_grade_boundaries: dk.subject.custom_grade_boundaries || null
      });
    }
    
    reportRows.sort((a, b) => {
      if (a.core_subject !== b.core_subject) return a.core_subject ? -1 : 1;
      return (a.print_order ?? 0) - (b.print_order ?? 0);
    });
    
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
    const iconBySubjectId = {};
    for (let i = 0; i < reportRows.length; i++) {
      if (reportRows[i].subject_icon) {
        const b64 = await loadImgBase64(reportRows[i].subject_icon);
        iconCache[i] = b64;
        iconBySubjectId[reportRows[i].subject_id] = b64;
      }
    }

    // Prefetch criterion names + descriptors for all subject detail pages
    const criteriaNameCache = {}; // { [subject_id]: { A: 'Analysing', ... } }
    const descriptorCache    = {}; // { [groupId_year_sem]: { A: { 1: desc, ... }, ... } }
    for (const row of reportRows) {
      if (!criteriaNameCache[row.subject_id]) {
        const { data: crData } = await supabase
          .from('criteria')
          .select('code, name')
          .eq('subject_id', row.subject_id)
          .order('code');
        criteriaNameCache[row.subject_id] = {};
        (crData || []).forEach(c => { criteriaNameCache[row.subject_id][c.code] = c.name; });
      }
      if (row.subject_group_id) {
        const mypYr = semester === '1' ? (row.myp_year_s1 || 1) : (row.myp_year_s2 || 1);
        const semInt = parseInt(semester);
        const dKey = `${row.subject_group_id}_${mypYr}_${semInt}`;
        if (!descriptorCache[dKey]) {
          // Fetch shared (semester=0) AND semester-specific rows in one query
          const { data: dData } = await supabase
            .from('criterion_descriptors')
            .select('criterion, band_min, descriptor, semester')
            .eq('subject_group_id', row.subject_group_id)
            .eq('myp_year', mypYr)
            .in('semester', [0, semInt]);
          // Build merged map: shared first, then semester-specific overrides
          const byBand = {};
          const shared = (dData || []).filter(d => d.semester === 0);
          const specific = (dData || []).filter(d => d.semester === semInt);
          [...shared, ...specific].forEach(d => {
            if (!byBand[d.criterion]) byBand[d.criterion] = {};
            if (d.descriptor) byBand[d.criterion][d.band_min] = d.descriptor;
          });
          descriptorCache[dKey] = byBand;
        }
      }
    }

    // ─── Fetch Semester 1 grades when generating Semester 2 (for Progression page) ──
    let semester1Rows = [];
    if (semester === '2') {
      for (const dk of detailKelasData || []) {
        if (!dk.subject) continue;
        if (dk.subject.include_in_print === false) continue;

        const { data: s1Assessments } = await supabase
          .from('assessment')
          .select('assessment_id')
          .eq('assessment_detail_kelas_id', dk.detail_kelas_id)
          .in('assessment_status', [0, 1, 3])
          .eq('assessment_semester', 1);

        let s1Grades = { A: null, B: null, C: null, D: null };
        let s1Overview = null;
        const s1Ids = (s1Assessments || []).map(a => a.assessment_id);
        if (s1Ids.length > 0) {
          const { data: s1GradesData } = await supabase
            .from('assessment_grades')
            .select('criterion_a_grade, criterion_b_grade, criterion_c_grade, criterion_d_grade')
            .eq('detail_siswa_id', studentId)
            .in('assessment_id', s1Ids);
          if (s1GradesData && s1GradesData.length > 0) {
            const allA = s1GradesData.map(g => g.criterion_a_grade).filter(g => g !== null);
            const allB = s1GradesData.map(g => g.criterion_b_grade).filter(g => g !== null);
            const allC = s1GradesData.map(g => g.criterion_c_grade).filter(g => g !== null);
            const allD = s1GradesData.map(g => g.criterion_d_grade).filter(g => g !== null);
            s1Grades.A = allA.length > 0 ? Math.max(...allA) : null;
            s1Grades.B = allB.length > 0 ? Math.max(...allB) : null;
            s1Grades.C = allC.length > 0 ? Math.max(...allC) : null;
            s1Grades.D = allD.length > 0 ? Math.max(...allD) : null;
            const vals = [s1Grades.A, s1Grades.B, s1Grades.C, s1Grades.D].filter(g => g !== null);
            if (vals.length > 0) {
              const total = vals.reduce((a, b) => a + b, 0);
              const scale = vals.length / 4;
              const customBounds = dk.subject.custom_grade_boundaries;
              const b = (customBounds && customBounds.length === 6)
                ? customBounds
                : [5, 9, 14, 18, 23, 27].map(v => Math.round(v * scale));
              if (total <= b[0]) s1Overview = 1;
              else if (total <= b[1]) s1Overview = 2;
              else if (total <= b[2]) s1Overview = 3;
              else if (total <= b[3]) s1Overview = 4;
              else if (total <= b[4]) s1Overview = 5;
              else if (total <= b[5]) s1Overview = 6;
              else s1Overview = 7;
            }
          }
        }
        if (s1Grades.A !== null || s1Grades.B !== null || s1Grades.C !== null || s1Grades.D !== null || s1Overview !== null) {
          const s1Vals = [s1Grades.A, s1Grades.B, s1Grades.C, s1Grades.D].filter(g => g !== null);
          semester1Rows.push({
            subject_id:     dk.subject.subject_id,
            subject_name:   dk.subject.subject_name,
            core_subject:   dk.subject.core_subject || false,
            semester_overview: s1Overview,
            criteriaTotal:  s1Vals.length > 0 ? s1Vals.reduce((a, b) => a + b, 0) : null,
            numCriteria:    s1Vals.length,
          });
        }
      }
    }

    // ─── Build PDF ─────────────────────────────────────────────────────────
    const pdfBlob = buildStudentReportPDF({
      studentName, studentFirstName, studentDOB,
      kelasName, semester, semesterLabel, yearName,
      homeroomTeacherName, unitPrincipalName, unitPrincipalTitle, unitGreeting, unitReportDate,
      logoBase64, reportRows, iconCache, iconBySubjectId,
      criteriaNameCache, descriptorCache, mentorComment,
      semester1Rows
    });
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


// ─── Batch Class Report ZIP ──────────────────────────────────────────────────

/**
 * Generate student report PDFs for ALL students in a class and package as ZIP.
 * Uses batch queries to minimize Supabase calls (~30 total for 30 students).
 * @param {Object} deps
 */
export const generateClassReportZIP = async ({
  reportFilters, reportStudents, reportKelasOptions, reportYears,
  subjects, setLoadingReport, onProgress, onError
}) => {
  if (!reportFilters.kelas) {
    alert('Silakan pilih kelas terlebih dahulu');
    return;
  }

  try {
    setLoadingReport(true);
    const kelasId = parseInt(reportFilters.kelas);
    const semester = reportFilters.semester || '1';
    const semesterLabel = semester === '1' ? 'Semester 1' : 'Semester 2';
    const semesterInt = parseInt(semester);
    const kelasName = reportKelasOptions.find(k => k.kelas_id === kelasId)?.kelas_nama || '';
    const yearName = reportYears.find(y => y.year_id === parseInt(reportFilters.year))?.year_name || '';

    onProgress?.(0, reportStudents.length, 'Fetching shared data...');

    // ── PHASE 1: Fetch SHARED data (same for all students) ──────────────

    const { data: kelasData } = await supabase
      .from('kelas')
      .select('kelas_user_id, kelas_unit_id')
      .eq('kelas_id', kelasId)
      .single();

    let homeroomTeacherName = '-';
    if (kelasData?.kelas_user_id) {
      const { data: htData } = await supabase
        .from('users')
        .select('user_nama_depan, user_nama_belakang')
        .eq('user_id', kelasData.kelas_user_id)
        .single();
      if (htData) homeroomTeacherName = `${htData.user_nama_depan} ${htData.user_nama_belakang}`.trim();
    }

    let unitPrincipalName = '', unitPrincipalTitle = '', unitGreeting = null, unitReportDate = null;
    if (kelasData?.kelas_unit_id && reportFilters.year) {
      const { data: rsData } = await supabase
        .from('report_settings')
        .select('principal_name, principal_title, report_greeting, report_date_s1, report_date_s2')
        .eq('unit_id', kelasData.kelas_unit_id)
        .eq('year_id', parseInt(reportFilters.year))
        .single();
      if (rsData) {
        unitPrincipalName = rsData.principal_name || '';
        unitPrincipalTitle = rsData.principal_title || '';
        unitGreeting = rsData.report_greeting || null;
        unitReportDate = (semester === '1' ? rsData.report_date_s1 : rsData.report_date_s2) || null;
      }
    }

    const { data: detailKelasData, error: dkError } = await supabase
      .from('detail_kelas')
      .select(`
        detail_kelas_id,
        detail_kelas_subject_id,
        myp_year_s1,
        myp_year_s2,
        subject:detail_kelas_subject_id (
          subject_id, subject_name, subject_user_id, subject_icon,
          core_subject, print_order, include_in_print, subject_group_id, custom_grade_boundaries
        )
      `)
      .eq('detail_kelas_kelas_id', kelasId);
    if (dkError) throw dkError;

    const printableSubjects = (detailKelasData || []).filter(dk => dk.subject && dk.subject.include_in_print !== false);

    // Fetch all teacher names in batch
    const teacherUserIds = [...new Set(printableSubjects.map(dk => dk.subject.subject_user_id).filter(Boolean))];
    const teacherMap = new Map();
    if (teacherUserIds.length > 0) {
      const { data: teachersData } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang')
        .in('user_id', teacherUserIds);
      (teachersData || []).forEach(t => {
        teacherMap.set(t.user_id, `${t.user_nama_depan} ${t.user_nama_belakang}`.trim());
      });
    }

    // Fetch all assessments for all subjects in batch
    const detailKelasIds = printableSubjects.map(dk => dk.detail_kelas_id);
    const { data: allAssessments } = await supabase
      .from('assessment')
      .select('assessment_id, assessment_detail_kelas_id')
      .in('assessment_detail_kelas_id', detailKelasIds)
      .in('assessment_status', [0, 1, 3])
      .eq('assessment_semester', semesterInt);
    const allAssessmentIds = (allAssessments || []).map(a => a.assessment_id);

    // Fetch ALL grades for ALL students in batch (1 query!)
    let allGradesData = [];
    if (allAssessmentIds.length > 0) {
      const { data } = await supabase
        .from('assessment_grades')
        .select('assessment_id, detail_siswa_id, criterion_a_grade, criterion_b_grade, criterion_c_grade, criterion_d_grade, final_grade')
        .in('assessment_id', allAssessmentIds);
      allGradesData = data || [];
    }

    // Fetch ALL subject comments for this class+semester in batch (1 query!)
    const allStudentUserIds = reportStudents.map(s => s.user_id).filter(Boolean);
    let allCommentsData = [];
    if (allStudentUserIds.length > 0) {
      const { data } = await supabase
        .from('subject_comment')
        .select('subject_id, student_user_id, comment_text')
        .eq('kelas_id', kelasId)
        .eq('semester', semesterInt)
        .in('student_user_id', allStudentUserIds);
      allCommentsData = data || [];
    }

    // Fetch ALL mentor comments in batch (1 query!)
    let allMentorData = [];
    if (allStudentUserIds.length > 0) {
      const { data } = await supabase
        .from('mentor_comment')
        .select('student_user_id, absent, present, late, sick, excused, comment_text')
        .eq('kelas_id', kelasId)
        .eq('semester', semesterInt)
        .in('student_user_id', allStudentUserIds);
      allMentorData = data || [];
    }

    // Fetch ALL student DOBs in batch (1 query!)
    let allDobData = [];
    if (allStudentUserIds.length > 0) {
      const { data } = await supabase
        .from('users')
        .select('user_id, user_birth_date')
        .in('user_id', allStudentUserIds);
      allDobData = data || [];
    }

    // Build lookup maps
    const mentorMap = new Map();
    (allMentorData || []).forEach(m => { mentorMap.set(m.student_user_id, m); });
    const dobMap = new Map();
    (allDobData || []).forEach(d => { dobMap.set(d.user_id, d.user_birth_date); });
    const commentMap = new Map();
    (allCommentsData || []).forEach(c => { commentMap.set(`${c.subject_id}_${c.student_user_id}`, c.comment_text); });

    const gradesLookup = new Map();
    allGradesData.forEach(g => {
      if (!gradesLookup.has(g.detail_siswa_id)) gradesLookup.set(g.detail_siswa_id, []);
      gradesLookup.get(g.detail_siswa_id).push(g);
    });

    const assessmentsByDK = new Map();
    (allAssessments || []).forEach(a => {
      if (!assessmentsByDK.has(a.assessment_detail_kelas_id)) assessmentsByDK.set(a.assessment_detail_kelas_id, []);
      assessmentsByDK.get(a.assessment_detail_kelas_id).push(a.assessment_id);
    });

    // Preload shared resources: logo + subject icons + criteria + descriptors
    let logoBase64 = '';
    try {
      const logoResponse = await fetch('/images/login-logo.png');
      const logoBlob = await logoResponse.blob();
      logoBase64 = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(logoBlob);
      });
    } catch (e) { console.warn('Could not load logo:', e); }

    const criteriaNameCache = {};
    for (const dk of printableSubjects) {
      const sid = dk.subject.subject_id;
      if (!criteriaNameCache[sid]) {
        const { data: crData } = await supabase
          .from('criteria').select('code, name').eq('subject_id', sid).order('code');
        criteriaNameCache[sid] = {};
        (crData || []).forEach(c => { criteriaNameCache[sid][c.code] = c.name; });
      }
    }

    const descriptorCache = {};
    for (const dk of printableSubjects) {
      if (dk.subject.subject_group_id) {
        const mypYr = semester === '1' ? (dk.myp_year_s1 || 1) : (dk.myp_year_s2 || 1);
        const dKey = `${dk.subject.subject_group_id}_${mypYr}_${semesterInt}`;
        if (!descriptorCache[dKey]) {
          const { data: dData } = await supabase
            .from('criterion_descriptors')
            .select('criterion, band_min, descriptor, semester')
            .eq('subject_group_id', dk.subject.subject_group_id)
            .eq('myp_year', mypYr)
            .in('semester', [0, semesterInt]);
          const byBand = {};
          const shared = (dData || []).filter(d => d.semester === 0);
          const specific = (dData || []).filter(d => d.semester === semesterInt);
          [...shared, ...specific].forEach(d => {
            if (!byBand[d.criterion]) byBand[d.criterion] = {};
            if (d.descriptor) byBand[d.criterion][d.band_min] = d.descriptor;
          });
          descriptorCache[dKey] = byBand;
        }
      }
    }

    const iconBySubjectId = {};
    for (const dk of printableSubjects) {
      if (dk.subject.subject_icon && !iconBySubjectId[dk.subject.subject_id]) {
        try {
          const resp = await fetch(dk.subject.subject_icon);
          const blob = await resp.blob();
          const b64 = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          iconBySubjectId[dk.subject.subject_id] = b64;
        } catch { /* skip */ }
      }
    }

    // ── PHASE 2: Generate PDF per student ───────────────────────────────

    const zip = new JSZip();
    let generated = 0;

    for (const student of reportStudents) {
      const studentName = student.nama || 'Unknown';
      const studentFirstName = studentName.split(' ')[0] || studentName;
      const studentUserId = student.user_id;
      const studentId = student.detail_siswa_id;

      onProgress?.(generated + 1, reportStudents.length, studentName);

      const reportRows = [];
      for (const dk of printableSubjects) {
        const teacherName = teacherMap.get(dk.subject.subject_user_id) || '-';
        const dkAssessmentIds = assessmentsByDK.get(dk.detail_kelas_id) || [];

        let grades = { A: null, B: null, C: null, D: null };
        let semesterOverview = null;

        if (dkAssessmentIds.length > 0) {
          const studentGrades = (gradesLookup.get(studentId) || [])
            .filter(g => dkAssessmentIds.includes(g.assessment_id));
          if (studentGrades.length > 0) {
            const allA = studentGrades.map(g => g.criterion_a_grade).filter(g => g !== null);
            const allB = studentGrades.map(g => g.criterion_b_grade).filter(g => g !== null);
            const allC = studentGrades.map(g => g.criterion_c_grade).filter(g => g !== null);
            const allD = studentGrades.map(g => g.criterion_d_grade).filter(g => g !== null);
            grades.A = allA.length > 0 ? Math.max(...allA) : null;
            grades.B = allB.length > 0 ? Math.max(...allB) : null;
            grades.C = allC.length > 0 ? Math.max(...allC) : null;
            grades.D = allD.length > 0 ? Math.max(...allD) : null;
            const criteriaValues = [grades.A, grades.B, grades.C, grades.D].filter(g => g !== null);
            if (criteriaValues.length > 0) {
              const total = criteriaValues.reduce((a, b) => a + b, 0);
              const customBounds = dk.subject.custom_grade_boundaries;
              const scale = criteriaValues.length / 4;
              const b = (customBounds && customBounds.length === 6)
                ? customBounds
                : [5, 9, 14, 18, 23, 27].map(v => Math.round(v * scale));
              if (total <= b[0]) semesterOverview = 1;
              else if (total <= b[1]) semesterOverview = 2;
              else if (total <= b[2]) semesterOverview = 3;
              else if (total <= b[3]) semesterOverview = 4;
              else if (total <= b[4]) semesterOverview = 5;
              else if (total <= b[5]) semesterOverview = 6;
              else semesterOverview = 7;
            }
          }
        }

        const comment = commentMap.get(`${dk.subject.subject_id}_${studentUserId}`) || '';
        const hasGrades = grades.A !== null || grades.B !== null || grades.C !== null || grades.D !== null || semesterOverview !== null;
        if (!hasGrades) continue;

        reportRows.push({
          subject_id: dk.subject.subject_id,
          subject_name: dk.subject.subject_name,
          subject_icon: dk.subject.subject_icon || null,
          core_subject: dk.subject.core_subject || false,
          print_order: dk.subject.print_order ?? 0,
          teacher_name: teacherName,
          grades,
          semester_overview: semesterOverview,
          comment,
          subject_group_id: dk.subject.subject_group_id || null,
          myp_year_s1: dk.myp_year_s1 || 1,
          myp_year_s2: dk.myp_year_s2 || 1,
          custom_grade_boundaries: dk.subject.custom_grade_boundaries || null
        });
      }

      reportRows.sort((a, b) => {
        if (a.core_subject !== b.core_subject) return a.core_subject ? -1 : 1;
        return (a.print_order ?? 0) - (b.print_order ?? 0);
      });

      if (reportRows.length === 0) { generated++; continue; }

      const iconCache = {};
      reportRows.forEach((row, i) => {
        if (iconBySubjectId[row.subject_id]) iconCache[i] = iconBySubjectId[row.subject_id];
      });

      const mentorData = mentorMap.get(studentUserId);
      const mentorComment = {
        absent: mentorData?.absent ?? 0,
        present: mentorData?.present ?? 0,
        late: mentorData?.late ?? 0,
        sick: mentorData?.sick ?? 0,
        excused: mentorData?.excused ?? 0,
        comment_text: mentorData?.comment_text || ''
      };

      const rawDob = dobMap.get(studentUserId);
      const studentDOB = rawDob
        ? new Date(rawDob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : '-';

      // ─── Fetch Semester 1 grades for Progression page (Semester 2 only) ──
      let semester1Rows = [];
      if (semester === '2') {
        for (const dk of printableSubjects) {
          const { data: s1Assessments } = await supabase
            .from('assessment')
            .select('assessment_id')
            .eq('assessment_detail_kelas_id', dk.detail_kelas_id)
            .in('assessment_status', [0, 1, 3])
            .eq('assessment_semester', 1);
          let s1Grades = { A: null, B: null, C: null, D: null };
          let s1Overview = null;
          const s1Ids = (s1Assessments || []).map(a => a.assessment_id);
          if (s1Ids.length > 0) {
            const { data: s1GradesData } = await supabase
              .from('assessment_grades')
              .select('criterion_a_grade, criterion_b_grade, criterion_c_grade, criterion_d_grade')
              .eq('detail_siswa_id', student.detail_siswa_id)
              .in('assessment_id', s1Ids);
            if (s1GradesData && s1GradesData.length > 0) {
              const allA = s1GradesData.map(g => g.criterion_a_grade).filter(g => g !== null);
              const allB = s1GradesData.map(g => g.criterion_b_grade).filter(g => g !== null);
              const allC = s1GradesData.map(g => g.criterion_c_grade).filter(g => g !== null);
              const allD = s1GradesData.map(g => g.criterion_d_grade).filter(g => g !== null);
              s1Grades.A = allA.length > 0 ? Math.max(...allA) : null;
              s1Grades.B = allB.length > 0 ? Math.max(...allB) : null;
              s1Grades.C = allC.length > 0 ? Math.max(...allC) : null;
              s1Grades.D = allD.length > 0 ? Math.max(...allD) : null;
              const vals = [s1Grades.A, s1Grades.B, s1Grades.C, s1Grades.D].filter(g => g !== null);
              if (vals.length > 0) {
                const total = vals.reduce((a, b) => a + b, 0);
                const scale = vals.length / 4;
                const customBounds = dk.subject.custom_grade_boundaries;
                const bnd = (customBounds && customBounds.length === 6)
                  ? customBounds
                  : [5, 9, 14, 18, 23, 27].map(v => Math.round(v * scale));
                if (total <= bnd[0]) s1Overview = 1;
                else if (total <= bnd[1]) s1Overview = 2;
                else if (total <= bnd[2]) s1Overview = 3;
                else if (total <= bnd[3]) s1Overview = 4;
                else if (total <= bnd[4]) s1Overview = 5;
                else if (total <= bnd[5]) s1Overview = 6;
                else s1Overview = 7;
              }
            }
          }
          if (s1Grades.A !== null || s1Grades.B !== null || s1Grades.C !== null || s1Grades.D !== null || s1Overview !== null) {
            const s1Vals = [s1Grades.A, s1Grades.B, s1Grades.C, s1Grades.D].filter(g => g !== null);
            semester1Rows.push({
              subject_id:     dk.subject.subject_id,
              subject_name:   dk.subject.subject_name,
              core_subject:   dk.subject.core_subject || false,
              semester_overview: s1Overview,
              criteriaTotal:  s1Vals.length > 0 ? s1Vals.reduce((a, b) => a + b, 0) : null,
              numCriteria:    s1Vals.length,
            });
          }
        }
      }

      const pdfBlob = buildStudentReportPDF({
        studentName, studentFirstName, studentDOB,
        kelasName, semester, semesterLabel, yearName,
        homeroomTeacherName, unitPrincipalName, unitPrincipalTitle, unitGreeting, unitReportDate,
        logoBase64, reportRows, iconCache, iconBySubjectId,
        criteriaNameCache, descriptorCache, mentorComment,
        semester1Rows
      });

      const safeName = studentName.replace(/[^a-zA-Z0-9\s\-]/g, '').trim();
      zip.file(`${safeName}.pdf`, pdfBlob);
      generated++;
    }

    if (generated === 0) {
      alert('Tidak ada data report untuk kelas ini');
      return;
    }

    onProgress?.(reportStudents.length, reportStudents.length, 'Creating ZIP...');

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report-${kelasName}-${semesterLabel}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

  } catch (err) {
    console.error('Error generating class report ZIP:', err);
    if (onError) onError(err);
    else alert('Gagal menghasilkan report kelas: ' + err.message);
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
