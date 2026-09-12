"""Read-only XLSX benchmark adapter. Standard library only; never saves a workbook."""
import hashlib
import json
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

path = Path(sys.argv[1] if len(sys.argv) > 1 else 'docs/Validation/LawWatch_Validation_Cohort_v2.xlsx')
ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(path) as archive:
    shared = [''.join(node.itertext()) for node in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('m:si', ns)] if 'xl/sharedStrings.xml' in archive.namelist() else []
    relations = {r.get('Id'): r.get('Target') for r in ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))}
    sheets = {}
    for sheet in ET.fromstring(archive.read('xl/workbook.xml')).findall('m:sheets/m:sheet', ns):
        target = relations[sheet.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')]
        target = target.lstrip('/') if target.startswith('/') else 'xl/' + target
        rows = []
        for row in ET.fromstring(archive.read(target)).findall('m:sheetData/m:row', ns):
            cells = {}
            for cell in row.findall('m:c', ns):
                column = ''.join(c for c in cell.get('r') if c.isalpha())
                value = cell.find('m:v', ns)
                inline = cell.find('m:is', ns)
                text = value.text if value is not None else ''.join(inline.itertext()) if inline is not None else ''
                cells[column] = shared[int(text)] if cell.get('t') == 's' else text
            rows.append(cells)
        sheets[sheet.get('name')] = rows
    def records(name):
        rows = sheets[name]
        return [{label: row.get(column, '') for column, label in rows[0].items()} for row in rows[1:]]
    cohort = {r['Firm']: r for r in records('50-Firm Cohort')}
    firms = []
    # Explicit cross-sheet name mismatch in v2. Preserve both source sheets.
    aliases = {'Redkite Solicitors': 'Red Kite Law'}
    for row in records('Full Benchmark'):
        firms.append({'firm': row['Firm'], 'url': cohort[aliases.get(row['Firm'], row['Firm'])]['Website'], 'service': row['Primary benchmark service'], 'rules': {k: v for k, v in row.items() if k.startswith(('LAW-', 'PRICE-'))}, 'pricingSource': row['Pricing source'], 'complaintsSource': row['Complaints source'], 'notes': row['Reviewer notes']})
    print(json.dumps({'schemaVersion': 1, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'firms': firms, 'rulebook': records('LawWatch Rulebook v1'), 'guide': sheets['Review Guide'], 'sources': records('Sources')}, ensure_ascii=True))
