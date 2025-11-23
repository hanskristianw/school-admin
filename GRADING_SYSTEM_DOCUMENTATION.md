# Assessment Grading System Documentation

## Overview
Sistem penilaian berbasis IB MYP Assessment yang memungkinkan guru untuk:
- Input nilai per student per assessment
- Penilaian berdasarkan criteria (A-D) dan strands (i, ii, iii, iv)
- Perhitungan otomatis final grade (1-7 scale)

## Database Schema

### Tables

#### 1. `assessment_grades` (Header/Summary)
Menyimpan nilai final per student per assessment.

```sql
CREATE TABLE assessment_grades (
    grade_id BIGSERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessment(assessment_id) ON DELETE CASCADE,
    detail_siswa_id INTEGER NOT NULL REFERENCES detail_siswa(detail_siswa_id) ON DELETE CASCADE,
    
    -- Final criterion grades (0-8 scale)
    criterion_a_grade SMALLINT CHECK (criterion_a_grade >= 0 AND criterion_a_grade <= 8),
    criterion_b_grade SMALLINT CHECK (criterion_b_grade >= 0 AND criterion_b_grade <= 8),
    criterion_c_grade SMALLINT CHECK (criterion_c_grade >= 0 AND criterion_c_grade <= 8),
    criterion_d_grade SMALLINT CHECK (criterion_d_grade >= 0 AND criterion_d_grade <= 8),
    
    -- Final assessment grade (1-7 scale)
    final_grade SMALLINT CHECK (final_grade >= 1 AND final_grade <= 7),
    
    comments TEXT,
    
    created_by_user_id INTEGER REFERENCES users(user_id),
    updated_by_user_id INTEGER REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_assessment_student UNIQUE (assessment_id, detail_siswa_id)
);
```

#### 2. `assessment_grade_strands` (Detail per Strand)
Menyimpan nilai detail per strand untuk setiap student.

```sql
CREATE TABLE assessment_grade_strands (
    grade_strand_id BIGSERIAL PRIMARY KEY,
    grade_id BIGINT NOT NULL REFERENCES assessment_grades(grade_id) ON DELETE CASCADE,
    strand_id BIGINT NOT NULL REFERENCES strands(strand_id) ON DELETE CASCADE,
    
    -- Grade for this strand (0-8 scale)
    strand_grade SMALLINT NOT NULL CHECK (strand_grade >= 0 AND strand_grade <= 8),
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_grade_strand UNIQUE (grade_id, strand_id)
);
```

## Grading Flow

### 1. Prerequisites
- Assessment sudah dibuat dan approved (`assessment_status = 1`)
- Assessment memiliki criteria yang sudah dipilih (via `assessment_criteria` junction table)
- Criteria memiliki strands yang sudah dikonfigurasi untuk year level yang sesuai

### 2. User Flow

#### A. Open Grading Modal
1. Di tab "Assessment", klik tombol **"📝 Input Nilai"** pada assessment card
2. Tombol ini hanya muncul jika:
   - Assessment sudah approved (`status = 1`)
   - Assessment memiliki criteria

#### B. Modal Loading
System akan:
1. Fetch semua siswa di kelas tersebut
2. Fetch semua strands untuk criteria yang dipilih (sesuai year level)
3. Fetch existing grades (jika ada) dari database

#### C. Input Nilai
1. Klik nama student untuk expand form
2. Untuk setiap criterion (A-D):
   - Lihat semua strands (i, ii, iii, iv)
   - Input grade 0-8 untuk setiap strand
   - Grade criterion otomatis dihitung = **HIGHEST strand grade** (IB MYP best-fit)
3. Tambahkan comments (optional)
4. Klik **"💾 Save All Grades"**

### 3. Calculation Rules

#### A. Criterion Grade
```javascript
// IB MYP menggunakan "best-fit" approach
criterion_grade = Math.max(...strand_grades)
```

**Contoh:**
- Strand i = 6
- Strand ii = 7
- Strand iii = 5
- Strand iv = 6
- **Criterion Grade = 7** (highest)

