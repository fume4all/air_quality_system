path = "frontend/index.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Clean up duplicate closing body and html tags
content = content.replace("</body>\n</html>\n</body>\n</html>", "</body>\n</html>")
content = content.replace("</body>\n</body>\n</html>\n</html>", "</body>\n</html>")
content = content.replace("</body></body>", "</body>")
content = content.replace("</html></html>", "</html>")

# Strip trailing structural tags to rebuild the clean ending
while content.strip().endswith("</body>") or content.strip().endswith("</html>"):
    if content.strip().endswith("</html>"):
        content = content[:content.rfind("</html>")].strip()
    elif content.strip().endswith("</body>"):
        content = content[:content.rfind("</body>")].strip()

# Add back the correct single closing tags and script references cleanly
content += f"""
    <!-- 1. Include Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <!-- 2. Include custom dashboard script -->
    <script src="/static/script.js"></script>
</body>
</html>
"""

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("HTML file cleaned and fixed successfully!")