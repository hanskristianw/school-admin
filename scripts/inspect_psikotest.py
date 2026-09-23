import urllib.request
import re
from html import unescape

url = 'https://ccs.sch.id/psikotest/'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

# Extract groups and rows
# Find groups
groups = re.findall(r'<div class="card-header fw-bold">\s*No\s*(\d+)\s*</div>[\s\S]*?<tbody>([\s\S]*?)</tbody>', html)
print('Total groups found:', len(groups))

all_questions = []
for group_no, tbody in groups:
    rows = re.findall(r'<tr>([\s\S]*?)</tr>', tbody)
    for row in rows:
        tds = re.findall(r'<td[\s\S]*?>([\s\S]*?)</td>', row)
        if len(tds) >= 3:
            # Statement text
            raw_text = tds[0]
            # Replace <br> with newline
            clean_text = re.sub(r'<br\s*/?>', '\n', raw_text)
            clean_text = re.sub(r'<[^>]+>', '', clean_text).strip()
            # p_icon
            p_match = re.search(r'<span class="icon-text">(.*?)</span>', tds[1])
            p_icon = unescape(p_match.group(1).strip()) if p_match else ''
            # k_icon
            k_match = re.search(r'<span class="icon-text">(.*?)</span>', tds[2])
            k_icon = unescape(k_match.group(1).strip()) if k_match else ''
            all_questions.append({
                'group_no': int(group_no),
                'statement_text': clean_text,
                'p_icon': p_icon,
                'k_icon': k_icon
            })

print(f"Total questions parsed: {len(all_questions)}")
print("Sample first 4 questions (Group 1):")
for q in all_questions[:4]:
    print(q)
