#!/usr/bin/env python3
"""
Import the round-1 source map into the website's record store.

WHY THIS IS NOT A FLAT DUMP
The source map holds three different kinds of record, and only one of them is
evidence about the incidents:

  about the incidents   -> incidents, evidence, external index
  how to obtain records -> SOURCING.md, not the evidence library
  the legal framework   -> the offices' statutoryBasis

Dumping all 136 into WGO.evidence would fill the evidence library with facts
about RTI filing fees, which establish nothing about Jantar Mantar.

WHAT THIS SCRIPT WILL NOT DO
It does not upgrade a state. A claim arrives at whatever confidence the source
map gave it and stays there. It does not invent establishes/doesNotEstablish
text: where the source map has no basis for one, the field is left empty and the
site renders 'Not recorded.'

Run from the repo root:  python3 whogavetheorder/sourcemap/import.py
Writes: whogavetheorder/data/records.generated.js
"""

import json
import pathlib
import re
from collections import OrderedDict

HERE = pathlib.Path(__file__).resolve().parent
SITE = HERE.parent
SRC = HERE

ev = json.load(open(SRC / 'evidence-items.json'))
oq = json.load(open(SRC / 'open-questions.json'))
fq = json.load(open(SRC / 'filing-queue.json'))

# --- category routing --------------------------------------------------------
ABOUT_INCIDENT = {'incident', 'legal_proceeding'}
EXTERNAL       = {'existing_documentation'}
FRAMEWORK      = {'statute', 'police_manual', 'guideline', 'precedent'}
# everything else is sourcing knowledge and stays in SOURCING.md

# jurisdiction -> the site's incident shells
JURIS_TO_INCIDENT = {'delhi': 'INC-0001', 'bihar': 'INC-0002', 'maharashtra': 'INC-0003'}

# source-map category -> the site's evidence type vocabulary
CATEGORY_TO_TYPE = {
    'incident':               'OTHER_DOCUMENT',
    'legal_proceeding':       'COURT_DOCUMENT',
    'existing_documentation': 'NEWS_REPORT',
    'statute':                'OTHER_DOCUMENT',
    'police_manual':          'OTHER_DOCUMENT',
    'guideline':              'OTHER_DOCUMENT',
    'precedent':              'COURT_DOCUMENT',
}


def js(value, indent=0):
    """Serialise to JS literal. json.dumps is valid JS for our shapes."""
    return json.dumps(value, indent=2, ensure_ascii=False).replace('\n', '\n' + ' ' * indent)


# --- 1. sources --------------------------------------------------------------
# Every distinct URL in the source map becomes one SRC- record. Items then cite
# it by ID, so a correction to a source propagates everywhere it is used.
sources = OrderedDict()          # url -> SRC- id
source_records = []

def source_id_for(s):
    url = s.get('url')
    key = url or ('nourl::' + (s.get('publication') or 'unattributed'))
    if key not in sources:
        sid = 'SRC-%04d' % (len(sources) + 1)
        sources[key] = sid
        source_records.append({
            'id': sid,
            'name': s.get('publication') or 'Unattributed source',
            'kind': (s.get('source_type') or 'secondary').upper(),
            'url': url,
            'retrievedOn': s.get('retrieved_on'),
        })
    return sources[key]


# --- 2. incidents ------------------------------------------------------------
# The source map fixes real dates and places. Only fields it actually
# establishes are written; everything else stays UNKNOWN.
incident_items = [i for i in ev if i['category'] == 'incident']

DATE_RE = re.compile(r'on (\d{1,2} \w+ \d{4})')
PLACE_RE = re.compile(r'at ([^,]+(?:, [^,]+)?),? on ')

incident_updates = {}
for i in incident_items:
    inc_id = JURIS_TO_INCIDENT.get(i['jurisdiction'])
    if not inc_id:
        continue
    d = DATE_RE.search(i['claim'])
    p = PLACE_RE.search(i['claim'])
    slot = incident_updates.setdefault(inc_id, {'dates': [], 'places': [], 'items': [], 'state': set()})
    if d: slot['dates'].append(d.group(1))
    if p: slot['places'].append(p.group(1).strip())
    slot['items'].append(i['id'])
    slot['state'].add(i['confidence'])


# --- 3. evidence -------------------------------------------------------------
evidence_records = []
for i in ev:
    if i['category'] not in ABOUT_INCIDENT:
        continue
    evidence_records.append({
        'id': i['id'],
        'title': i['claim'][:160],
        'type': CATEGORY_TO_TYPE.get(i['category'], 'OTHER_DOCUMENT'),
        'verification': i['confidence'],
        'incidentId': JURIS_TO_INCIDENT.get(i['jurisdiction']),
        'dateOfItem': None,
        'dateAdded': '2026-08-16',
        'sourceIds': [source_id_for(s) for s in i['sources']],
        'origin': '',
        'establishes': i.get('notes') or '',
        'doesNotEstablish': '',
        'relatedIds': [],
        'accessNote': '',
        'volatility': i.get('volatility'),
    })


