import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(request) {
  try {
    const { message, sessionId, userId, category } = await request.json();

    console.log('📩 [Chatbot API] Received request:', { message, sessionId, userId, category });

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Step 1: Try keyword matching with database (with optional category filter)
    const { data: matches, error: matchError } = await supabase
      .rpc('match_knowledge_base_with_category', {
        query_text: message,
        filter_category: (category && category !== 'all') ? category : null,
        min_score: 2 // Minimum score threshold
      });

    if (matchError) {
      console.error('❌ [Chatbot API] Knowledge base match error:', matchError);
    }

    console.log('🔍 [Chatbot API] Keyword matches:', matches?.slice(0, 5).map(m => ({ 
      title: m.title, 
      score: m.score,
      category: m.category,
      keywords: m.matched_keywords 
    })));

    // Step 2: If good match found, use database response
    // Lower threshold to prefer knowledge base over AI
    if (matches && matches.length > 0 && matches[0].score >= 3) {
      const bestMatch = matches[0];
      
      console.log('✅ [Chatbot API] Using knowledge base response:', {
        title: bestMatch.title,
        score: bestMatch.score,
        source: 'knowledge_base'
      });

      // Log conversation
      await supabase.from('chatbot_conversations').insert({
        user_id: userId || null,
        session_id: sessionId || null,
        user_query: message,
        matched_kb_id: bestMatch.id,
        response: bestMatch.short_answer || bestMatch.content,
        confidence_score: bestMatch.score,
        response_source: 'knowledge_base'
      });

      return NextResponse.json({
        success: true,
        response: bestMatch.short_answer || bestMatch.content,
        fullContent: bestMatch.content,
        title: bestMatch.title,
        examples: bestMatch.examples || [],
        relatedTopics: bestMatch.related_topics || [],
        source: 'knowledge_base',
        confidence: bestMatch.score,
        matchedKeywords: bestMatch.matched_keywords
      });
    }

    // Step 3: If no good match, use AI fallback with knowledge base context
    console.log('🤖 [Chatbot API] Using AI fallback for query:', message);
    
    // Get top 3 matches as context for AI
    const contextMatches = matches?.slice(0, 3) || [];
    const contextText = contextMatches
      .map(m => `${m.title}: ${m.content}`)
      .join('\n\n');

    // Category-specific context
    const categoryContext = {
      all: 'You are the official CCS (Ciputra Christian School) Policy Assistant with complete access to all school policies. You help answer questions about Academic Integrity, Admission, Assessment, Language, Inclusion, and Professional Conduct policies.',
      academic_integrity: 'You are the official CCS Policy Assistant for Academic Integrity. You have complete access to the Academic Integrity Policy covering plagiarism, citations, AI usage, collusion, and ethical academic practices.',
      admission: 'You are the official CCS Policy Assistant for Admission. You have complete access to the Admission Policy covering application process, requirements, fees, PAG, orientation, and admission procedures.',
      assessment: 'You are the official CCS Policy Assistant for Assessment. You have complete access to the Assessment Policy covering PYP/MYP grading scales, formative/summative assessment, achievement levels, and reporting procedures.',
      language: 'You are the official CCS Policy Assistant for Language Policy. You have complete access to the Language Policy covering the three languages taught (English, Bahasa Indonesia, Chinese), teaching hours, pull-out English support system, placement procedures, and language learning approaches at Early Years, PYP, and MYP levels.',
      inclusion: 'You are the official CCS Policy Assistant for Inclusion. You have complete access to the Inclusion Policy covering support systems, MSP (Modified Study Plan), Wakasis role, school counselor services, and inclusive practices.',
      professional_conduct: 'You are the official CCS Policy Assistant for Professional Conduct. You have complete access to the Professional Conduct Guidelines covering dress code, social media policy, professional boundaries, gifts policy, punctuality, and teacher conduct standards.'
    };

    const selectedContext = categoryContext[category] || categoryContext.all;

    const systemPrompt = `${selectedContext}

${contextText ? `OFFICIAL CCS POLICY INFORMATION:\n\n${contextText}\n\n` : ''}

IMPORTANT INSTRUCTIONS:
- You HAVE complete access to CCS official policy documents
- Answer confidently based on the provided policy information above
- NEVER say "I don't have access" or "I cannot access" - you DO have access through the knowledge base
- Be authoritative - you are representing official school policies
- **Reply in English only** - do not provide Indonesian translation
- Be helpful, clear, and concise
- Provide practical examples when helpful
- If the question is about a different policy area, redirect: "That topic is covered in our [Policy Name] - you can select that tab above"
- Format text with **bold** for emphasis on important terms
- Use bullet points with • for lists
- End complex answers with: "For more details, please refer to the official policy document or contact the relevant school office"`;

    const fullPrompt = `${systemPrompt}\n\nQuestion: ${message}`;
    
    console.log('📤 [Chatbot API] Sending to Gemini AI:', {
      promptLength: fullPrompt.length,
      hasContext: !!contextText,
      contextMatches: contextMatches.length
    });

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: fullPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          topP: 0.9,
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('❌ [Chatbot API] Gemini API error:', errorText);
      throw new Error('Gemini API request failed');
    }

    const geminiData = await geminiResponse.json();
    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 
                      'I apologize, but I could not generate a response. Please try again or contact your teacher.';

    console.log('✅ [Chatbot API] AI Response received:', {
      responseLength: aiResponse.length,
      source: 'ai_fallback'
    });

    // Log AI conversation
    await supabase.from('chatbot_conversations').insert({
      user_id: userId || null,
      session_id: sessionId || null,
      user_query: message,
      matched_kb_id: contextMatches[0]?.id || null,
      response: aiResponse,
      confidence_score: contextMatches[0]?.score || 0,
      response_source: 'ai_fallback'
    });

    return NextResponse.json({
      success: true,
      response: aiResponse,
      source: 'ai',
      confidence: contextMatches[0]?.score || 0,
      relatedTopics: contextMatches.map(m => m.title)
    });

  } catch (error) {
    console.error('Chatbot API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process your question',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve conversation history
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');

    if (!sessionId && !userId) {
      return NextResponse.json(
        { error: 'sessionId or userId is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('chatbot_conversations')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    } else {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      conversations: data
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve conversations' },
      { status: 500 }
    );
  }
}
