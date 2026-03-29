import re

with open('app/reports/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = 'Intelligence Reports | ??????????????'
new = 'Intelligence Reports | သတင်းအချက်အလက်များ'

if old in content:
    content = content.replace(old, new)
    with open('app/reports/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed successfully')
else:
    print('Target string not found -- check exact content')

import py_compile
py_compile.compile('app/reports/page.tsx', doraise=False)
print('Done')