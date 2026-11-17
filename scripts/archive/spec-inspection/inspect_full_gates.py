import zipfile
import xml.etree.ElementTree as ET

wb_path = r'..\Upload\FoodCue_Validation_Workbook_v13_5_Final_Controlled_Baseline.xlsx'
with zipfile.ZipFile(wb_path, 'r') as z:
    shared_strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        ss_xml = z.read('xl/sharedStrings.xml')
        ss_root = ET.fromstring(ss_xml)
        for si in ss_root.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
            text = ''.join([t.text for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text])
            shared_strings.append(text)

    wb_xml = z.read('xl/workbook.xml')
    root = ET.fromstring(wb_xml)
    sheets = root.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheets/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet')

    rels_xml = z.read('xl/_rels/workbook.xml.rels')
    rels_root = ET.fromstring(rels_xml)
    rel_map = {r.attrib['Id']: r.attrib['Target'] for r in rels_root}

    for s in sheets:
        if s.attrib['name'] == 'Gate_Tracker':
            r_id = s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
            target = rel_map[r_id]
            sheet_path = 'xl/' + target if not target.startswith('/') else target[1:]
            s_xml = z.read(sheet_path)
            s_root = ET.fromstring(s_xml)
            rows = s_root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
            print(f"Total rows in Gate_Tracker: {len(rows)}")
            for r in rows:
                row_idx = r.attrib.get('r')
                cells = {}
                for c in r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                    val = ''
                    v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    t = c.attrib.get('t')
                    cell_ref = c.attrib.get('r')
                    col = ''.join([ch for ch in cell_ref if ch.isalpha()])
                    if v is not None and v.text is not None:
                        if t == 's':
                            idx = int(v.text)
                            val = shared_strings[idx] if idx < len(shared_strings) else v.text
                        else:
                            val = v.text
                    f = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}f')
                    f_text = f" [f={f.text}]" if f is not None and f.text else ""
                    cells[col] = f"{val}{f_text}".strip()
                if cells:
                    a = cells.get('A', '')
                    b = cells.get('B', '')
                    c = cells.get('C', '')
                    d = cells.get('D', '')
                    e = cells.get('E', '')
                    f = cells.get('F', '')
                    print(f"Row {row_idx}: {a} | {b} | C={c} | D={d} | E={e} | F={f}")
