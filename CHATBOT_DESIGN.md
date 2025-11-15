# CCS Policy Chatbot - Design Documentation

## Overview
Multi-policy chatbot assistant covering 6 CCS school policies with improved UX and visual design.

## Key Features

### 1. **Multi-Policy Support** 📚
- **6 Policy Categories:**
  - 🛡️ Academic Integrity (blue)
  - 🎓 Admission (green)
  - 📄 Assessment (orange)
  - 🌐 Language (indigo)
  - ❤️ Inclusion (pink)
  - 👥 Professional Conduct (teal)

### 2. **Category Tabs** 🎯
- Horizontal scrollable tabs for policy selection
- Color-coded for easy identification
- Icons for visual recognition
- "All Policies" option to search across everything

### 3. **Smart Quick Questions** ⚡
- Context-aware quick questions based on selected category
- 4 relevant questions per category
- One-click to ask common questions
- Updates dynamically when switching categories

### 4. **Enhanced Message Display** 💬
- **Title cards** for bot responses
- **Bold formatting** for important terms
- **Bullet points** with colored markers
- **Examples section** with special styling
- **Related topics** as clickable chips
- **Source indicators**:
  - 📚 From official policy (green)
  - ✨ AI-generated (purple)
  - Confidence score display

### 5. **Better Visual Hierarchy** 🎨
- Gradient headers (blue → purple)
- Color-coded categories
- Shadow effects for depth
- Rounded corners (xl) for modern look
- Smooth transitions and animations

### 6. **Improved UX** 🚀
- Dynamic placeholder text based on category
- Message counter in footer
- Security indicator (confidential & secure)
- Better loading states with spinner
- Related topics are clickable
- Enhanced hover states

### 7. **Accessibility** ♿
- Proper ARIA labels
- Keyboard navigation (Enter to send)
- Focus management
- Clear visual feedback
- Readable contrast ratios

## Design Specifications

### Colors
```javascript
Academic Integrity: blue-500 → blue-700
Admission: green-500 → green-700
Assessment: orange-500 → orange-700
Language: indigo-500 → indigo-700
Inclusion: pink-500 → pink-700
Professional Conduct: teal-500 → teal-700
All Policies: purple-500 → purple-700
```

### Dimensions
- Chat window: 420px width × 650px height
- Floating button: 56px × 56px
- Border radius: 12px (xl) for main elements
- Spacing: Consistent 4px base unit

### Typography
- Headers: font-bold, text-lg
- Body: text-sm, leading-relaxed
- Quick questions: text-xs, font-medium
- Labels: text-xs, font-semibold

## Component Structure

```
AcademicIntegrityChatbot
├── Floating Button (gradient, tooltip on hover)
├── Chat Window
│   ├── Header (gradient, school branding)
│   ├── Category Tabs (scrollable, color-coded)
│   ├── Messages Area
│   │   ├── Bot Messages (white, structured)
│   │   │   ├── Title
│   │   │   ├── Content (formatted)
│   │   │   ├── Examples (special background)
│   │   │   ├── Related Topics (clickable chips)
│   │   │   └── Source Indicator
│   │   └── User Messages (gradient blue)
│   ├── Quick Questions (contextual, gradient bg)
│   └── Input Area
│       ├── Text Input (dynamic placeholder)
│       └── Send Button (gradient)
```

## User Flow

1. **Initial State**: Floating button visible with pulse animation
2. **Open Chat**: Click button → window opens with welcome message
3. **Select Category** (Optional): Click tab to filter by policy
4. **Ask Question**:
   - Type in input field, OR
   - Click quick question button
5. **Receive Response**:
   - Title shows topic
   - Content with formatting
   - Examples if available
   - Related topics to explore
   - Source indicator (policy/AI)
6. **Follow-up**: Click related topic chips or ask new question
7. **Switch Category**: Use tabs to explore different policies

## Mobile Responsiveness
- Fixed positioning maintained
- Scrollable category tabs
- Adjusted width for smaller screens
- Touch-friendly button sizes (min 44px)

## Performance Optimizations
- useRef for scroll management
- Debounced API calls
- Lazy rendering of messages
- Efficient state updates

## Future Enhancements
1. **Search History** - Save recent queries
2. **Favorites** - Bookmark important responses
3. **Export** - Download conversation as PDF
4. **Dark Mode** - Theme toggle
5. **Multi-language** - Full bilingual support
6. **Voice Input** - Speech-to-text
7. **Feedback** - Rate responses (thumbs up/down)
8. **Suggested Follow-ups** - ML-based recommendations

## Testing Checklist
- [ ] All 6 categories display correctly
- [ ] Quick questions work for each category
- [ ] Related topics are clickable
- [ ] Formatting renders properly (**bold**, bullet points)
- [ ] Examples section displays when available
- [ ] Source indicators show correctly
- [ ] Messages scroll smoothly
- [ ] Input focus on open
- [ ] Loading states work
- [ ] Error handling functional
- [ ] Category switching doesn't clear messages
- [ ] Mobile responsive

## Sample Test Queries

**Academic Integrity:**
- "What is plagiarism?"
- "Can I use ChatGPT for homework?"

**Admission:**
- "How do I apply to CCS?"
- "What are the admission fees?"

**Assessment:**
- "What is the MYP grading scale?"
- "Difference between formative and summative assessment?"

**Language:**
- "What languages are taught at CCS?"
- "What is pull-out English support?"

**Inclusion:**
- "What is a Modified Study Plan?"
- "What does Wakasis do?"

**Professional Conduct:**
- "What is the dress code for teachers?"
- "Can teachers connect with students on Instagram?"
