-- =====================================================
-- ACADEMIC INTEGRITY CHATBOT - KNOWLEDGE BASE SCHEMA
-- =====================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Main Knowledge Base Table
-- =====================================================
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(100) NOT NULL,           -- Main category
  subcategory VARCHAR(100),                 -- Optional subcategory
  keywords TEXT[] NOT NULL,                 -- Keywords for matching
  question_patterns TEXT[],                 -- Common question patterns
  title VARCHAR(255) NOT NULL,              -- Title of the entry
  content TEXT NOT NULL,                    -- Full content/answer
  short_answer TEXT,                        -- Short version for quick responses
  related_topics TEXT[],                    -- Links to related entries
  examples TEXT[],                          -- Examples if applicable
  source_section VARCHAR(100),              -- Reference to policy section
  priority INT DEFAULT 0,                   -- Higher = check first
  metadata JSONB,                           -- Additional metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX idx_kb_category ON knowledge_base(category);
CREATE INDEX idx_kb_subcategory ON knowledge_base(subcategory);
CREATE INDEX idx_kb_keywords ON knowledge_base USING GIN (keywords);
CREATE INDEX idx_kb_patterns ON knowledge_base USING GIN (question_patterns);
CREATE INDEX idx_kb_priority ON knowledge_base(priority DESC);

-- =====================================================
-- Chatbot Conversation History (Optional)
-- =====================================================
CREATE TABLE chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,                             -- Link to users table if needed
  session_id VARCHAR(100),                  -- Session identifier
  user_query TEXT NOT NULL,
  matched_kb_id UUID REFERENCES knowledge_base(id),
  response TEXT NOT NULL,
  confidence_score DECIMAL(3,2),            -- 0.00 to 1.00
  response_source VARCHAR(50),              -- 'rule_based', 'ai', 'hybrid'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conv_session ON chatbot_conversations(session_id);
CREATE INDEX idx_conv_created ON chatbot_conversations(created_at DESC);

-- =====================================================
-- Function: Smart Keyword Matching with Scoring
-- =====================================================
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_text TEXT,
  min_score INT DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  category VARCHAR,
  subcategory VARCHAR,
  title VARCHAR,
  content TEXT,
  short_answer TEXT,
  examples TEXT[],
  score INT,
  matched_keywords TEXT[]
) AS $$
DECLARE
  query_words TEXT[];
  query_lower TEXT;
BEGIN
  -- Normalize query
  query_lower := LOWER(query_text);
  
  -- Extract words (remove common stop words)
  query_words := string_to_array(
    regexp_replace(
      query_lower, 
      '\y(apa|adalah|yang|dan|atau|dengan|untuk|dari|ke|di|pada|oleh|tentang|the|is|are|what|how|why|when|where)\y', 
      '', 
      'g'
    ),
    ' '
  );
  
  -- Remove empty strings
  query_words := array_remove(query_words, '');
  
  RETURN QUERY
  SELECT 
    kb.id,
    kb.category,
    kb.subcategory,
    kb.title,
    kb.content,
    kb.short_answer,
    kb.examples,
    -- Scoring algorithm
    (
      -- Exact keyword matches (weight: 3)
      (SELECT COUNT(*) * 3 FROM unnest(kb.keywords) k 
       WHERE query_lower LIKE '%' || k || '%') +
      
      -- Pattern matches (weight: 2)
      (SELECT COUNT(*) * 2 FROM unnest(kb.question_patterns) p 
       WHERE query_lower LIKE '%' || p || '%') +
      
      -- Word matches (weight: 1)
      (SELECT COUNT(*) FROM unnest(kb.keywords) k 
       JOIN unnest(query_words) qw ON k = qw) +
       
      -- Priority bonus
      kb.priority
    )::INT AS score,
    
    -- Show which keywords matched
    ARRAY(
      SELECT k FROM unnest(kb.keywords) k 
      WHERE query_lower LIKE '%' || k || '%'
    ) AS matched_keywords
    
  FROM knowledge_base kb
  WHERE 
    -- At least one keyword must match
    EXISTS (
      SELECT 1 FROM unnest(kb.keywords) k 
      WHERE query_lower LIKE '%' || k || '%'
    )
    OR EXISTS (
      SELECT 1 FROM unnest(kb.question_patterns) p 
      WHERE query_lower LIKE '%' || p || '%'
    )
  
  HAVING (
    (SELECT COUNT(*) * 3 FROM unnest(kb.keywords) k 
     WHERE query_lower LIKE '%' || k || '%') +
    (SELECT COUNT(*) * 2 FROM unnest(kb.question_patterns) p 
     WHERE query_lower LIKE '%' || p || '%') +
    (SELECT COUNT(*) FROM unnest(kb.keywords) k 
     JOIN unnest(query_words) qw ON k = qw) +
    kb.priority
  ) >= min_score
  
  ORDER BY score DESC, kb.priority DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Helper Function: Log Conversation
-- =====================================================
CREATE OR REPLACE FUNCTION log_conversation(
  p_user_id UUID,
  p_session_id VARCHAR,
  p_user_query TEXT,
  p_matched_kb_id UUID,
  p_response TEXT,
  p_confidence DECIMAL,
  p_source VARCHAR
) RETURNS UUID AS $$
DECLARE
  conv_id UUID;
BEGIN
  INSERT INTO chatbot_conversations (
    user_id, session_id, user_query, matched_kb_id, 
    response, confidence_score, response_source
  ) VALUES (
    p_user_id, p_session_id, p_user_query, p_matched_kb_id,
    p_response, p_confidence, p_source
  ) RETURNING id INTO conv_id;
  
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Trigger: Update timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kb_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Views for Easy Querying
-- =====================================================

-- View: Knowledge Base Summary
CREATE VIEW vw_knowledge_base_summary AS
SELECT 
  category,
  subcategory,
  COUNT(*) as entry_count,
  ARRAY(
    SELECT DISTINCT keyword 
    FROM knowledge_base kb2, unnest(kb2.keywords) AS keyword 
    WHERE kb2.category = kb.category AND kb2.subcategory = kb.subcategory
  ) as all_keywords
FROM knowledge_base kb
GROUP BY category, subcategory
ORDER BY category, subcategory;

-- View: Popular Queries
CREATE VIEW vw_popular_queries AS
SELECT 
  user_query,
  COUNT(*) as query_count,
  AVG(confidence_score) as avg_confidence,
  response_source,
  MAX(created_at) as last_asked
FROM chatbot_conversations
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_query, response_source
ORDER BY query_count DESC
LIMIT 50;

-- =====================================================
-- Sample Categories for Reference
-- =====================================================
COMMENT ON TABLE knowledge_base IS 'Knowledge base for Academic Integrity chatbot with smart keyword matching';
COMMENT ON COLUMN knowledge_base.category IS 'Main categories: definitions, responsibilities, practices_not_acceptable, practices_acceptable, supports, policies';
COMMENT ON COLUMN knowledge_base.priority IS 'Higher priority entries checked first. Use for common/important questions';
COMMENT ON COLUMN knowledge_base.question_patterns IS 'Common phrases users might ask, e.g., ["apa itu", "bagaimana cara", "bolehkah"]';
