-- =====================================================
-- UPDATE ATTENDANCE FLAGS MENU ICON
-- =====================================================
-- Purpose: Change icon for Attendance Flags menu to faFlag
--          which better represents flagged/marked items

UPDATE menu
SET menu_icon = 'fas fa-flag'
WHERE menu_name = 'Attendance Flags' OR menu_url = '/data/attendance_flags';

-- Verify the update
SELECT menu_id, menu_name, menu_icon, menu_url
FROM menu
WHERE menu_name LIKE '%Attendance%Flag%' OR menu_url = '/data/attendance_flags';
