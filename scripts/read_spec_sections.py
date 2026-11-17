import docx

doc_path = r'..\Upload\FoodCue_Master_Specification_v13_5_Final_Controlled_Baseline.docx'
doc = docx.Document(doc_path)

def extract_section(start_title, stop_title=None):
    recording = False
    lines = []
    for p in doc.paragraphs:
        txt = p.text.strip()
        if start_title in txt:
            recording = True
        elif recording and stop_title and stop_title in txt:
            break
        if recording and txt:
            lines.append(f"[{p.style.name}] {txt}")
    return '\n'.join(lines)

print("=== Section 1.3 Snapshot ===")
print(extract_section("1.3 Current evidence snapshot", "2. v13.5")[:2000])

print("\n=== Section 21. Release gates ===")
print(extract_section("21. Release gates G1-G6", "22. Business model")[:3000])
