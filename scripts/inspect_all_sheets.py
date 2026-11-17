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

    def get_sheet_summary(s_name):
        for s in sheets:
            if s.attrib['name'] == s_name:
                r_id = s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                target = rel_map[r_id]
                sheet_path = 'xl/' + target if not target.startswith('/') else target[1:]
                s_xml = z.read(sheet_path)
                s_root = ET.fromstring(s_xml)
                rows = s_root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
                print(f"Sheet {s_name}: {len(rows)} rows")
                # print first 5 rows and any summary cells
                for r in rows[:6]:
                    row_idx = r.attrib.get('r')
                    vals = []
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
                            vals.append(f"{cell_ref}: {val}{f_text}")
                    if vals:
                        print(f"  R{row_idx}: {' | '.join(vals[:5])}")

    target_sheets = [
        'Interviews', 'Survey_Responses', 'Competitor_Audit', 'Concept_Test_Log',
        'Benchmark', 'Bench_Summary', 'Code_Test_Log', 'Cost_Model',
        'Source_Rights_Register', 'Issue_Log', 'Beta_Log', 'Scan_Benchmark',
        'GS1_Test_Cases', 'QR_Security_Test', 'Photo_Benchmark', 'Formula_QA'
    ]
    for ts in target_sheets:
        get_sheet_summary(ts)
