#!/bin/bash
# Data Export Script from Neon to Supabase
# This script exports data from your Neon database

echo "🔄 Exporting data from Neon database..."

# Export current Neon data
NEON_URL="postgresql://neondb_owner:npg_TRZkvJyO64hd@ep-divine-term-a1jftj2r-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Export data to SQL files
echo "📊 Exporting roles..."
pg_dump -d "$NEON_URL" -t role --data-only --inserts > neon_roles_data.sql

echo "📊 Exporting units..."
pg_dump -d "$NEON_URL" -t unit --data-only --inserts > neon_units_data.sql

echo "📊 Exporting users..."
pg_dump -d "$NEON_URL" -t users --data-only --inserts > neon_users_data.sql

echo "📊 Exporting menus..."
pg_dump -d "$NEON_URL" -t menus --data-only --inserts > neon_menus_data.sql

echo "📊 Exporting menu_permissions..."
pg_dump -d "$NEON_URL" -t menu_permissions --data-only --inserts > neon_menu_permissions_data.sql

echo "📊 Exporting classes..."
pg_dump -d "$NEON_URL" -t kelas --data-only --inserts > neon_kelas_data.sql

echo "📊 Exporting subjects..."
pg_dump -d "$NEON_URL" -t subject --data-only --inserts > neon_subjects_data.sql

echo "✅ Data export completed!"
echo "📁 Files created:"
echo "   - neon_roles_data.sql"
echo "   - neon_units_data.sql"
echo "   - neon_users_data.sql"
echo "   - neon_menus_data.sql"
echo "   - neon_menu_permissions_data.sql"
echo "   - neon_kelas_data.sql"
echo "   - neon_subjects_data.sql"
