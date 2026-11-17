import docx

doc_path = r'..\Upload\FoodCue_Master_Specification_v13_5_Final_Controlled_Baseline.docx'
doc = docx.Document(doc_path)
print(f"Total paragraphs in Master Spec: {len(doc.paragraphs)}")
print(f"Total tables: {len(doc.tables)}")

headings = []
for p in doc.paragraphs:
    if p.style.name.startswith('Heading') or p.text.startswith('#'):
        headings.append((p.style.name, p.text.strip()))

print(f"Total headings: {len(headings)}")
for h in headings[:40]:
    print(f"  {h[0]}: {h[1]}")
