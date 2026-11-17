import docx

doc_path = r'..\Upload\FoodCue_Master_Specification_v13_5_Final_Controlled_Baseline.docx'
doc = docx.Document(doc_path)

print(f"Total tables: {len(doc.tables)}")
for i, table in enumerate(doc.tables):
    # print first cell or row of table
    row0 = [cell.text.strip().replace('\n', ' ') for cell in table.rows[0].cells]
    print(f"Table {i}: cols={len(table.columns)}, rows={len(table.rows)} | Header: {' | '.join(row0[:4])}")
