with open('app/predictions/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = 'MAD Agent Predictions | ?????????????????'
new = 'MAD Agent Predictions | ခန့်မှန်းချက်များ'

if old in content:
    content = content.replace(old, new)
    with open('app/predictions/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed successfully')
else:
    print('Target string not found -- check exact content')

print('Done')