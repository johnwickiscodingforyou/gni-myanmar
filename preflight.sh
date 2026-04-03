#!/bin/bash
echo "===== GNI MYANMAR PRE-FLIGHT CHECKLIST ====="
echo ""
echo "1. File Identity Check:"
head -3 myanmar_management.py | grep "myanmar_management"  && echo "   management.py OK" || echo "   WRONG FILE!"
head -3 myanmar_mad.py | grep "myanmar_mad"                && echo "   mad.py OK"        || echo "   WRONG FILE!"
head -3 myanmar_market.py | grep "myanmar_market"          && echo "   market.py OK"     || echo "   WRONG FILE!"
head -3 myanmar_articles.py | grep "myanmar_articles"      && echo "   articles.py OK"   || echo "   WRONG FILE!"
head -3 myanmar_intel.py | grep "myanmar_intel"            && echo "   intel.py OK"      || echo "   WRONG FILE!"
head -3 myanmar_shared.py | grep "myanmar_shared"          && echo "   shared.py OK"     || echo "   WRONG FILE!"
echo ""
echo "2. Syntax Check:"
python -c "
import ast
files = ['myanmar_shared.py','myanmar_articles.py','myanmar_mad.py','myanmar_market.py','myanmar_management.py','myanmar_intel.py']
for f in files:
    ast.parse(open(f, encoding='utf-8').read())
    print(f'   SYNTAX OK: {f}')
"
echo ""
echo "3. Model Names:"
grep -n "model.*Llama\|model.*llama\|model.*cerebras\|model.*gpt-oss" myanmar_shared.py
echo "   Cerebras model:"
grep -n "llama3.1-8b\|gpt-oss" myanmar_shared.py
echo ""
echo "4. No wait_for_quota in wrong pipelines:"
grep -rn "wait_for_quota" myanmar_intel.py myanmar_mad.py myanmar_market.py 2>/dev/null && echo "   WARNING FOUND!" || echo "   OK -- none found"
echo ""
echo "5. YML Timeouts:"
grep -rn "timeout-minutes" .github/workflows/myanmar_articles.yml .github/workflows/myanmar_mad.yml .github/workflows/myanmar_market.yml
echo ""
echo "6. Git Status:"
git status
echo ""
echo "===== PRE-FLIGHT COMPLETE ====="
