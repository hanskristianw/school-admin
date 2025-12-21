'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faEdit, faTrash, faSpinner, faFilter, faSearch } from '@fortawesome/free-solid-svg-icons'

export default function ATLDescriptorsPage() {
  
  // State
  const [descriptors, setDescriptors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    skill_category: '',
    strand: '',
    cluster: '',
    min_grade: '',
    max_grade: '',
    descriptor_text: ''
  })
  
  // Filters
  const [filters, setFilters] = useState({
    skill_category: '',
    grade: '',
    search: ''
  })
  
  // Skill categories untuk dropdown
  const skillCategories = [
    'Communication',
    'Social',
    'Self-management',
    'Research',
    'Thinking'
  ]
  
  // Fetch data
  const fetchDescriptors = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('atl_descriptors')
        .select('*')
        .order('skill_category')
        .order('strand')
        .order('cluster')
        .order('min_grade')
      
      const { data, error } = await query
      
      if (error) throw error
      setDescriptors(data || [])
    } catch (error) {
      console.error('Error fetching ATL descriptors:', error)
      alert('Failed to load ATL descriptors')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchDescriptors()
  }, [])
  
  // Filter descriptors
  const filteredDescriptors = descriptors.filter(desc => {
    const matchCategory = !filters.skill_category || desc.skill_category === filters.skill_category
    
    // Grade filter - check if grade is within min and max range
    const matchGrade = !filters.grade || 
      (parseInt(filters.grade) >= desc.min_grade && parseInt(filters.grade) <= desc.max_grade)
    
    const matchSearch = !filters.search || 
      desc.descriptor_text.toLowerCase().includes(filters.search.toLowerCase()) ||
      desc.strand.toLowerCase().includes(filters.search.toLowerCase()) ||
      desc.cluster.toLowerCase().includes(filters.search.toLowerCase())
    
    return matchCategory && matchGrade && matchSearch
  })
  
  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  // Open form for create
  const handleCreate = () => {
    setEditingId(null)
    setFormData({
      skill_category: '',
      strand: '',
      cluster: '',
      min_grade: '',
      max_grade: '',
      descriptor_text: ''
    })
    setShowForm(true)
  }
  
  // Open form for edit
  const handleEdit = (descriptor) => {
    setEditingId(descriptor.id)
    setFormData({
      skill_category: descriptor.skill_category,
      strand: descriptor.strand,
      cluster: descriptor.cluster,
      min_grade: descriptor.min_grade,
      max_grade: descriptor.max_grade,
      descriptor_text: descriptor.descriptor_text
    })
    setShowForm(true)
  }
  
  // Save (create or update)
  const handleSave = async () => {
    // Validation
    if (!formData.skill_category.trim()) {
      alert('Skill Category is required')
      return
    }
    if (!formData.strand.trim()) {
      alert('Strand is required')
      return
    }
    if (!formData.cluster.trim()) {
      alert('Cluster is required')
      return
    }
    if (!formData.min_grade || !formData.max_grade) {
      alert('Both Min Grade and Max Grade are required')
      return
    }
    if (parseInt(formData.min_grade) > parseInt(formData.max_grade)) {
      alert('Min Grade cannot be greater than Max Grade')
      return
    }
    if (!formData.descriptor_text.trim()) {
      alert('Descriptor Text is required')
      return
    }
    
    setSaving(true)
    try {
      const payload = {
        skill_category: formData.skill_category.trim(),
        strand: formData.strand.trim(),
        cluster: formData.cluster.trim(),
        min_grade: parseInt(formData.min_grade),
        max_grade: parseInt(formData.max_grade),
        descriptor_text: formData.descriptor_text.trim()
      }
      
      if (editingId) {
        // Update
        const { error } = await supabase
          .from('atl_descriptors')
          .update(payload)
          .eq('id', editingId)
        
        if (error) throw error
        alert('ATL descriptor updated successfully')
      } else {
        // Create
        const { error } = await supabase
          .from('atl_descriptors')
          .insert([payload])
        
        if (error) throw error
        alert('ATL descriptor created successfully')
      }
      
      setShowForm(false)
      fetchDescriptors()
    } catch (error) {
      console.error('Error saving ATL descriptor:', error)
      alert('Failed to save ATL descriptor: ' + error.message)
    } finally {
      setSaving(false)
    }
  }
  
  // Delete
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this ATL descriptor?')) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('atl_descriptors')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      alert('ATL descriptor deleted successfully')
      fetchDescriptors()
    } catch (error) {
      console.error('Error deleting ATL descriptor:', error)
      alert('Failed to delete ATL descriptor: ' + error.message)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">ATL Descriptors</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage Approaches to Learning skill descriptors
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} />
              Add New Descriptor
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FontAwesomeIcon icon={faFilter} className="text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skill Category
                </label>
                <select
                  value={filters.skill_category}
                  onChange={(e) => setFilters(prev => ({ ...prev, skill_category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {skillCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade Level
                </label>
                <select
                  value={filters.grade}
                  onChange={(e) => setFilters(prev => ({ ...prev, grade: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Grades</option>
                  {[6, 7, 8, 9, 10, 11, 12].map(grade => (
                    <option key={grade} value={grade}>Grade {grade}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <div className="relative">
                  <FontAwesomeIcon 
                    icon={faSearch} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Search descriptor, strand, cluster..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
        </div>
        
        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-blue-500" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Skill Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Strand
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cluster
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Grade Range
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descriptor
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredDescriptors.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                            No ATL descriptors found
                          </td>
                        </tr>
                      ) : (
                        filteredDescriptors.map((descriptor) => (
                          <tr key={descriptor.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                {descriptor.skill_category}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{descriptor.strand}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{descriptor.cluster}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                                Grade {descriptor.min_grade}-{descriptor.max_grade}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 max-w-md">
                                {descriptor.descriptor_text}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleEdit(descriptor)}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                <FontAwesomeIcon icon={faEdit} />
                              </button>
                              <button
                                onClick={() => handleDelete(descriptor.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Results count */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Showing {filteredDescriptors.length} of {descriptors.length} descriptors
                  </p>
                </div>
              </>
            )}
        </div>
      </div>
      
      {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingId ? 'Edit ATL Descriptor' : 'Add New ATL Descriptor'}
                </h2>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skill Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="skill_category"
                    value={formData.skill_category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Category...</option>
                    {skillCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Strand <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="strand"
                    value={formData.strand}
                    onChange={handleInputChange}
                    placeholder="e.g., Organization, Interpersonal"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cluster <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="cluster"
                    value={formData.cluster}
                    onChange={handleInputChange}
                    placeholder="e.g., Managing Self, Media Literacy"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Grade <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="min_grade"
                      value={formData.min_grade}
                      onChange={handleInputChange}
                      min="6"
                      max="12"
                      placeholder="6"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Grade <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="max_grade"
                      value={formData.max_grade}
                      onChange={handleInputChange}
                      min="6"
                      max="12"
                      placeholder="8"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descriptor Text <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="descriptor_text"
                    value={formData.descriptor_text}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Enter one descriptor point (do not use bullet points)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Note: Enter only one descriptor per entry. Create multiple entries for multiple points.
                  </p>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving && <FontAwesomeIcon icon={faSpinner} spin />}
                  {saving ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
