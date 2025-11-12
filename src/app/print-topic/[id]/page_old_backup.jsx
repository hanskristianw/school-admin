"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function TopicPrintPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params?.id;
  const [topic, setTopic] = useState(null);
  const [subject, setSubject] = useState(null);
  const [kelas, setKelas] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load topic data
        const { data: topicData, error: topicErr } = await supabase
          .from("topic")
          .select("*")
          .eq("topic_id", topicId)
          .single();
        
        if (topicErr) {
          console.error("Error loading topic:", topicErr);
          throw topicErr;
        }
        
        if (!topicData) {
          console.error("No topic data found");
          setLoading(false);
          return;
        }
        
        setTopic(topicData);
        console.log("Topic loaded:", topicData);

        // Load subject data
        if (topicData.topic_subject_id) {
          const { data: subjectData, error: subjectErr } = await supabase
            .from("subject")
            .select("subject_name, subject_user_id")
            .eq("subject_id", topicData.topic_subject_id)
            .single();
          
          console.log("Subject data:", subjectData, "Error:", subjectErr);
          
          if (!subjectErr && subjectData) {
            setSubject(subjectData);
            
            // Load teacher data
            if (subjectData.subject_user_id) {
              const { data: userData, error: userErr } = await supabase
                .from("users")
                .select("user_nama_depan, user_nama_belakang")
                .eq("user_id", subjectData.subject_user_id)
                .single();
              
              console.log("User data:", userData, "Error:", userErr);
              
              if (!userErr && userData) {
                const fullName = `${userData.user_nama_depan || ''} ${userData.user_nama_belakang || ''}`.trim();
                setTeacher({ name: fullName });
              }
            }
          }
        }

        // Load kelas data
        if (topicData.topic_kelas_id) {
          const { data: kelasData, error: kelasErr } = await supabase
            .from("kelas")
            .select("kelas_nama, kelas_grade")
            .eq("kelas_id", topicData.topic_kelas_id)
            .single();
          
          console.log("Kelas data:", kelasData, "Error:", kelasErr);
          
          if (!kelasErr && kelasData) {
            setKelas(kelasData);
          }
        }
      } catch (e) {
        console.error("Error loading data:", e);
      } finally {
        setLoading(false);
      }
    };

    if (topicId) loadData();
  }, [topicId]);

  // Function to generate high-quality PDF using jsPDF-AutoTable
  const generatePDF = () => {
    try {
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 14; // Left and right margin
      let yPos = 10;

      // Header Table - 8 columns with proper widths
      autoTable(pdf, {
        startY: yPos,
        head: [],
        body: [
          [
            { content: 'Teacher(s)', styles: { fontStyle: 'bold', fillColor: [211, 211, 211] }},
            { content: teacher?.name || 'N/A' },
            { content: 'Subject group and discipline', styles: { fontStyle: 'bold', fillColor: [211, 211, 211] }},
            { content: subject?.subject_name || 'N/A' },
            { content: 'MYP year', styles: { fontStyle: 'bold', fillColor: [211, 211, 211] }},
            { content: kelas?.kelas_grade || 'N/A' },
            { content: 'Unit duration (hrs)', styles: { fontStyle: 'bold', fillColor: [211, 211, 211] }},
            { content: topic.topic_duration || 'N/A' },
          ],
          [
            { content: 'Unit title', styles: { fontStyle: 'bold', fillColor: [211, 211, 211] }},
            { content: topic.topic_nama || 'N/A', colSpan: 7 },
          ],
        ],
        theme: 'grid',
        styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.5 },
        columnStyles: {
          0: { cellWidth: 32 }, // Teacher(s) - 12%
          1: { cellWidth: 56 }, // Teacher name - 21%
          2: { cellWidth: 48 }, // Subject group - 18%
          3: { cellWidth: 56 }, // Subject name - 21%
          4: { cellWidth: 21 }, // MYP year - 8%
          5: { cellWidth: 21 }, // Grade - 8%
          6: { cellWidth: 19 }, // Duration label - 7%
          7: { cellWidth: 13 }, // Duration value - 5%
        },
      });

      yPos = pdf.lastAutoTable.finalY + 5;

      // Add "Inquiry:" text before the table
      yPos = pdf.lastAutoTable.finalY + 8;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Inquiry:', margin, yPos);
      yPos += 6;

      // Inquiry Table - 6 columns layout (3 pairs of label + value)
      const availableWidth = pageWidth - (margin * 2); // Total width minus margins
      autoTable(pdf, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [],
        body: [
          [
            { content: 'Key concept', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: topic.topic_key_concept || 'N/A' },
            { content: 'Related concept(s)', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: topic.topic_related_concept || 'N/A' },
            { content: 'Global context', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: topic.topic_global_context || 'N/A' },
          ],
          [
            { content: 'Statement of inquiry', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }, colSpan: 6 },
          ],
          [
            { content: topic.topic_statement || 'N/A', colSpan: 6, styles: { cellPadding: 3 } },
          ],
          [
            { content: 'Inquiry questions', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }, colSpan: 6 },
          ],
          [
            { content: topic.topic_inquiry_question || 'N/A', colSpan: 6, styles: { cellPadding: 3 } },
          ],
        ],
        theme: 'grid',
        styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.5, valign: 'top' },
        columnStyles: {
          0: { cellWidth: availableWidth * 0.15 }, // Label: 15%
          1: { cellWidth: availableWidth * 0.18 }, // Value: 18%
          2: { cellWidth: availableWidth * 0.17 }, // Label: 17%
          3: { cellWidth: availableWidth * 0.17 }, // Value: 17%
          4: { cellWidth: availableWidth * 0.15 }, // Label: 15%
          5: { cellWidth: availableWidth * 0.18 }, // Value: 18%
        },
      });      // Add new page for objectives
      pdf.addPage();
      yPos = 10;

      // MYP Objectives and other sections
      const sections = [
        { label: 'MYP Objectives', content: topic.topic_myp_objectives },
        { label: 'Summative assessment', content: topic.topic_summative_assessment },
        { label: 'Relationship: SA & SOI', content: topic.topic_relationship_summative_assessment_statement_of_inquiry },
        { label: 'Content', content: topic.topic_content },
        { label: 'ATL Skills', content: topic.topic_atl_skills },
        { label: 'Learning Process', content: topic.topic_learning_process },
        { label: 'Formative Assessment', content: topic.topic_formative_assessment },
        { label: 'Resources', content: topic.topic_resources },
        { label: 'Reflection', content: topic.topic_reflection },
      ];

      sections.forEach((section) => {
        if (section.content) {
          autoTable(pdf, {
            startY: yPos,
            head: [],
            body: [
              [{ content: section.label, styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }, colSpan: 8 }],
              [{ content: section.content || 'N/A', colSpan: 8 }],
            ],
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.5 },
          });
          yPos = pdf.lastAutoTable.finalY + 3;
        }
      });

      // Save PDF
      const fileName = `unit-planner-${topic.topic_nama?.replace(/[^a-z0-9]/gi, '-') || 'topic'}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Topic not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold mb-6">Unit Planner - {topic.topic_nama}</h1>
          
          <div className="mb-4 text-gray-700">
            <p><strong>Subject:</strong> {subject?.subject_name || 'N/A'}</p>
            <p><strong>Teacher:</strong> {teacher?.name || 'N/A'}</p>
            <p><strong>Grade:</strong> {kelas?.kelas_grade || 'N/A'}</p>
          </div>

          <div className="mt-6 text-center space-x-4">
          <tbody>
            {/* Header Row 1 */}
            <tr>
              <th style={{ width: '12%', wordBreak: 'break-word' }}>Teacher(s)</th>
              <td style={{ width: '21%', wordBreak: 'break-word' }}>{teacher?.name || 'N/A'}</td>
              <th style={{ width: '18%', wordBreak: 'break-word' }}>Subject group and discipline</th>
              <td style={{ width: '21%', wordBreak: 'break-word' }}>{subject?.subject_name || 'N/A'}</td>
              <th style={{ width: '8%', wordBreak: 'break-word' }}>MYP year</th>
              <td style={{ width: '8%', wordBreak: 'break-word' }}>{kelas?.kelas_grade || 'N/A'}</td>
              <th style={{ width: '7%', wordBreak: 'break-word' }}>Unit duration (hrs)</th>
              <td style={{ width: '5%', wordBreak: 'break-word' }}>{topic.topic_duration || 'N/A'}</td>
            </tr>

            {/* Header Row 2 - Unit Title */}
            <tr>
              <th style={{ wordBreak: 'break-word' }}>Unit title</th>
              <td colSpan="7" style={{ wordBreak: 'break-word' }}>{topic.topic_nama || 'N/A'}</td>
            </tr>
          </tbody>
          </table>

          {/* Inquiry Section Header - Outside table */}
          <h2 className="section-header">Inquiry:</h2>

          {/* Inquiry Table */}
          <table className="print-table">
          <tbody>
            {/* Key concepts, Related concepts, Global context */}
            <tr>
              <th className="section-label">Key concept</th>
              <td colSpan="2" className="content-cell" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {topic.topic_key_concept || 'N/A'}
              </td>
              <th className="section-label">Related concept(s)</th>
              <td colSpan="2" className="content-cell" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {topic.topic_related_concept || 'N/A'}
              </td>
              <th className="section-label">Global context</th>
              <td className="content-cell" style={{ wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '150px' }}>
                {topic.topic_global_context || 'N/A'}
              </td>
            </tr>

            {/* Statement of inquiry */}
            <tr>
              <td colSpan="8" className="section-label"><strong>Statement of inquiry</strong></td>
            </tr>
            <tr>
              <td colSpan="8" className="content-cell">
                {topic.topic_statement || 'N/A'}
              </td>
            </tr>

            {/* Inquiry questions */}
            <tr>
              <td colSpan="8" className="section-label"><strong>Inquiry questions</strong></td>
            </tr>
            <tr>
              <td colSpan="8" className="content-cell" style={{ whiteSpace: 'pre-wrap' }}>
                {topic.topic_inquiry_question || 'N/A'}
              </td>
            </tr>
          </tbody>
          </table>

          {/* Force page break - using class instead of inline style */}
          <div className="force-page-break"></div>

          {/* Other sections table - New page */}
          <table className="print-table new-page-table" style={{ marginTop: '0' }}>
          <tbody>
            {/* MYP Objectives */}
            <tr>
              <td colSpan="8" className="section-label"><strong>MYP Objectives</strong></td>
            </tr>
            <tr>
              <td colSpan="8" className="content-cell" style={{ whiteSpace: 'pre-wrap' }}>
                {topic.topic_myp_objectives || 'N/A'}
              </td>
            </tr>

            {/* Summative Assessment */}
            <tr>
              <td colSpan="8" className="section-label"><strong>Summative assessment</strong></td>
            </tr>
            <tr>
              <td colSpan="8" className="content-cell" style={{ whiteSpace: 'pre-wrap' }}>
                {topic.topic_summative_assessment || 'N/A'}
              </td>
            </tr>
            {/* Relationship between SA and SOI */}
            {topic.topic_relationship_summative_assessment_statement_of_inquiry && (
              <>
                <tr>
                  <td colSpan="8" className="section-label">
                    <strong>Relationship: SA & SOI</strong>
                  </td>
                </tr>
                <tr>
                  <td colSpan="8" className="content-cell" style={{ whiteSpace: 'pre-wrap' }}>
                    {topic.topic_relationship_summative_assessment_statement_of_inquiry}
                  </td>
                </tr>
              </>
            )}

            {/* Content */}
            {topic.topic_content && (
              <>
                <tr>
                  <td colSpan="8" className="section-label"><strong>Content</strong></td>
                </tr>
                <tr>
                  <td colSpan="8" className="content-cell" style={{ whiteSpace: 'pre-wrap' }}>
                    {topic.topic_content}
                  </td>
                </tr>
              </>
            )}

            {/* ATL Skills */}
            {topic.topic_atl_skills && (
              <>
                <tr>
                  <td colSpan="8" className="section-label"><strong>ATL Skills</strong></td>
                </tr>
                <tr>
                  <td colSpan="8" className="content-cell" style={{ whiteSpace: 'pre-wrap' }}>
                    {topic.topic_atl_skills}
                  </td>
                </tr>
              </>
            )}

            {/* Learning Process */}
            {topic.topic_learning_process && (
              <>
                <tr>
                  <td colSpan="8" className="section-label"><strong>Learning Process</strong></td>
                </tr>
                <tr>
                  <td colSpan="8" className="content-cell" style={{ whiteSpace: 'pre-wrap' }}>
                    {topic.topic_learning_process}
                  </td>
                </tr>
              </>
            )}

            {/* Formative Assessment */}
            {topic.topic_formative_assessment && (
              <>
                <tr>
                  <td colSpan="8" className="section-label"><strong>Formative Assessment</strong></td>
                </tr>
                <tr>
                  <td colSpan="8" className="content-cell" style={{ whiteSpace: 'pre-wrap' }}>
                    {topic.topic_formative_assessment}
                  </td>
                </tr>
              </>
            )}

            {/* Resources */}
            {topic.topic_resources && (
              <>
                <tr>
                  <td colSpan="8" className="section-label"><strong>Resources</strong></td>
                </tr>
                <tr>
                  <td colSpan="8" className="content-cell" style={{ whiteSpace: 'pre-wrap' }}>
                    {topic.topic_resources}
                  </td>
                </tr>
              </>
            )}

            {/* Reflection */}
            {topic.topic_reflection && (
              <>
                <tr>
                  <td colSpan="8" className="section-label"><strong>Reflection</strong></td>
                </tr>
                <tr>
                  <td colSpan="8" className="content-cell" style={{ whiteSpace: 'pre-wrap' }}>
                    {topic.topic_reflection}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        <div className="no-print mt-6 text-center space-x-4">
          <button 
            onClick={(e) => { window.event = e; generatePDF(); }}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded shadow disabled:opacity-50"
          >
            Download PDF
          </button>
          
          <button 
            onClick={() => router.back()} 
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded shadow"
          >
            Back
          </button>
        </div>
        </div>
      </div>
    </>
  );
}
