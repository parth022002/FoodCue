import zipfile
import xml.etree.ElementTree as ET

wb_path = r'..\Document\Rough Document\FoodCue_Validation_Workbook_v13_4.xlsx'
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

    def count_data_rows(s_name):
        for s in sheets:
            if s.attrib['name'] == s_name:
                r_id = s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                target = rel_map[r_id]
                sheet_path = 'xl/' + target if not target.startswith('/') else target[1:]
                s_xml = z.read(sheet_path)
                s_root = ET.fromstring(s_xml)
                rows = s_root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
                count = 0
                sample = []
                for r in rows:
                    r_idx = int(r.attrib.get('r', 0))
                    if r_idx < 7:  # headers usually rows 1-6
                        continue
                    c_a = r.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c[@r="A' + str(r_idx) + '"]')
                    if c_a is not None:
                        v = c_a.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                        if v is not None and v.text is not None and v.text.strip():
                            t = c_a.attrib.get('t')
                            val = shared_strings[int(v.text)] if t == 's' and int(v.text) < len(shared_strings) else v.text
                            if val:
                                count += 1
                                if len(sample) < 3:
                                    sample.append((r_idx, val))
                print(f"v13.4 Sheet {s_name}: populated data rows = {count}. Samples: {sample}")

    for s_name in ['Interviews', 'Survey_Responses', 'Competitor_Audit', 'Concept_Test_Log',
                   'Benchmark', 'Code_Test_Log', 'Source_Rights_Register', 'Issue_Log',
                   'Beta_Log', 'Scan_Benchmark', 'GS1_Test_Cases', 'QR_Security_Test',
                   'Photo_Benchmark', 'Cost_Model']:
        count_data_rows(s_name)
