import urllib.request
import re
from html import unescape
import json

# 1. Fetch from live website
url = 'https://ccs.sch.id/psikotest/'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

groups = re.findall(r'<div class="card-header fw-bold">\s*No\s*(\d+)\s*</div>[\s\S]*?<tbody>([\s\S]*?)</tbody>', html)
print('Total groups found:', len(groups))

all_questions = []
for group_no, tbody in groups:
    rows = re.findall(r'<tr>([\s\S]*?)</tr>', tbody)
    for row in rows:
        tds = re.findall(r'<td[\s\S]*?>([\s\S]*?)</td>', row)
        if len(tds) >= 3:
            raw_text = tds[0]
            clean_text = re.sub(r'<br\s*/?>', '\n', raw_text)
            clean_text = re.sub(r'<[^>]+>', '', clean_text).strip()
            p_match = re.search(r'<span class="icon-text">(.*?)</span>', tds[1])
            p_icon = unescape(p_match.group(1).strip()) if p_match else ''
            k_match = re.search(r'<span class="icon-text">(.*?)</span>', tds[2])
            k_icon = unescape(k_match.group(1).strip()) if k_match else ''
            all_questions.append({
                'group_no': int(group_no),
                'statement_text': clean_text,
                'p_icon': p_icon,
                'k_icon': k_icon
            })

print(f"Total questions parsed: {len(all_questions)}")

# 2. Check if Supabase already has questions
supabase_url = 'https://gzucqoupjfnwkesgyybc.supabase.co'
service_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dWNxb3VwamZud2tlc2d5eWJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ3NzIwMiwiZXhwIjoyMDY4MDUzMjAyfQ.PG5ua8wIrVqzrvQERmoKmphB26pEJqDdqjsE8JyFLbM'

check_req = urllib.request.Request(
    f"{supabase_url}/rest/v1/psychotest_questions?select=id&limit=1",
    headers={'apikey': service_key, 'Authorization': f'Bearer {service_key}'}
)
with urllib.request.urlopen(check_req) as resp:
    existing = json.loads(resp.read().decode())

if len(existing) == 0:
    print("Supabase psychotest_questions is empty. Inserting 96 questions...")
    insert_req = urllib.request.Request(
        f"{supabase_url}/rest/v1/psychotest_questions",
        data=json.dumps(all_questions).encode('utf-8'),
        headers={
            'apikey': service_key,
            'Authorization': f'Bearer {service_key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
    )
    with urllib.request.urlopen(insert_req) as resp:
        print("Insert status:", resp.status)
        print("Successfully seeded all 96 questions into Supabase psychotest_questions!")
else:
    print(f"Supabase already has {len(existing)} questions, skipping seed.")
