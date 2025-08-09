// Script untuk update icon names di database Supabase
// Jalankan di browser console atau buat file terpisah

import { supabase } from './src/lib/supabase.js'

async function updateIconNames() {
  console.log('🔄 Updating icon names in database...')
  
  try {
    // Update icon names satu per satu
    const updates = [
      { old: 'fas fa-tachometer-alt', new: 'faTachometerAlt' },
      { old: 'fas fa-database', new: 'faDatabase' },
      { old: 'fas fa-user', new: 'faUser' },
      { old: 'fas fa-eye', new: 'faEye' },
      { old: 'users', new: 'faUsers' },
      { old: 'graduation-cap', new: 'faGraduationCap' },
      { old: 'book', new: 'faBook' },
      { old: 'fas fa-edit', new: 'faEdit' },
      { old: 'fas fa-trash', new: 'faTrash' }
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
