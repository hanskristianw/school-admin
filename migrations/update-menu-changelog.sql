-- Migration: Penyelarasan Menu Changelog di Sidebar
-- Mengubah nama menu menjadi 'Changelog' dengan icon fa-clipboard-list

UPDATE public.menus
SET menu_name = 'Changelog',
    menu_icon = 'fas fa-clipboard-list'
WHERE menu_id = 134 OR menu_path = '/data/feedback';
