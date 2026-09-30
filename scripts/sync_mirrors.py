import os
import shutil
import hashlib

files_to_sync = [
    ("python_backend/templates/gift_tab.html", [
        r"C:\Users\jeff\Documents\lol_giftapi-main\templates\gift_tab.html",
        r"C:\Users\jeff\Documents\lol_giftapi-main\python_backend\templates\gift_tab.html"
    ]),
    ("python_backend/static/style.css", [
        r"C:\Users\jeff\Documents\lol_giftapi-main\static\style.css",
        r"C:\Users\jeff\Documents\lol_giftapi-main\python_backend\static\style.css"
    ]),
    ("python_backend/static/script.js", [
        r"C:\Users\jeff\Documents\lol_giftapi-main\static\script.js",
        r"C:\Users\jeff\Documents\lol_giftapi-main\python_backend\static\script.js"
    ]),
    ("python_backend/templates/login_tab.html", [
        r"C:\Users\jeff\Documents\lol_giftapi-main\templates\login_tab.html",
        r"C:\Users\jeff\Documents\lol_giftapi-main\python_backend\templates\login_tab.html"
    ])
]

def get_hash(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()

for src, destinations in files_to_sync:
    src_path = os.path.abspath(src)
    if not os.path.exists(src_path):
        continue
    src_hash = get_hash(src_path)
    print(f"\nOrigem: {src_path} (SHA: {src_hash[:8]})")
    for dest in destinations:
        dest_path = os.path.abspath(dest)
        if os.path.exists(os.path.dirname(dest_path)):
            shutil.copy2(src_path, dest_path)
            dest_hash = get_hash(dest_path)
            status = "OK (Identico)" if src_hash == dest_hash else "ERRO"
            print(f"  -> {dest_path}: {status}")

print("\nSincronizacao concluida com sucesso!")
