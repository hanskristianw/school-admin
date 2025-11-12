"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        
        @media screen {
          .print-page-wrapper {
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
          }
        }
        
        @media print {
          @page {
            size: A4 landscape;
            margin: 0.4in 0.5in;
          }
          
          html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: visible;
          }
          
          * {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-page-wrapper {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
          }
          
          .print-container {
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            max-width: none !important;
            width: 100% !important;
            height: auto !important;
          }
          
          .print-table {
            width: 100% !important;
            page-break-inside: auto;
          }
          
          .print-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          .print-table td,
          .print-table th {
            page-break-inside: avoid;
          }
        }
        
        .print-container {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9pt;
          background-color: white;
          padding: 20px;
        }
        
        @media print {
          .print-container {
            font-size: 7pt;
            max-width: 100%;
          }
        }
        
        .print-table {
          width: 100%;
          border-collapse: collapse;
          border: 2px solid #000;
          table-layout: fixed;
        }
        
        .print-table th,
        .print-table td {
          border: 1px solid #000;
          padding: 3px 4px;
          text-align: left;
          vertical-align: top;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
          font-size: 7.5pt;
          line-height: 1.1;
        }
        
        .print-table th {
          background-color: #d3d3d3;
          font-weight: bold;
        }
        
        .section-label {
          background-color: #e8e8e8;
          font-weight: bold;
        }
        
        .content-cell {
          background-color: white;
        }
        
        .content-cell div {
          width: 100%;
          overflow-wrap: break-word;
          word-break: break-word;
          font-size: 7pt;
        }
        
        @media print {
          .print-table th,
          .print-table td {
            font-size: 6pt !important;
            padding: 2px 3px !important;
            line-height: 1.05 !important;
          }
          
          .content-cell div {
            font-size: 6pt !important;
            line-height: 1.05 !important;
          }
          
          .section-label {
            font-size: 6pt !important;
          }
        }
      `}</style>

      <div className="print-page-wrapper">
        <div className="print-container">
          <table className="print-table">
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

            {/* Inquiry Section Header */}
            <tr>
              <td colSpan="8" style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold', padding: '8px' }}>
                Inquiry:
              </td>
            </tr>

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
              <td colSpan="8" className="content-cell">
                <div style={{ whiteSpace: 'pre-wrap' }}>{topic.topic_inquiry_question || 'N/A'}</div>
              </td>
            </tr>

            {/* MYP Objectives and Summative assessment - side by side */}
            <tr>
              <td colSpan="4" className="section-label"><strong>MYP Objectives</strong></td>
              <td colSpan="4" className="section-label"><strong>Summative assessment</strong></td>
            </tr>
            <tr>
              <td colSpan="4" className="content-cell" style={{ verticalAlign: 'top' }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{topic.topic_myp_objectives || 'N/A'}</div>
              </td>
              <td colSpan="4" className="content-cell" style={{ verticalAlign: 'top' }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{topic.topic_summative_assessment || 'N/A'}</div>
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
                  <td colSpan="8" className="content-cell">
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '8pt' }}>
                      {topic.topic_relationship_summative_assessment_statement_of_inquiry}
                    </div>
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
                  <td colSpan="8" className="content-cell">
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '8pt' }}>{topic.topic_content}</div>
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
                  <td colSpan="8" className="content-cell">
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '8pt' }}>{topic.topic_atl_skills}</div>
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
                  <td colSpan="8" className="content-cell">
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '8pt' }}>{topic.topic_learning_process}</div>
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
                  <td colSpan="8" className="content-cell">
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '8pt' }}>{topic.topic_formative_assessment}</div>
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
                  <td colSpan="8" className="content-cell">
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '8pt' }}>{topic.topic_resources}</div>
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
                  <td colSpan="8" className="content-cell">
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '8pt' }}>{topic.topic_reflection}</div>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        <div className="no-print mt-6 text-center space-x-4">
          <button 
            onClick={() => window.print()} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow"
          >
            Print / Save as PDF
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
