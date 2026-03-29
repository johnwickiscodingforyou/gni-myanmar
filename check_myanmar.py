import os
import re

pages = ['page','reports/page','markets/page','predictions/page','about/page']

print('=== GNI_MYANMAR WEAKNESS SCAN ===')
print()

for fname in pages:
    path = f'app/{fname}.tsx'
    if not os.path.exists(path): continue
    name = fname.replace('/page','')
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    issues = []
    
    # Check disclaimer
    if 'financial advice' not in content and 'informational purposes' not in content:
        issues.append('LEGAL: Missing financial disclaimer')
    
    # Check Higher Diploma in footer
    if 'Higher Diploma' not in content:
        issues.append('FOOTER: Missing Higher Diploma')
    
    # Check SUM
    if 'SUM' not in content and 'Spring University' not in content:
        issues.append('FOOTER: Missing SUM')

    # Check for ?????? corruption
    if '??????' in content:
        issues.append('ENCODING: ?????? corruption found')
    
    # Check external links
    ext_links = re.findall(r'href=\"(https?://[^\"]+)\"', content)
    for link in ext_links:
        link_idx = content.find(link)
        surrounding = content[link_idx:link_idx+200]
        if 'target' not in surrounding:
            issues.append(f'UX: External link missing target=_blank: {link[:50]}')
    
    # Check stale 2025
    years = re.findall(r'2025', content)
    if years:
        issues.append(f'CHECK: 2025 found {len(years)} times -- verify if citation or stale')
    
    # Check error handling
    if 'error' not in content.lower():
        issues.append('UX: No error handling')

    if issues:
        print(f'*** [{name}]')
        for issue in issues: print(f'  ! {issue}')
    else:
        print(f'[{name}] clean')

print()
print('Scan complete.')