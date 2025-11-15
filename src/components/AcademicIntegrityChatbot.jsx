'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle, Loader2, BookOpen, GraduationCap, Users, Languages, Heart, Shield, FileText, Sparkles } from 'lucide-react';

export default function AcademicIntegrityChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Hi! I\'m CCS Policy Assistant. I can help you with questions about:\n\n**Academic Integrity** • **Admission** • **Assessment** • **Language** • **Inclusion** • **Professional Conduct**\n\nWhat would you like to know? 👋'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    
    // Prevent body scroll on mobile when chat is open (only on small screens)
    if (isOpen && window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputText
    };

    setMessages(prev => [...prev, userMessage]);
    const queryText = inputText;
    setInputText('');
    setIsLoading(true);

    console.log('🤖 [Chatbot] User Query:', queryText);

    try {
      const requestBody = {
        message: queryText,
        sessionId: sessionId,
        userId: localStorage.getItem('user_id') || null,
        category: selectedCategory
      };

      console.log('🤖 [Chatbot] API Request:', requestBody);

      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      console.log('🤖 [Chatbot] API Response:', data);

      if (data.success) {
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          text: data.response,
          fullContent: data.fullContent,
          title: data.title,
          examples: data.examples,
          relatedTopics: data.relatedTopics,
          source: data.source,
          confidence: data.confidence
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('🤖 [Chatbot] Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: 'Sorry, I encountered an error. Please try again or contact your teacher for help.',
        textId: 'Maaf, terjadi kesalahan. Silakan coba lagi atau hubungi guru Anda.',
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const policyCategories = [
    { id: 'all', label: 'All Policies', icon: Sparkles, color: 'bg-purple-500', lightColor: 'bg-purple-50', textColor: 'text-purple-700' },
    { id: 'academic_integrity', label: 'Academic Integrity', icon: Shield, color: 'bg-blue-500', lightColor: 'bg-blue-50', textColor: 'text-blue-700' },
    { id: 'admission', label: 'Admission', icon: GraduationCap, color: 'bg-green-500', lightColor: 'bg-green-50', textColor: 'text-green-700' },
    { id: 'assessment', label: 'Assessment', icon: FileText, color: 'bg-orange-500', lightColor: 'bg-orange-50', textColor: 'text-orange-700' },
    { id: 'language', label: 'Language', icon: Languages, color: 'bg-indigo-500', lightColor: 'bg-indigo-50', textColor: 'text-indigo-700' },
    { id: 'inclusion', label: 'Inclusion', icon: Heart, color: 'bg-pink-500', lightColor: 'bg-pink-50', textColor: 'text-pink-700' },
    { id: 'professional_conduct', label: 'Prof. Conduct', icon: Users, color: 'bg-teal-500', lightColor: 'bg-teal-50', textColor: 'text-teal-700' }
  ];

  const quickQuestionsByCategory = {
    all: [
      'What is plagiarism?',
      'How to apply to CCS?',
      'What is MYP grading scale?',
      'What languages are taught?'
    ],
    academic_integrity: [
      'What is plagiarism?',
      'Can I use AI tools?',
      'How to cite sources?',
      'What is collusion?'
    ],
    admission: [
      'How to apply?',
      'Admission requirements?',
      'Application fees?',
      'What is PAG?'
    ],
    assessment: [
      'MYP grading scale?',
      'PYP achievement levels?',
      'Formative vs summative?',
      'Reporting schedule?'
    ],
    language: [
      'What languages taught?',
      'Pull-out English support?',
      'MYP language placement?',
      'Home language support?'
    ],
    inclusion: [
      'What is inclusion?',
      'MSP process?',
      'Wakasis role?',
      'School counselor contact?'
    ],
    professional_conduct: [
      'Dress code policy?',
      'Social media rules?',
      'Can teachers tutor?',
      'Gift policy?'
    ]
  };

  const handleQuickQuestion = (question) => {
    setInputText(question);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const getCategoryInfo = (category) => {
    return policyCategories.find(c => c.id === category) || policyCategories[0];
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full p-3.5 sm:p-4 shadow-2xl transition-all duration-200 hover:scale-110 z-50 group active:scale-95"
          aria-label="Open CCS Policy Assistant"
        >
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse font-bold">
            ?
          </span>
          <div className="hidden sm:block absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            <div className="font-semibold">CCS Policy Assistant</div>
            <div className="text-xs text-gray-300 mt-0.5">6 School Policies Available</div>
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:bottom-6 sm:right-6 w-full h-[calc(100vh-60px)] sm:w-[420px] sm:h-[650px] sm:max-h-[90vh] bg-white rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col z-50 border-t sm:border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white p-3 sm:p-4 rounded-t-2xl sm:rounded-t-xl flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg backdrop-blur-sm">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg">CCS Policy Assistant</h3>
                <p className="text-xs text-blue-100 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Powered by AI</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Policy Category Tabs */}
          <div className="border-b border-gray-200 bg-gray-50 px-2 sm:px-3 py-2 overflow-x-auto flex-shrink-0 scrollbar-hide">
            <div className="flex gap-1.5 sm:gap-2 min-w-max">
              {policyCategories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      isSelected
                        ? `${cat.color} text-white shadow-md`
                        : `${cat.lightColor} ${cat.textColor} hover:shadow-sm`
                    }`}
                  >
                    <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden sm:inline">{cat.label}</span>
                    <span className="sm:hidden">{cat.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2.5 sm:p-3 text-sm ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.isError
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100'
                  }`}
                >
                  {/* Title */}
                  {message.title && message.type === 'bot' && (
                    <div className="font-semibold text-sm mb-2 text-blue-900 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      {message.title}
                    </div>
                  )}

                  <div 
                    className="text-sm whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: message.text
                        .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
                        .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
                        .replace(/•/g, '<span class="text-blue-600">•</span>')
                        .replace(/\n\n/g, '<br/><br/>')
                        .replace(/\n/g, '<br/>')
                    }}
                  />
                  
                  {/* Examples */}
                  {message.examples && message.examples.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-100 bg-blue-50/50 -mx-3 -mb-3 px-3 py-2 rounded-b-lg">
                      <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Examples:
                      </p>
                      <ul className="text-xs space-y-1.5 text-blue-900">
                        {message.examples.map((example, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">→</span>
                            <span className="flex-1">{example}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Related Topics */}
                  {message.relatedTopics && message.relatedTopics.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-600 mb-1.5">Related topics:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {message.relatedTopics.map((topic, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setInputText(topic);
                              setTimeout(() => handleSendMessage(), 100);
                            }}
                            className="text-xs bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-blue-700 px-2.5 py-1 rounded-full transition-colors border border-blue-200/50"
                          >
                            {topic}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Source indicator */}
                  {message.source && message.type === 'bot' && (
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        {message.source === 'knowledge_base' ? (
                          <>
                            <BookOpen className="w-3 h-3 text-green-600" />
                            <span>From official policy</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            <span>AI-generated response</span>
                          </>
                        )}
                      </p>
                      {message.confidence && (
                        <span className="text-xs text-gray-400">
                          {message.confidence}% match
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions (shown when few messages) */}
          {messages.length <= 2 && !isLoading && (
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50/30 flex-shrink-0">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
                  Quick questions:
                </p>
                {selectedCategory !== 'all' && (
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View all →
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {(quickQuestionsByCategory[selectedCategory] || quickQuestionsByCategory.all).map((q, idx) => {
                  const categoryInfo = getCategoryInfo(selectedCategory);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleQuickQuestion(q)}
                      className={`text-xs ${categoryInfo.lightColor} hover:shadow-md ${categoryInfo.textColor} px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all font-medium border border-gray-200/50`}
                    >
                      {q}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 sm:p-4 border-t border-gray-200 bg-white sm:rounded-b-xl flex-shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={selectedCategory === 'all' ? "Ask about any school policy..." : `Ask about ${getCategoryInfo(selectedCategory).label}...`}
                className="flex-1 border-2 border-gray-200 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isLoading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 transition-all shadow-md hover:shadow-lg disabled:shadow-none flex-shrink-0"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span className="hidden sm:inline">Confidential & secure</span>
                <span className="sm:hidden">Secure</span>
              </p>
              <p className="text-xs text-gray-400">
                {messages.length - 1} msg{messages.length !== 2 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
