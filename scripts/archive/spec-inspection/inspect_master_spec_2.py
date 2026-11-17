import docx

doc_path = r'..\Upload\FoodCue_Master_Specification_v13_5_Final_Controlled_Baseline.docx'
doc = docx.Document(doc_path)
headings = []
for p in doc.paragraphs:
    if p.style.name.startswith('Heading') or p.text.startswith('#'):
        headings.append((p.style.name, p.text.strip()))

for h in headings[40:]:
    print(f"  {h[0]}: {h[1]}")
