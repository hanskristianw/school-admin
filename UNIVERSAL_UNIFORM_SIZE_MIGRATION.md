# Universal Uniform Size Schema Change

## Overview
Perubahan schema `uniform_size` untuk menghapus dependency pada `unit_id` karena ukuran seragam (S, M, L, XL, 28, 30, dst) bersifat universal dan berlaku untuk semua unit.

## Rationale

### Sebelum (❌ Problematic):
```
uniform_size:
├─ size_id
├─ unit_id       ← Tied to specific unit
├─ size_name
├─ display_order
└─ is_active

Problem:
- Setiap unit harus define ukuran sendiri
- Duplikasi data (TK punya "S", SD juga punya "S")
- Maintenance nightmare - update 1 ukuran harus update di semua unit
```

### Sesudah (✅ Better):
```
uniform_size:
├─ size_id
├─ size_name     ← Unique across all units
├─ display_order
└─ is_active

Benefits:
- Single source of truth untuk ukuran
- Tidak ada duplikasi
- Mudah maintenance - define sekali, pakai untuk semua unit
- Ukuran S, M, L, XL universal
```

## Database Changes

### Migration File: `remove-unit-from-uniform-size.sql`

**Perubahan:**
1. Drop foreign key constraint `uniform_size_unit_id_fkey`
2. Drop column `unit_id`
3. Add unique constraint pada `size_name` (prevent duplicates)
4. Clean up duplicate size names (keep lowest size_id)

**Cara Apply:**
```sql
-- Run di Supabase SQL Editor atau psql
\i migrations/remove-unit-from-uniform-size.sql
```

**Rollback Plan:**
```sql
-- If needed to rollback (NOT RECOMMENDED after data entry)
ALTER TABLE uniform_size ADD COLUMN unit_id INT4;
ALTER TABLE uniform_size 
ADD CONSTRAINT uniform_size_unit_id_fkey 
FOREIGN KEY (unit_id) REFERENCES unit(unit_id);
```

## UI/UX Changes

### 1. `/data/uniform-size` Page

**Sebelum:**
- Dropdown/tab untuk pilih unit
- Sizes displayed per unit
- Duplikasi data antar unit

**Sesudah:**
- ✅ No unit selection needed
- ✅ Subtitle: "Ukuran berlaku untuk semua unit"
- ✅ Search & filter functionality
- ✅ Modal for add/edit
- ✅ Universal size management

### 2. `/stock/uniform/add` (Purchase Order)

**Sebelum:**
```javascript
// Load sizes per unit
supabase.from('uniform_size')
  .select('*')
  .eq('unit_id', uid)
```

**Sesudah:**
```javascript
// Load all sizes once (universal)
supabase.from('uniform_size')
  .select('*')
  .eq('is_active', true)
```

**Changes:**
- Removed `sizesByUnit` cache (no longer needed)
- Sizes loaded once on mount
- Sizes available for all units

### 3. Other Affected Pages

Updated pages:
- ✅ `/data/uniform` - Load all sizes
- ✅ `/sales/uniform` - Load all sizes
- ✅ `/reports/uniform` - Load all sizes

All changed from:
```javascript
.eq('unit_id', Number(unitId))
```
To:
```javascript
.eq('is_active', true) // No unit filter
```

## Code Changes Summary

### Files Modified:

1. **migrations/remove-unit-from-uniform-size.sql** (NEW)
   - Schema migration

2. **src/app/data/uniform-size/page.jsx**
   - Removed units state & unit selection UI
   - Removed unit_id from queries
   - Added subtitle "Ukuran berlaku untuk semua unit"

3. **src/app/stock/uniform/add/page.jsx**
   - Removed `sizesByUnit` state
   - Updated sizes query (no unit filter)
   - Modal now uses global `sizes` array
   - Added tooltip: "💡 Ukuran berlaku untuk semua unit"

4. **src/app/data/uniform/page.jsx**
   - Removed unit_id filter from size query

5. **src/app/sales/uniform/page.jsx**
   - Removed unit_id filter from size query

6. **src/app/reports/uniform/page.jsx**
   - Removed unit_id filter from size query

## Testing Checklist

### Before Migration
- [ ] Backup database
- [ ] Export current uniform_size data
- [ ] Document existing size names per unit
- [ ] Test on staging environment first

### After Migration
- [ ] Verify no duplicate size_name exists
- [ ] Test `/data/uniform-size` - dapat add/edit/delete
- [ ] Test `/stock/uniform/add` - sizes muncul di modal
- [ ] Test `/data/uniform` - sizes tersedia
- [ ] Test `/sales/uniform` - sizes tersedia
- [ ] Test purchase order dengan multi-unit
- [ ] Verify uniform_variant still works (references size_id)

### Data Integrity
- [ ] Check all size_id references masih valid
- [ ] Verify uniform_variant table intact
- [ ] Test stock transactions
- [ ] Test sales transactions

## Common Issues & Solutions

### Issue: "Duplicate size names after migration"
**Cause:** Multiple units had same size name (e.g., TK-S, SD-S)
**Solution:** Migration script keeps lowest size_id, deletes duplicates. Update uniform_variant references if needed.

### Issue: "Cannot find size for specific unit"
**Cause:** Thinking sizes still tied to units
**Solution:** Sizes are now universal. All sizes available for all units.

### Issue: "Need different sizes for different units"
**Cause:** Misconception about size usage
**Solution:** 
- Sizes are just labels (S, M, L)
- Uniform is tied to unit
- Uniform + Size = Variant (with specific measurements)
- Example: TK-Shirt + Size-M vs SD-Shirt + Size-M are DIFFERENT items

## Best Practices

### Managing Universal Sizes

1. **Naming Convention:**
   - Use standard sizes: XS, S, M, L, XL, XXL, XXXL
   - For numeric: 28, 30, 32, 34, 36, dst
   - For custom: Toddler, Kids, Teen, Adult

2. **Display Order:**
   - Size kecil → besar
   - Example: XS=10, S=20, M=30, L=40, XL=50

3. **Active Status:**
   - Only set is_active=false if size permanently discontinued
   - Don't create/delete sizes frequently
   - Reuse existing sizes

4. **Avoid Duplicates:**
   - Check existing sizes before creating new
   - Use search in `/data/uniform-size`
   - Unique constraint will prevent duplicates

## Migration Notes

### Data Preservation

The migration:
- ✅ Preserves all size records
- ✅ Removes duplicates (keeps oldest)
- ✅ Maintains size_id references
- ✅ No data loss in transactions

### Breaking Changes

- ❌ Cannot filter sizes by unit anymore (by design)
- ❌ unit_id column removed (data preserved before deletion)
- ✅ All existing size_id references still valid

### Backward Compatibility

**NOT backward compatible** - once migrated:
- Old code filtering by unit_id will fail
- Must update all frontend queries
- Cannot rollback without data re-entry

## Related Documentation

- Main docs: `MAIN_DOCUMENTATION.md`
- Multi-unit PO: `MULTI_UNIT_PURCHASE_ORDER_GUIDE.md`
- Schema: Check Supabase table `uniform_size`

## Support

If issues arise after migration:
1. Check migration logs
2. Verify unique constraint on size_name
3. Check uniform_variant references
4. Verify all UI pages load sizes correctly
