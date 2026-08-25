"""
One-time script: exports your FastAPI app's OpenAPI (Swagger) spec to a
JSON file you can share with your project manager.

Run from your project root:
    python -m backend.export_openapi

Output: openapi.json in your current folder.
"""

import json
from backend.app.main import app

with open("openapi.json", "w", encoding="utf-8") as f:
    json.dump(app.openapi(), f, indent=2)

print("✅ Saved openapi.json — this file fully describes every API endpoint.")