-- Create subject_comment table for teacher comments per student per semester
-- Each teacher writes 2 comments per student per subject per year (1 per semester)

CREATE TABLE IF NOT EXISTS subject_comment (
  id               SERIAL PRIMARY KEY,
  subject_id       INTEGER NOT NULL REFERENCES subject(subject_id) ON DELETE CASCADE,
  kelas_id         INTEGER NOT NULL REFERENCES kelas(kelas_id) ON DELETE CASCADE,
  student_user_id  INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  semester         INTEGER NOT NULL CHECK (semester IN (1, 2)),
  comment_text     TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (subject_id, kelas_id, student_user_id, semester)
);

COMMENT ON TABLE subject_comment IS 'Teacher comments per student per subject per semester. 2 comments per year (semester 1 and 2).';
COMMENT ON COLUMN subject_comment.semester IS '1 = Semester 1, 2 = Semester 2';
COMMENT ON COLUMN subject_comment.comment_text IS 'Free-text teacher comment about student performance';

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_subject_comment_lookup 
  ON subject_comment(subject_id, kelas_id, semester);
