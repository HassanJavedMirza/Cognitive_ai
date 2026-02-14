import os
import re

def replace_in_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Rule 1: Replace hardcoded URL with API_BASE or relative path
    # If the file uses 'api' client, use relative path. Otherwise use API_BASE.
    uses_api = 'import api from' in content or 'import api from' in content.replace('"', "'")
    
    if uses_api:
        # Replace axios.get("http://localhost:8000/path") with api.get("/path")
        content = re.sub(r'axios\.(get|post|put|delete)\(["\']http://localhost:8000/(.*?)["\']', r'api.\1("/\2"', content)
        content = re.sub(r'axios\.(get|post|put|delete)\(`http://localhost:8000/(.*?)`', r'api.\1(`/\2`', content)
        # Replace remaining http://localhost:8000/ with /
        content = content.replace('http://localhost:8000/', '/')
    else:
        # Define API_BASE if not present but needed
        if 'http://localhost:8000' in content and 'const API_BASE =' not in content:
            # Insert after imports
            import_match = re.search(r'import.*?\n(?!import)', content, re.DOTALL)
            if import_match:
                content = content[:import_match.end()] + '\nconst API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";\n' + content[import_match.end():]
            else:
                content = 'const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";\n' + content
        
        content = content.replace('http://localhost:8000/', '${API_BASE}/')
        content = content.replace('http://localhost:8000', '${API_BASE}')

    # Rule 2: Replace direct axios calls with api if api is imported
    if uses_api:
        content = content.replace('axios.get(', 'api.get(')
        content = content.replace('axios.post(', 'api.post(')
        content = content.replace('axios.put(', 'api.put(')
        content = content.replace('axios.delete(', 'api.delete(')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

src_dir = r'c:\Users\HP\Desktop\FYP Cognitive load\front end\cognitive load\src'
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            replace_in_file(os.path.join(root, file))

print("Cleanup completed.")
