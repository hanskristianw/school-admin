// Script untuk update icon names di database Supabase
// Jalankan di browser console atau buat file terpisah

import { supabase } from './src/lib/supabase.js'

async function updateIconNames() {
  console.log('🔄 Updating icon names in database...')
  
  try {
    // Sidebar kita menggunakan mapping iconMap dengan key format "fas fa-..."
    // Script ini akan:
    // 1) Menormalkan nilai lama yang tidak lengkap (mis. "users", "book") menjadi "fas fa-users", dst.
    // 2) Mengembalikan nilai yang sudah terlanjur diubah ke format "faXxx" agar sesuai iconMap sidebar.
    const updates = [
      // Normalisasi dari nilai tidak lengkap ke format lengkap
      { old: 'users', new: 'fas fa-users' },
      { old: 'graduation-cap', new: 'fas fa-graduation-cap' },
      { old: 'book', new: 'fas fa-book' },
  { old: 'sack-dollar', new: 'fas fa-sack-dollar' },

      // Kembalikan dari format faXxx ke format kelas Font Awesome lama yang dipakai di sidebar
      { old: 'faTachometerAlt', new: 'fas fa-tachometer-alt' },
      { old: 'faDatabase', new: 'fas fa-database' },
      { old: 'faUser', new: 'fas fa-user' },
      { old: 'faEye', new: 'fas fa-eye' },
      { old: 'faUsers', new: 'fas fa-users' },
      { old: 'faGraduationCap', new: 'fas fa-graduation-cap' },
      { old: 'faBook', new: 'fas fa-book' },
  { old: 'faSackDollar', new: 'fas fa-sack-dollar' },
      { old: 'faEdit', new: 'fas fa-edit' },
      { old: 'faTrash', new: 'fas fa-trash' }
    ]
    
    for (const update of updates) {
      console.log(`Updating ${update.old} → ${update.new}`)
      
      const { data, error } = await supabase
        .from('menus')
        .update({ menu_icon: update.new })
        .eq('menu_icon', update.old)
      
      if (error) {
        console.error(`Error updating ${update.old}:`, error)
      } else {
        console.log(`✅ Updated ${update.old} → ${update.new}`)
      }
    }
    
    // Check results
    const { data: menus, error: selectError } = await supabase
      .from('menus')
      .select('menu_id, menu_name, menu_icon')
      .order('menu_order')
    
    if (selectError) {
      console.error('Error fetching updated menus:', selectError)
    } else {
      console.log('📋 Updated menus:', menus)
    }
    
  } catch (error) {
    console.error('❌ Error updating icons:', error)
  }
}

// Uncomment to run:
// updateIconNames()

export { updateIconNames }
