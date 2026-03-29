pages = ["reports","markets","predictions","about"]
for page in pages:
    path = f"app/{page}/page.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    import re
    footer = re.search(r"<footer.*?</footer>", content, re.DOTALL)
    if footer:
        print(f"=== {page} ===")
        print(repr(footer.group()[:300]))
        print()