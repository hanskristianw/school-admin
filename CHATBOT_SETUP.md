# Academic Integrity Chatbot - Setup Guide

## Overview
This chatbot provides intelligent assistance for Academic Integrity Policy questions using a hybrid approach:
- **Rule-based keyword matching** for common queries (fast, no API cost)
- **AI fallback** with Gemini for complex/unmatched queries

## Architecture

### 1. Database Layer
- `knowledge_base` table: Stores policy content with keywords and question patterns
- `chatbot_conversations` table: Logs all queries for analytics
- `match_knowledge_base()` function: Smart keyword matching with scoring algorithm
- Views for analytics: `vw_knowledge_base_summary`, `vw_popular_queries`

### 2. API Endpoint
- **POST** `/api/chatbot`: Process user queries
  - Try keyword matching first (score threshold: 5)
  - If no good match, use AI with context from top 3 matches
  - Log all conversations
  
- **GET** `/api/chatbot?sessionId=xxx`: Retrieve conversation history

### 3. UI Component
- Floating button in bottom-right corner
- Side panel chat interface (400px width)
- Quick question buttons for common queries
- Bilingual support (English/Indonesian)

## Setup Instructions

### Step 1: Run Database Migrations

Execute these SQL files in your Supabase SQL Editor in order:

1. **Create schema** (creates tables, functions, views):
   ```bash
   migrations/chatbot_knowledge_base.sql
   ```

2. **Populate data** (inserts 18 knowledge base entries):
   ```bash
   migrations/chatbot_data_academic_integrity.sql
   ```

### Step 2: Verify Environment Variables

Make sure your `.env.local` includes:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Gemini API (for AI fallback)
GEMINI_API_KEY=your_gemini_api_key
```

### Step 3: Test the Chatbot

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Navigate to Dashboard (`/dashboard`)

3. Look for the floating chat button in bottom-right corner

4. Test with sample questions:
   - "Apa itu plagiarisme?"
   - "Boleh pakai AI?"
   - "Cara sitasi yang benar?"
   - "What is collusion?"

## Knowledge Base Content

The knowledge base includes 18 entries across 6 categories:

### 1. Definitions (2 entries)
- Academic Integrity
- Artificial Intelligence (AI)

### 2. Responsibilities (3 entries)
- Teachers/Staff
- Students
- Parents

### 3. Practices Not Acceptable (4 entries)
- Maladministration
- Plagiarism
- Collusion
- Fabrication

### 4. Practices Acceptable (6 entries)
- Library Resources
- eBooks & Online Sources
- Search Engines
- Academic Journals
- AI Usage (proper guidelines)
- Citations (MLA, APA, Chicago)

### 5. Student Supports (3 entries)
- ATL Skills
- Citation Tools (Zotero, Mendeley, etc.)
- Monitoring (Turnitin, detection methods)

### 6. Policies (2 entries)
- Consequences & Discretionary Power
- How to Get Help Appropriately

## How It Works

### Keyword Matching Algorithm

1. **Stop word removal**: Removes common words like "apa", "adalah", "yang", "the", "is", etc.
2. **Weighted scoring**:
   - Exact keyword match: +3 points
   - Question pattern match: +2 points
   - Word in content match: +1 point
   - Priority bonus: +priority value
3. **Returns top 5 matches** with score and matched keywords

### AI Fallback Strategy

When keyword matching score < 5:
1. Get top 3 keyword matches as context
2. Build prompt with context + system instructions
3. Call Gemini API (gemini-2.0-flash-exp model)
4. Return AI-generated response
5. Log with `response_source: 'ai_fallback'`

### Cost Efficiency

- **Rule-based**: $0 per query (90% of queries expected)
- **AI fallback**: ~$0.02 per query (10% of queries)
- **Expected daily cost**: ~$0.10 - $0.50 for 25-50 queries/day

## Customization

### Adding New Knowledge Base Entries

Add to `migrations/chatbot_data_academic_integrity.sql`:

```sql
INSERT INTO knowledge_base (
  category,
  subcategory,
  keywords,
  question_patterns,
  title,
  content,
  short_answer,
  examples,
  priority,
  source_section
) VALUES (
  'your_category',
  'your_subcategory',
  ARRAY['keyword1', 'keyword2', 'kata kunci'],
  ARRAY['apa itu xxx', 'xxx adalah', 'what is xxx'],
  'Your Title',
  'Full detailed content here...',
  'Short answer for quick response',
  ARRAY['Example 1', 'Example 2'],
  8, -- priority (1-10, higher = more important)
  'Source Section Reference'
);
```

### Adjusting Matching Threshold

Edit `src/app/api/chatbot/route.js`:

```javascript
// Change min_score (default: 2)
const { data: matches } = await supabase.rpc('match_knowledge_base', {
  query_text: message,
  min_score: 2 // Lower = more permissive matching
});

