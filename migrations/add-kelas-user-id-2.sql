-- ==============================================================================
-- Migration: Add kelas_user_id_2 to kelas table (Secondary Homeroom Teacher / Co-Teacher for PYP)
-- ==============================================================================

-- 1. Add kelas_user_id_2 column to kelas table
ALTER TABLE kelas 
ADD COLUMN IF NOT EXISTS kelas_user_id_2 INTEGER REFERENCES users(user_id) ON DELETE SET NULL;

-- 2. Trigger function: validate that kelas_user_id_2 is distinct from kelas_user_id and only set for PYP units
CREATE OR REPLACE FUNCTION check_kelas_user_id_2()
RETURNS TRIGGER AS $$
DECLARE
    v_is_pyp BOOLEAN;
BEGIN
    IF NEW.kelas_user_id_2 IS NOT NULL THEN
        -- Check if user 1 and user 2 are the same
        IF NEW.kelas_user_id IS NOT NULL AND NEW.kelas_user_id = NEW.kelas_user_id_2 THEN
            RAISE EXCEPTION 'Homeroom Teacher 1 and Homeroom Teacher 2 cannot be the same person.';
        END IF;

        -- Get is_pyp status from unit table by kelas_unit_id
        SELECT is_pyp INTO v_is_pyp
        FROM unit
        WHERE unit_id = NEW.kelas_unit_id;

        IF v_is_pyp IS NOT TRUE THEN
            RAISE EXCEPTION 'A secondary Homeroom Teacher (kelas_user_id_2) is only allowed for classes under a PYP unit (is_pyp = true). Unit ID: %', NEW.kelas_unit_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach trigger before INSERT or UPDATE on kelas table
DROP TRIGGER IF EXISTS trg_check_kelas_user_id_2 ON kelas;
CREATE TRIGGER trg_check_kelas_user_id_2
BEFORE INSERT OR UPDATE OF kelas_user_id, kelas_user_id_2, kelas_unit_id ON kelas
FOR EACH ROW
EXECUTE FUNCTION check_kelas_user_id_2();

-- 4. Column comment for documentation
COMMENT ON COLUMN kelas.kelas_user_id_2 IS 'Secondary Homeroom Teacher (Wali Kelas 2 / Co-Teacher) for PYP classes where is_pyp = true';
