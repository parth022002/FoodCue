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
    ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    sheets = root.findall('main:sheets/main:sheet', ns)

    rels_xml = z.read('xl/_rels/workbook.xml.rels')
    rels_root = ET.fromstring(rels_xml)
    rel_map = {r.attrib['Id']: r.attrib['Target'] for r in rels_root}

    for s in sheets:
        s_name = s.attrib['name']
        if s_name in ['Dashboard', 'Gate_Tracker', 'Formula_QA', 'SmartScan_Gate', 'Code_Test_Log', 'Benchmark', 'Beta_Log']:
            r_id = s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
            target = rel_map[r_id]
            sheet_path = 'xl/' + target if not target.startswith('/') else target[1:]
            s_xml = z.read(sheet_path)
            s_root = ET.fromstring(s_xml)
            print(f'=== Sheet: {s_name} ===')
            rows = s_root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
            for r in rows[:25]:
                row_vals = []
                for c in r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                    val = ''
                    v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    t = c.attrib.get('t')
                    cell_ref = c.attrib.get('r')
                    if v is not None and v.text is not None:
                        if t == 's':
                            idx = int(v.text)
                            val = shared_strings[idx] if idx < len(shared_strings) else v.text
                        else:
                            val = v.text
                    f = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}f')
                    f_text = f" [f={f.text}]" if f is not None and f.text else ""
                    if val or f_text:
                        row_vals.append(f'{cell_ref}: {val}{f_text}')
                if row_vals:
                    print(' | '.join(row_vals[:6]))