#### B. Final Grade (1-7 Scale)
Total = sum of all 4 criteria (max 32)

| Total Points | Final Grade |
|-------------|-------------|
| 1-5         | 1           |
| 6-9         | 2           |
| 10-14       | 3           |
| 15-18       | 4           |
| 19-23       | 5           |
| 24-27       | 6           |
| 28-32       | 7           |

**Contoh:**
- Criterion A = 7
- Criterion B = 6
- Criterion C = 8
- Criterion D = 7
- Total = 28 → **Final Grade = 7**

## UI Components

### 1. Assessment Card Button
```jsx
{/* Visible only for approved assessments with criteria */}
{assessment.assessment_status === 1 && hasCriteria && (
  <button onClick={(e) => handleOpenGrading(assessment, e)}>
    📝 Input Nilai
  </button>
)}
```

### 2. Grading Modal Layout
- **Header**: Assessment info + criteria badges
- **Info Banner**: Grading rules explanation
- **Student List**:
  - Collapsed: Shows student name + criterion grades summary
  - Expanded: Shows all strands with grade inputs
- **Action Buttons**: Cancel / Save All Grades

### 3. Visual Indicators
- **Criterion Grade Badge Colors**:
  - Green (7-8): Excellent
  - Blue (5-6): Substantial
  - Yellow (3-4): Adequate
  - Red (1-2): Limited
  - Gray (null): Not graded

## Data Structure

### Frontend State
```javascript
// gradingData structure
{
  [detail_siswa_id]: {
    grade_id: 123,  // null for new entry
    strand_grades: {
      [strand_id]: {
        grade: 7,
        notes: "Good work"
      }
    },
    comments: "Overall excellent performance"
  }
}
```

### Save Operation
For each student:
1. Calculate criterion grades from strand grades
2. Calculate final grade from criterion total
3. Upsert `assessment_grades` record
4. Delete old `assessment_grade_strands` records
5. Insert new `assessment_grade_strands` records

## API Queries

### Get Students with Grades
```sql
SELECT 
  ag.*,
  u.user_nama_depan,
  u.user_nama_belakang,
  ags.strand_id,
  ags.strand_grade,
  ags.notes
FROM assessment_grades ag
JOIN detail_siswa ds ON ag.detail_siswa_id = ds.detail_siswa_id
JOIN users u ON ds.detail_siswa_user_id = u.user_id
LEFT JOIN assessment_grade_strands ags ON ag.grade_id = ags.grade_id
WHERE ag.assessment_id = ?
ORDER BY u.user_nama_depan, u.user_nama_belakang, ags.strand_id
```

### Get Strands for Assessment
```sql
SELECT st.*
FROM strands st
JOIN assessment_criteria ac ON st.criterion_id = ac.criterion_id
WHERE ac.assessment_id = ?
  AND st.year_level = ?
ORDER BY st.criterion_id, st.label
```

## Features

✅ Multi-student grading in one session
✅ Auto-calculation of criterion grades (best-fit)
✅ Auto-calculation of final grades (1-7 scale)
✅ Expand/collapse student forms
✅ Real-time grade preview
✅ Comments per student
✅ Batch save all grades
✅ Load existing grades for editing

## Best Practices

1. **Before Grading**:
   - Ensure strands are configured for the year level
   - Verify assessment is approved
   - Check all criteria are properly selected

2. **During Grading**:
   - Grade all strands for consistency
   - Use expand/collapse to focus on one student at a time
   - Check calculated criterion grades before saving
   - Add comments for clarification

3. **After Grading**:
   - Verify final grades align with expectations
   - Can re-open modal to edit grades anytime
   - Grades are automatically updated on save

## Migration

Run migration file to create tables:
```bash
psql -d database -f migrations/create-assessment-grading-system.sql
```

## Future Enhancements

- Export grades to CSV
- Print grade reports
- Grade statistics/analytics
- Bulk grade import
- Grade history/audit log
- Student self-assessment
- Rubric descriptions in modal
