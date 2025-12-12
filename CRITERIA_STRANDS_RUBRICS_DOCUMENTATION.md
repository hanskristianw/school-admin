# IB MYP Criteria, Strands & Rubrics System Documentation

## Overview

This document explains the IB MYP (International Baccalaureate Middle Years Programme) assessment criteria system used in the School Admin application. This system is crucial for generating Assessment PDFs and managing subject-specific grading criteria.

## Database Schema

### 1. `criteria` Table
The top-level grouping for assessment criteria within a subject.

| Column | Type | Description |
|--------|------|-------------|
| `criterion_id` | int8 (PK) | Primary key |
| `subject_id` | int8 (FK) | Links to subject table |
| `code` | bpchar | Single letter code (A, B, C, D) |
| `name` | varchar | Full name of the criterion |

**Example:**
```
criterion_id: 1
subject_id: 5 (Design)
code: "A"
name: "Inquiring and analysing"
```

**IB MYP Standard Criteria Codes:**
- A: Inquiring and analysing
- B: Developing ideas
- C: Creating the solution
- D: Evaluating

### 2. `strands` Table
Strands are the specific skill descriptors within each criterion, organized by year level (MYP Year 1-5).

| Column | Type | Description |
|--------|------|-------------|
| `strand_id` | int8 (PK) | Primary key |
| `criterion_id` | int8 (FK) | Links to criteria table |
| `year_level` | int4 | MYP Year (1, 2, 3, 4, or 5) |
| `label` | varchar | Roman numeral label (i, ii, iii, iv, v, etc.) |
| `content` | text | General description of the strand (NOT used in PDF directly) |

**Example:**
```
strand_id: 1
criterion_id: 1 (Criteria A)
year_level: 3
label: "i"
content: "explain and justify the need for a solution to a problem"
```

**Important Notes:**
- Strands are YEAR-LEVEL SPECIFIC - each year level has its own set of strands
- The `label` field uses Roman numerals (i, ii, iii, iv) for ordering
- The `content` field contains the GENERAL skill descriptor
- Multiple strands can exist for the same criterion at different year levels

### 3. `rubrics` Table
Rubrics define the achievement levels (bands) for each strand. Each strand has multiple rubrics for different score bands.

| Column | Type | Description |
|--------|------|-------------|
| `rubric_id` | int8 (PK) | Primary key |
| `strand_id` | int8 (FK) | Links to strands table |
| `band_label` | varchar | Score band display (e.g., "7-8", "5-6", "3-4", "1-2") |
| `min_score` | int4 | Minimum score for this band |
| `max_score` | int4 | Maximum score for this band |
| `description` | text | **SPECIFIC** achievement descriptor for this band level |

**Example:**
```
rubric_id: 1
strand_id: 1
band_label: "7-8"
min_score: 7
max_score: 8
description: "develops a list of success criteria for the solution"

rubric_id: 2
strand_id: 1
band_label: "5-6"
min_score: 5
max_score: 6
description: "develops a few success criteria for the solution"

rubric_id: 3
strand_id: 1
band_label: "3-4"
min_score: 3
max_score: 4
description: "develops success criteria for the solution"

rubric_id: 4
strand_id: 1
band_label: "1-2"
min_score: 1
max_score: 2
description: "develops limited success criteria"
```

**Critical Understanding:**
- Each strand has MULTIPLE rubrics (one for each band score)
- The `description` field is **DIFFERENT** for each band - it contains the SPECIFIC level descriptor
- Higher bands have more detailed/demanding descriptors (e.g., "develops **a list** of" vs "develops **a few**" vs "develops")
- The `band_label` format is typically "max-min" (e.g., "7-8", "5-6")

## Relationship Diagram

```
subject (subject_id)
    │
    └── criteria (criterion_id, subject_id)
            │
            └── strands (strand_id, criterion_id, year_level)
                    │
                    └── rubrics (rubric_id, strand_id, band_label)
```

**One-to-Many Relationships:**
- 1 Subject → Many Criteria (typically A, B, C, D)
- 1 Criterion → Many Strands (organized by year_level, labeled i, ii, iii, iv)
- 1 Strand → Many Rubrics (one for each band: 7-8, 5-6, 3-4, 1-2)

## Data Flow in Assessment PDF Generation

### Location
- File: `src/app/data/topic-new/page.jsx`
- Functions: `handleGenerateAssessmentPDF` and `handleGenerateAssessmentPDFFromCard`

### Process

1. **Get Selected Criteria**
   - Assessment has `selected_criteria` array containing `criterion_id` values
   - These are the criteria selected for the specific assessment

2. **Fetch Strands for Year Level**
   ```javascript
   const { data: strandsData } = await supabase
     .from('strands')
     .select('*')
     .in('criterion_id', selectedCriteriaIds)
     .eq('year_level', topic.topic_year || 1)
     .order('label');
   ```
   - Strands are filtered by `year_level` matching `topic.topic_year`
   - This ensures year-appropriate descriptors are used

