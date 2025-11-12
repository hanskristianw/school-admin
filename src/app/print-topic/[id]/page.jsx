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
          
          if (subjectErr) {
            console.error("Error loading subject:", subjectErr);
          } else {
            setSubject(subjectData);
            console.log("Subject loaded:", subjectData);

            // Load teacher data
            if (subjectData?.subject_user_id) {
              const { data: teacherData, error: teacherErr } = await supabase
                .from("users")
                .select("name")
                .eq("user_id", subjectData.subject_user_id)
                .single();
              
              if (teacherErr) {
                console.error("Error loading teacher:", teacherErr);
              } else {
                setTeacher(teacherData);
                console.log("Teacher loaded:", teacherData);
              }
            }
          }
        }

        // Load kelas data
        if (topicData.topic_kelas_id) {
          const { data: kelasData, error: kelasErr } = await supabase
            .from("kelas")
            .select("kelas_grade")
            .eq("kelas_id", topicData.topic_kelas_id)
            .single();
          
          if (kelasErr) {
            console.error("Error loading kelas:", kelasErr);
          } else {
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
            { content: 'Teacher(s)', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: teacher?.name || 'N/A' },
            { content: 'Subject group and discipline', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: subject?.subject_name || 'N/A' },
            { content: 'MYP year', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: kelas?.kelas_grade || 'N/A' },
            { content: 'Unit duration (hrs)', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: topic.topic_duration || 'N/A' },
          ],
          [
            { content: 'Unit title', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: topic.topic_nama || 'N/A', colSpan: 7 },
          ],
        ],
        theme: 'grid',
        styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.5 },
        columnStyles: {
          0: { cellWidth: 32 },  // Teacher label
          1: { cellWidth: 56 },  // Teacher name
          2: { cellWidth: 48 },  // Subject label
          3: { cellWidth: 56 },  // Subject name
          4: { cellWidth: 21 },  // MYP year label
          5: { cellWidth: 21 },  // Grade
          6: { cellWidth: 19 },  // Duration label
          7: { cellWidth: 13 },  // Duration value
        },
      });

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
      });

      // Add new page for remaining sections
      pdf.addPage();
      yPos = 10;

      // Define sections array
      const sections = [
        { label: 'Middle Years Programme objectives', content: topic.topic_myp_objectives },
        { label: 'Summative assessment task(s)', content: topic.topic_summative_assessment },
        { label: 'Relationship between summative assessment task(s) and statement of inquiry', content: topic.topic_relationship },
        { label: 'Approaches to learning (ATL) skills', content: topic.topic_atl_skills },
        { label: 'Content', content: topic.topic_content },
        { label: 'Learning experiences and teaching strategies', content: topic.topic_learning_experiences },
        { label: 'Formative assessment', content: topic.topic_formative_assessment },
        { label: 'Differentiation', content: topic.topic_differentiation },
        { label: 'Resources', content: topic.topic_resources },
        { label: 'Reflection', content: topic.topic_reflection },
      ];

      // Add each section to page 2
      sections.forEach((section, index) => {
        if (section.content) {
          autoTable(pdf, {
            startY: yPos,
            head: [],
            body: [
              [{ content: section.label, styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }, colSpan: 8 }],
              [{ content: section.content, colSpan: 8, styles: { cellPadding: 3 } }],
            ],
            theme: 'grid',
            styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.5 },
          });
          yPos = pdf.lastAutoTable.finalY + 5;
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
          <h1 className="text-2xl font-bold mb-6 text-gray-800">Unit Planner - {topic.topic_nama}</h1>
          
          <div className="mb-8 space-y-2 text-gray-700">
            <p><strong>Subject:</strong> {subject?.subject_name || 'N/A'}</p>
            <p><strong>Teacher:</strong> {teacher?.name || 'N/A'}</p>
            <p><strong>Grade:</strong> {kelas?.kelas_grade || 'N/A'}</p>
            <p><strong>Duration:</strong> {topic.topic_duration || 'N/A'} hours</p>
          </div>

          <div className="border-t pt-6 mt-6 text-center space-x-4">
            <button 
              onClick={generatePDF}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg shadow-lg font-semibold transition-colors"
            >
              📄 Download PDF
            </button>
            
            <button 
              onClick={() => router.back()} 
              className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg shadow-lg font-semibold transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
