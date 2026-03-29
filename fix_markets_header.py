with open('app/markets/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = 'Key Market Indicators | ????????????????'
new = 'Key Market Indicators | ဈေးကွက်အချက်အလက်များ'

if old in content:
    content = content.replace(old, new)
    with open('app/markets/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed successfully')
else:
    print('Target string not found -- check exact content')

print('Done')