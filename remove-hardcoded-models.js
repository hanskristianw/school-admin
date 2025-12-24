// Script to remove hardcoded Gemini models from source files
const fs = require('fs');
const path = require('path');

const files = [
  'src/app/data/topic/page.jsx',
  'src/app/data/topic-new/page.jsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalLength = content.length;
  
  // Remove model: 'gemini-xxx', from all fetch body objects
  content = content.replace(/model:\s*['"]gemini-[^'"]+['"],?\s*/g, '');
  
  // Clean up double commas that might result
  content = content.replace(/,\s*,/g, ',');
  
  // Clean up trailing commas before closing brace
  content = content.replace(/,\s*}/g, ' }');
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  const saved = originalLength - content.length;
  console.log(`✅ ${file}: Removed ${saved} characters (hardcoded models)`);
});

console.log('\n✨ All hardcoded models removed!');
console.log('💡 Now all AI Help will use GEMINI_MODEL from .env.local');
