-- =====================================================
-- Enhanced Function: Smart Keyword Matching with Category Filter
-- =====================================================
CREATE OR REPLACE FUNCTION match_knowledge_base_with_category(
  query_text TEXT,
  filter_category VARCHAR DEFAULT NULL,
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
  related_topics TEXT[],
  source_section VARCHAR,
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
      '\y(apa|adalah|yang|dan|atau|dengan|untuk|dari|ke|di|pada|oleh|tentang|the|is|are|what|how|why|when|where|can|do|does)\y', 
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
    kb.related_topics,
    kb.source_section,
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
    -- Category filter (if provided)
    (filter_category IS NULL OR kb.category = filter_category)
    AND
    -- At least one keyword must match
    (
      EXISTS (
        SELECT 1 FROM unnest(kb.keywords) k 
        WHERE query_lower LIKE '%' || k || '%'
      )
      OR EXISTS (
        SELECT 1 FROM unnest(kb.question_patterns) p 
        WHERE query_lower LIKE '%' || p || '%'
      )
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
  LIMIT 10;  -- Increased limit for better context
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Test the function
-- =====================================================
-- Test with category filter
-- SELECT * FROM match_knowledge_base_with_category('dress code', 'professional_conduct', 2);

-- Test without category filter (all policies)
-- SELECT * FROM match_knowledge_base_with_category('dress code', NULL, 2);