// Change confidence threshold (default: 5)
if (matches && matches.length > 0 && matches[0].score >= 5) {
  // Use database response
}
```

### Customizing UI

Edit `src/components/AcademicIntegrityChatbot.jsx`:

- **Colors**: Change `bg-blue-600` to your brand color
- **Position**: Modify `bottom-6 right-6` in floating button
- **Size**: Adjust `w-96 h-[600px]` for chat window dimensions
- **Quick questions**: Update `quickQuestions` array

## Monitoring & Analytics

### View Popular Queries

```sql
SELECT * FROM vw_popular_queries
ORDER BY query_count DESC
LIMIT 20;
```

### Check Knowledge Base Coverage

```sql
SELECT 
  category,
  COUNT(*) as entries,
  AVG(priority) as avg_priority
FROM knowledge_base
GROUP BY category
ORDER BY entries DESC;
```

### Analyze AI Fallback Rate

```sql
SELECT 
  response_source,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM chatbot_conversations
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY response_source;
```

### Find Low-Confidence Queries (need improvement)

```sql
SELECT 
  user_query,
  confidence_score,
  response_source,
  created_at
FROM chatbot_conversations
WHERE confidence_score < 5
  AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 50;
```

## Troubleshooting

### Issue: "aggregate function calls cannot contain set-returning function calls"
**Solution**: This was fixed in the migration file. Re-run `chatbot_knowledge_base.sql`.

### Issue: Chatbot not appearing
**Solution**: Check that:
1. Component is imported in dashboard: `import AcademicIntegrityChatbot from '@/components/AcademicIntegrityChatbot'`
2. Component is rendered: `<AcademicIntegrityChatbot />`
3. No CSS conflicts hiding the component

### Issue: API returns 500 error
**Solution**: Check:
1. Environment variables are set correctly
2. Database migrations ran successfully
3. Supabase service role key has proper permissions
4. Gemini API key is valid

### Issue: All queries use AI (expensive)
**Solution**: 
1. Check keyword matching is working: `SELECT * FROM match_knowledge_base('test query', 2)`
2. Verify knowledge base has data: `SELECT COUNT(*) FROM knowledge_base`
3. Adjust confidence threshold if too high

### Issue: Keywords not matching
**Solution**:
1. Add more keywords/patterns to knowledge base entries
2. Use bilingual keywords (English + Indonesian)
3. Include common misspellings
4. Lower min_score threshold in matching function

## Future Enhancements

### Possible Improvements:
1. **Vector Search**: Add pgvector for semantic search instead of pure keyword matching
2. **Multi-language**: Expand to Mandarin support
3. **Voice Input**: Add speech-to-text for mobile users
4. **Analytics Dashboard**: Build admin panel to view usage stats
5. **Feedback Loop**: Add thumbs up/down to improve responses
6. **Context Awareness**: Remember conversation history within session
7. **Rich Responses**: Add images, videos, or PDF links in responses

### Cost Optimization:
- Cache AI responses for identical queries (30-day TTL)
- Use cheaper AI model for simple reformatting (e.g., gemini-flash-8b)
- Implement rate limiting per user
- Add "typing indicator" delay to reduce perceived latency

## Files Created

1. **Database Schema**: `migrations/chatbot_knowledge_base.sql`
2. **Knowledge Base Data**: `migrations/chatbot_data_academic_integrity.sql`
3. **API Endpoint**: `src/app/api/chatbot/route.js`
4. **UI Component**: `src/components/AcademicIntegrityChatbot.jsx`
5. **This Guide**: `CHATBOT_SETUP.md`

## Support

For questions or issues:
1. Check Supabase logs for database errors
2. Check browser console for frontend errors
3. Check API logs: `src/app/api/chatbot/route.js` includes console.error statements
4. Review conversation logs: `SELECT * FROM chatbot_conversations ORDER BY created_at DESC LIMIT 10`
