-- Add column for AI Rule: Relationship between Summative Assessment and Statement of Inquiry
ALTER TABLE ai_rule 
ADD COLUMN IF NOT EXISTS ai_rule_relationship_sa_soi TEXT;

-- Set default value for existing rows
UPDATE ai_rule 
SET ai_rule_relationship_sa_soi = 'Explain in one clear paragraph how the Summative Assessment aligns with and measures the Statement of Inquiry. Focus on how the assessment tasks directly connect to the key concepts, related concepts, and global context stated in the statement of inquiry.'
WHERE ai_rule_relationship_sa_soi IS NULL;
