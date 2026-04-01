<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes -- APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:critical-files -->
# CRITICAL FILES -- NEVER DELETE
The following files must NEVER be deleted, even during cleanup commits:
- myanmar_pipeline.py  (GNI Myanmar Intelligence Pipeline -- runs via GitHub Actions)
- lib/mm.ts            (Myanmar translation system -- all static Myanmar text)
- .github/workflows/myanmar_pipeline.yml  (GitHub Actions workflow)

Rule GNI-R-192: Before any git add -A, run git status and check for deleted files.
If any critical file is deleted, restore with: git checkout HEAD -- filename
<!-- END:critical-files -->
