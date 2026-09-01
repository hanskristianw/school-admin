-- ==============================================================================
-- Migration: Add is_nursery flag to kelas table (Only allowed for PYP classes)
-- ==============================================================================

-- 1. Add is_nursery column to kelas table
ALTER TABLE kelas 
ADD COLUMN IF NOT EXISTS is_nursery BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Trigger function to ensure is_nursery can ONLY be TRUE if the class unit is PYP (is_pyp = true)
CREATE OR REPLACE FUNCTION check_kelas_is_nursery()
RETURNS TRIGGER AS $$
DECLARE
    v_is_pyp BOOLEAN;
BEGIN
    IF NEW.is_nursery IS TRUE THEN
        -- Get is_pyp status from unit table by kelas_unit_id
        SELECT is_pyp INTO v_is_pyp
        FROM unit
        WHERE unit_id = NEW.kelas_unit_id;

        IF v_is_pyp IS NOT TRUE THEN
            RAISE EXCEPTION 'The is_nursery flag is only allowed for classes under a PYP unit (is_pyp = true). Unit ID: %', NEW.kelas_unit_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach trigger before INSERT or UPDATE on kelas table
DROP TRIGGER IF EXISTS trg_check_kelas_is_nursery ON kelas;
CREATE TRIGGER trg_check_kelas_is_nursery
BEFORE INSERT OR UPDATE OF is_nursery, kelas_unit_id ON kelas
FOR EACH ROW
EXECUTE FUNCTION check_kelas_is_nursery();

-- 4. Column comment for documentation
COMMENT ON COLUMN kelas.is_nursery IS 'Flag indicating whether this class is a Nursery level (strictly restricted to PYP units with is_pyp = true)';
