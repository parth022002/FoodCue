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
        s_name = s.attrib['name']
        r_id = s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        target = rel_map[r_id]
        sheet_path = 'xl/' + target if not target.startswith('/') else target[1:]
        s_xml = z.read(sheet_path)
        s_root = ET.fromstring(s_xml)
        rows = s_root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
        cells_with_values = 0
        for r in rows:
            for c in r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                if v is not None and v.text and v.text.strip():
                    cells_with_values += 1
        print(f"Sheet {s_name}: total rows={len(rows)}, cells with values={cells_with_values}")
