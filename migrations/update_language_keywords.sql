-- =====================================================
-- Update Language Policy Keywords for Better Matching
-- =====================================================
-- Run this to update existing Language Policy entries with better keywords

-- Update Philosophy entry
UPDATE knowledge_base 
SET keywords = ARRAY['language philosophy', 'language policy', 'why language important', 'language learning', 'filosofi bahasa', 'bagaimana language', 'tentang bahasa']
WHERE category = 'language' AND subcategory = 'philosophy' AND title = 'CCS Language Philosophy';

-- Update Languages Offered entry
UPDATE knowledge_base 
SET keywords = ARRAY['languages offered', 'language policy', 'english chinese indonesian', 'language classes', 'teaching hours', 'bahasa indonesia chinese english', 'bahasa apa', 'language apa']
WHERE category = 'language' AND subcategory = 'languages_offered' AND title = 'Languages Offered at CCS';

-- Verify updates
SELECT title, keywords 
FROM knowledge_base 
WHERE category = 'language' 
  AND subcategory IN ('philosophy', 'languages_offered');