3. **Fetch Rubrics for Strands**
   ```javascript
   const { data: rubricsData } = await supabase
     .from('rubrics')
     .select('*')
     .in('strand_id', strandIds)
     .order('max_score', { ascending: false });
   ```

4. **Group Rubrics by Band Score**
   ```javascript
   criterionRubrics.forEach(rubric => {
     const bandKey = `${rubric.max_score}-${rubric.min_score}`;
     // Group all rubrics with same band together
   });
   ```

5. **Sort by Roman Numeral Label**
   ```javascript
   const romanOrder = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
   band.rubricsData.sort((a, b) => getRomanIndex(a.label) - getRomanIndex(b.label));
   ```

6. **Generate PDF Table**
   - Column 1: Band score (e.g., "7-8")
   - Column 2: SUBJECT CRITERIA - `rubric.description` with strand label prefix
   - Column 3: TASK-SPECIFIC CLARIFICATION - Empty (for teacher to fill)

### PDF Output Format

```
SUBJECT CRITERIA AND TASK-SPECIFIC CLARIFICATION
Criteria A

| Band | SUBJECT CRITERIA                          | TASK-SPECIFIC CLARIFICATION |
|------|------------------------------------------|----------------------------|
| 7-8  | The student:                              |                            |
|      | i. develops a list of success criteria    |                            |
|      | ii. presents feasible design ideas...     |                            |
|      | iii. presents the chosen design...        |                            |
|      | iv. creates a planning drawing...         |                            |
| 5-6  | The student:                              |                            |
|      | i. develops a few success criteria        |                            |
|      | ii. presents a few feasible design...     |                            |
|      | ...                                       |                            |
```

## Management Interface

### Location
- File: `src/app/data/subject/page.jsx`
- Accessed via: Subject list → "Manage Criteria" button

### Hierarchy in UI
1. **Criteria** - Top level cards (A, B, C, D)
2. **Strands** - Grouped by year level under each criterion
   - Each strand shows its label (i, ii, iii) and content
3. **Rubrics** - Expandable under each strand
   - Shows band_label and description for each band level

### Key Functions
```javascript
// Get strands for a specific criterion
const getStrandsForCriterion = (criterionId) => {
  return strands.filter(s => s.criterion_id === criterionId);
};

// Get rubrics for a specific strand
const getRubricsForStrand = (strandId) => {
  return rubrics.filter(r => r.strand_id === strandId)
    .sort((a, b) => a.min_score - b.min_score);
};
```

## Common Mistakes to Avoid

1. **Using `strand.content` instead of `rubric.description` in PDF**
   - WRONG: `strand.content` is the general descriptor
   - CORRECT: `rubric.description` is the band-specific descriptor

2. **Not filtering strands by year_level**
   - Each year level has different strand descriptors
   - Must use `topic.topic_year` to filter appropriately

3. **Not sorting by Roman numeral**
   - Labels are stored as text ("i", "ii", "iii")
   - Must use custom sorting to get correct order

4. **Confusing band_label format**
   - Display: "7-8" (max-min)
   - Internal key: `${max_score}-${min_score}`

## Related Files

- `src/app/data/subject/page.jsx` - Criteria/Strands/Rubrics management
- `src/app/data/topic-new/page.jsx` - Assessment PDF generation
- `RUBRICS_SYSTEM_DOCUMENTATION.md` - Additional rubrics documentation
- `GRADING_SYSTEM_DOCUMENTATION.md` - Grading system overview

## Database Queries for Reference

### Get all criteria for a subject
```sql
SELECT * FROM criteria 
WHERE subject_id = ? 
ORDER BY code;
```

### Get strands for criteria at specific year level
```sql
SELECT * FROM strands 
WHERE criterion_id IN (?) 
AND year_level = ? 
ORDER BY label;
```

### Get rubrics for strands
```sql
SELECT * FROM rubrics 
WHERE strand_id IN (?) 
ORDER BY max_score DESC;
```

### Full criteria tree for a subject
```sql
SELECT 
  c.code as criterion_code,
  c.name as criterion_name,
  s.year_level,
  s.label as strand_label,
  s.content as strand_content,
  r.band_label,
  r.min_score,
  r.max_score,
  r.description as rubric_description
FROM criteria c
JOIN strands s ON s.criterion_id = c.criterion_id
JOIN rubrics r ON r.strand_id = s.strand_id
WHERE c.subject_id = ?
ORDER BY c.code, s.year_level, s.label, r.max_score DESC;
```

## Version History

- **December 2025**: Initial documentation created
  - Documented criteria/strands/rubrics relationship
  - Explained Assessment PDF generation logic
  - Added common mistakes to avoid
