# MYP Year Level Implementation

## Summary
MYP year level sekarang ditentukan di level **assessment**, bukan di level class. Ini lebih flexible karena:
- Grade 9 Semester 2 bisa menggunakan MYP Year 3 (bukan Year 4)
- Teacher dapat memilih year level yang tepat untuk setiap assessment
- Lebih akurat untuk rubric/strand selection

## Database Changes

### Migration File
`migrations/add-myp-year-to-assessment.sql`

Menambahkan kolom `assessment_myp_year` INT (1-5) ke tabel `assessment`.

### Migration File (TIDAK DIGUNAKAN)
`migrations/add-myp-year-level-to-kelas.sql` - Rollback approach ini

## Code Changes

### 1. Assessment Form (topic-new/page.jsx)
- **Added field**: `assessment_myp_year` di state `assessmentFormData`
- **Form UI**: Dropdown MYP Year Level (1-5) dengan deskripsi setiap level
- **Validation**: MYP year wajib diisi
- **Save**: Menyimpan `assessment_myp_year` saat create/update assessment

### 2. Assessment Grading (handleOpenGrading)
- **Simplified logic**: Langsung ambil `assessment.assessment_myp_year`
- **No more**: Grade extraction, kelas lookup, calculation
- **Error handling**: Jelas jika assessment tidak memiliki MYP year

### 3. Fetch Strands
Query strands sekarang menggunakan:
```javascript
.eq('year_level', assessment.assessment_myp_year)
```

## Usage

### Creating Assessment
1. Teacher buka form "Add Assessment"
2. Pilih Subject/Class
3. **Pilih MYP Year Level** (1-5):
   - Year 1: Grade 6 atau Grade 9 Sem 2
   - Year 2: Grade 7
   - Year 3: Grade 8 atau Grade 9 Sem 2
   - Year 4: Grade 9
   - Year 5: Grade 10
4. Pilih Topic dan Criteria
5. Submit

### Input Nilai
1. Admin/Principal approve assessment
2. Teacher klik "Input Nilai"
3. Sistem load strands berdasarkan `assessment_myp_year`
4. Rubrics yang muncul sesuai dengan year level yang dipilih

## Benefits
✅ Flexible - Teacher tentukan year level per assessment
✅ Accurate - Tidak bergantung pada nama kelas
✅ Simple - Satu field, satu pilihan
✅ Clear - Error message jelas jika MYP year tidak diset
✅ Future-proof - Mudah adjust jika ada perubahan policy

## Migration Steps
1. Run: `migrations/add-myp-year-to-assessment.sql`
2. **Existing assessments**: Update manual atau set default:
   ```sql
   -- Set default based on class grade (optional)
   UPDATE assessment a
   SET assessment_myp_year = CASE 
     WHEN k.kelas_nama LIKE '%6%' THEN 1
     WHEN k.kelas_nama LIKE '%7%' THEN 2
     WHEN k.kelas_nama LIKE '%8%' THEN 3
     WHEN k.kelas_nama LIKE '%9%' THEN 4
     WHEN k.kelas_nama LIKE '%10%' THEN 5
     ELSE NULL
   END
   FROM detail_kelas dk
   JOIN kelas k ON dk.detail_kelas_kelas_id = k.kelas_id
   WHERE a.assessment_detail_kelas_id = dk.detail_kelas_id
     AND a.assessment_myp_year IS NULL;
   ```
3. Going forward: All new assessments require MYP year selection
