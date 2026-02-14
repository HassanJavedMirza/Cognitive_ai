import os

def fix_fallback(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix the regression where fallback was replaced by ${API_BASE}
    new_content = content.replace('"${API_BASE}"', '"http://localhost:8000"')
    new_content = new_content.replace("'${API_BASE}'", "'http://localhost:8000'")
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed fallback in {file_path}")

src_dir = r'c:\Users\HP\Desktop\FYP Cognitive load\front end\cognitive load\src'
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            fix_fallback(os.path.join(root, file))
