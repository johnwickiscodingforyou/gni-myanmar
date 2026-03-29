import os

proxy_files = [
    "app/api/reports/route.ts",
    "app/api/stocks/route.ts",
    "app/api/predictions/route.ts",
    "app/api/article-events/route.ts",
]

for filepath in proxy_files:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    old = "headers: { 'X-Client': 'gni-myanmar-v1' }"
    new = "headers: { 'X-GNI-Key': process.env.NEXT_PUBLIC_GNI_API_KEY || '', 'X-Client': 'gni-myanmar-v1' }"

    if old in content:
        content = content.replace(old, new)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"FIXED: {filepath}")
    else:
        print(f"NOT FOUND pattern in: {filepath}")

print("Done.")