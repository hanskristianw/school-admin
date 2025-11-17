'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import NotificationModal from '@/components/ui/notification-modal';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faSearch, faComment, faSave, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';

export default function DataCommentPage() {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(false);
  
  // Step 1: Subject selection
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  
  // Step 2: Kelas selection
  const [kelasList, setKelasList] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState('');
  
  // Step 3: Topic selection
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  
  // Step 4: Student list with comments
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  // Notification modal state
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  const showNotification = (title, message, type = 'success') => {
    setNotification({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  // Fetch all subjects on mount
  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subject')
        .select('subject_id, subject_name')
        .order('subject_name');

      if (subjectsError) throw subjectsError;

      setSubjects(subjectsData || []);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      showNotification('Error', 'Failed to load subjects: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch kelas when subject is selected
  const handleSubjectChange = async (subjectId) => {
    setSelectedSubject(subjectId);
    setSelectedKelas('');
    setSelectedTopic('');
    setKelasList([]);
    setTopics([]);
    setStudents([]);

    if (!subjectId) return;

    try {
      setLoading(true);
      
      // Get detail_kelas for this subject
      const { data: detailKelasData, error: detailKelasError } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_id, detail_kelas_kelas_id')
        .eq('detail_kelas_subject_id', subjectId);

      if (detailKelasError) throw detailKelasError;

      if (!detailKelasData || detailKelasData.length === 0) {
        setKelasList([]);
        return;
      }

      const kelasIds = Array.from(new Set(detailKelasData.map(d => d.detail_kelas_kelas_id)));

      // Get kelas names
      const { data: kelasData, error: kelasError } = await supabase
        .from('kelas')
        .select('kelas_id, kelas_nama')
        .in('kelas_id', kelasIds)
        .order('kelas_nama');

      if (kelasError) throw kelasError;

      setKelasList(kelasData || []);
    } catch (err) {
      console.error('Error fetching kelas:', err);
      showNotification('Error', 'Failed to load classes: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch topics when kelas is selected
  const handleKelasChange = async (kelasId) => {
    setSelectedKelas(kelasId);
    setSelectedTopic('');
    setTopics([]);
    setStudents([]);

    if (!kelasId || !selectedSubject) return;

    try {
      setLoading(true);
      
      // Get topics for this subject and kelas
      const { data: topicsData, error: topicsError } = await supabase
        .from('topic')
        .select('topic_id, topic_nama')
        .eq('topic_subject_id', selectedSubject)
        .eq('topic_kelas_id', kelasId)
        .order('topic_nama');

      if (topicsError) throw topicsError;

      setTopics(topicsData || []);
    } catch (err) {
      console.error('Error fetching topics:', err);
      showNotification('Error', 'Failed to load topics: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch students when topic is selected
  const handleTopicChange = async (topicId) => {
    setSelectedTopic(topicId);
    setStudents([]);

    if (!topicId || !selectedKelas) return;

    try {
      setLoadingStudents(true);
      
      // Get detail_siswa for this kelas
      const { data: detailSiswaData, error: detailSiswaError } = await supabase
        .from('detail_siswa')
        .select('detail_siswa_id, detail_siswa_user_id')
        .eq('detail_siswa_kelas_id', selectedKelas);

      if (detailSiswaError) throw detailSiswaError;

      if (!detailSiswaData || detailSiswaData.length === 0) {
        setStudents([]);
        return;
      }

      // Get user names
      const userIds = detailSiswaData.map(d => d.detail_siswa_user_id);
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang')
        .in('user_id', userIds)
        .order('user_nama_depan');

      if (usersError) throw usersError;

      const nameMap = new Map((usersData || []).map(u => [
        u.user_id,
        `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim()
      ]));

      // Initialize students with empty comments
      const studentsWithComments = detailSiswaData.map(d => ({
        detail_siswa_id: d.detail_siswa_id,
        user_id: d.detail_siswa_user_id,
        student_name: nameMap.get(d.detail_siswa_user_id) || `User ${d.detail_siswa_user_id}`,
        comment: ''
      }));

      // Sort by name
      studentsWithComments.sort((a, b) => a.student_name.localeCompare(b.student_name));

      setStudents(studentsWithComments);
    } catch (err) {
      console.error('Error fetching students:', err);
      showNotification('Error', 'Failed to load students: ' + err.message, 'error');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleCommentChange = (detailSiswaId, value) => {
    setStudents(prev => prev.map(student => 
      student.detail_siswa_id === detailSiswaId 
        ? { ...student, comment: value }
        : student
    ));
  };

  const handleSaveComment = async (student) => {
    try {
      setSaving(true);
      // TODO: Add actual save logic here when you add comment field to database
      console.log('Saving comment for:', {
        student,
        subject_id: selectedSubject,
        kelas_id: selectedKelas,
        topic_id: selectedTopic
      });
      
      showNotification('Success', `Comment saved for ${student.student_name}`, 'success');
    } catch (err) {
      console.error('Error saving comment:', err);
      showNotification('Error', 'Failed to save comment: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <FontAwesomeIcon icon={faSpinner} className="text-4xl text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          <FontAwesomeIcon icon={faComment} className="mr-3" />
          Student Comments
        </h1>
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Step 1: Subject Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                1. Select Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">-- Select Subject --</option>
                {subjects.map(subject => (
                  <option key={subject.subject_id} value={subject.subject_id}>
                    {subject.subject_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Kelas Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                2. Select Class
              </label>
              <select
                value={selectedKelas}
                onChange={(e) => handleKelasChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!selectedSubject || loading}
              >
                <option value="">-- Select Class --</option>
                {kelasList.map(kelas => (
                  <option key={kelas.kelas_id} value={kelas.kelas_id}>
                    {kelas.kelas_nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 3: Topic Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                3. Select Topic
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => handleTopicChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!selectedKelas || loading}
              >
                <option value="">-- Select Topic --</option>
                {topics.map(topic => (
                  <option key={topic.topic_id} value={topic.topic_id}>
                    {topic.topic_nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Info Display */}
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                {students.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                    <strong>{students.length}</strong> student{students.length !== 1 ? 's' : ''} found
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loadingStudents && (
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="text-3xl text-blue-500 animate-spin" />
        </div>
      )}

      {/* Student List with Comments */}
      {!loadingStudents && students.length > 0 && (
        <div className="space-y-4">
          {students.map((student) => (
            <Card key={student.detail_siswa_id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {student.student_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comment:
                  </label>
                  <textarea
                    value={student.comment}
                    onChange={(e) => handleCommentChange(student.detail_siswa_id, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="4"
                    placeholder="Enter your comment here..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => {/* TODO: AI Help functionality */}}
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="mr-2" />
                    AI Help
                  </Button>
                  <Button
                    onClick={() => handleSaveComment(student)}
                    disabled={saving || !student.comment.trim()}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                    Save Comment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loadingStudents && selectedTopic && students.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-gray-500">
              No students found in this class
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={closeNotification}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}
