import docx

doc_path = r'..\Upload\FoodCue_Master_Specification_v13_5_Final_Controlled_Baseline.docx'
doc = docx.Document(doc_path)

def print_table(idx):
    table = doc.tables[idx]
    print(f"\n=== Table {idx} ===")
    for r in table.rows:
        row_vals = [c.text.strip().replace('\n', ' ') for c in r.cells]
        print(' | '.join(row_vals))

for t_idx in [3, 35, 40, 54, 56, 57, 58]:
    print_table(t_idx)