# --- 4. external index -------------------------------------------------------
external_records = []
for i in ev:
    if i['category'] not in EXTERNAL:
        continue
    pub = i['sources'][0].get('publication') if i['sources'] else None
    url = i['sources'][0].get('url') if i['sources'] else None
    external_records.append({
        'id': i['id'],
        'title': re.sub(r'^Published item documenting the \w+ incident: ', '', i['claim'])[:160],
        'creator': pub or 'Creator not recorded',
        'kind': 'Report',
        'date': None,
        'url': url,
        'incidentIds': [JURIS_TO_INCIDENT[i['jurisdiction']]] if i['jurisdiction'] in JURIS_TO_INCIDENT else [],
        'note': i.get('notes') or '',
        'confidence': i['confidence'],
    })


# --- 5. statutory framework --------------------------------------------------
# These fill the offices' statutoryBasis, which is the field that has rendered
# NO SOURCE ON RECORD since the site was built.
framework_records = []
for i in ev:
    if i['category'] not in FRAMEWORK:
        continue
    framework_records.append({
        'id': i['id'],
        'text': i['claim'],
        'confidence': i['confidence'],
        'sourceIds': [source_id_for(s) for s in i['sources']],
        'category': i['category'],
        'jurisdiction': i['jurisdiction'],
        'note': i.get('notes') or '',
    })


# --- 6. open questions -------------------------------------------------------
PRIORITY_MAP = {'time_critical': 'TIME_CRITICAL', 'high': 'HIGH', 'medium': 'MEDIUM', 'standing': 'STANDING'}
question_records = []
for q in oq:
    question_records.append({
        'id': q['id'],
        'incidentId': JURIS_TO_INCIDENT.get(q['jurisdiction']),
        'text': q['question'],
        'priority': PRIORITY_MAP.get(q['priority'], 'MEDIUM'),
        'whyItMatters': q.get('why_it_matters') or '',
        'lawfulRoute': q.get('lawful_route') or '',
        'state': 'UNANSWERED',
        'wants': [q['lawful_route']] if q.get('lawful_route') else [],
        'evidenceIds': [],
        'blocks': q.get('blocks') or [],
        'category': q.get('category'),
    })


# --- 7. filing queue ---------------------------------------------------------
# These are PLANNED acquisitions, not filed applications. They must not enter
# the RTI register, which tracks applications that already have a clock running.
filing_records = []
for t in sorted(fq, key=lambda x: x['sequence']):
    filing_records.append({
        'id': t['id'],
        'sequence': t['sequence'],
        'deadlineDriven': t['deadline_driven'],
        'incidentId': JURIS_TO_INCIDENT.get(t['jurisdiction']),
        'jurisdiction': t['jurisdiction'],
        'action': t['action'],
        'authority': t['authority'],
        'method': t['method'],
        'cost': t['cost'],
        'legalBasis': t['legal_basis'],
        'exposureRisk': t['exposure_risk'],
        'notes': t['notes'],
        'resolves': t.get('resolves') or [],
    })


# --- write -------------------------------------------------------------------
out = SITE / 'data' / 'records.generated.js'
with open(out, 'w') as fh:
    fh.write('/* GENERATED by sourcemap/import.py — do not edit by hand.\n'
             '   Regenerate after changing sourcemap/*.json. */\n\n'
             'window.WGO = window.WGO || {};\n\n')
    fh.write('WGO.importedSources = ' + js(source_records) + ';\n\n')
    fh.write('WGO.importedEvidence = ' + js(evidence_records) + ';\n\n')
    fh.write('WGO.importedExternal = ' + js(external_records) + ';\n\n')
    fh.write('WGO.importedFramework = ' + js(framework_records) + ';\n\n')
    fh.write('WGO.importedQuestions = ' + js(question_records) + ';\n\n')
    fh.write('WGO.importedFilings = ' + js(filing_records) + ';\n\n')
    fh.write('WGO.importedIncidentFacts = ' + js({
        k: {'dates': sorted(set(v['dates'])), 'places': sorted(set(v['places'])),
            'evidenceIds': v['items'], 'state': sorted(v['state'])}
        for k, v in incident_updates.items()
    }) + ';\n')

print(f'sources    {len(source_records):>4}')
print(f'evidence   {len(evidence_records):>4}   (incident + legal_proceeding)')
print(f'external   {len(external_records):>4}   (existing_documentation)')
print(f'framework  {len(framework_records):>4}   (statute, manual, guideline, precedent)')
print(f'questions  {len(question_records):>4}')
print(f'filings    {len(filing_records):>4}')
print(f'\nincident facts recovered:')
for k, v in incident_updates.items():
    print(f'  {k}: dates={sorted(set(v["dates"]))} places={sorted(set(v["places"]))[:2]}')
print(f'\nnot imported: {len([i for i in ev if i["category"] not in ABOUT_INCIDENT|EXTERNAL|FRAMEWORK])} '
      f'sourcing-knowledge items — these belong in SOURCING.md')
print(f'wrote {out}')
