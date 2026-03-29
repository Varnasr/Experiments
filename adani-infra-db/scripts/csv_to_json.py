#!/usr/bin/env python3
"""Convert adani_database.csv to data/projects.json for the tracker."""

import csv
import json
import os

CSV_PATH = os.path.join(os.path.dirname(__file__), '..', 'adani_database.csv')
JSON_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'projects.json')

# Sector color map
SECTOR_COLORS = {
    'Port': '#DC143C', 'Airport': '#FF6347', 'Thermal Power': '#FF4500',
    'Renewable Energy': '#32CD32', 'Transmission': '#FFD700', 'City Gas': '#FF8C00',
    'Roads': '#8B4513', 'Mining/Metals': '#A0522D', 'Cement': '#CD853F',
    'Real Estate': '#DDA0DD', 'Food/FMCG': '#90EE90', 'Defence': '#4682B4',
    'Logistics': '#20B2AA', 'Data Center': '#9370DB', 'Media': '#FF69B4',
    'Grain Silo': '#DAA520', 'State MoU': '#778899', 'Pumped Storage': '#00CED1',
    'Maritime Fleet': '#1E90FF', 'Offshore Entity': '#696969',
    'Overseas Hydro': '#3CB371', 'International Port': '#B22222',
    'International Defence JV': '#4169E1', 'Cancelled International': '#808080',
    'Coal Mining - Australia': '#8B0000', 'Coal Terminal - Australia': '#A52A2A',
    'Rail - Australia': '#CD5C5C', 'Coal Mining - Indonesia': '#800000',
    'Coal Terminal - Indonesia': '#B22222', 'Trading Entity': '#556B2F',
    'Power Export': '#FF7F50', 'Telecom': '#2196F3', 'Refinery': '#FF5722',
    'Oil & Gas': '#795548', 'Retail': '#E91E63', 'Technology': '#673AB7',
    'Financial Services': '#009688',
}

GOI_KEYWORDS = [
    'Direct Govt Contract', 'PPP', 'Govt JV', 'Public-Private',
    'Govt-backed', 'State support', 'Subsidized', 'UDAY', 'CGD License',
    'Sovereign', 'Regulated Tariff', 'Priority Sector', 'Govt Defense',
    'MoU', 'Defence Contract', 'Government JV'
]

INDIA_STATES = [
    'Gujarat', 'Maharashtra', 'Rajasthan', 'Madhya Pradesh', 'Uttar Pradesh',
    'Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Kerala',
    'Odisha', 'Jharkhand', 'Chhattisgarh', 'West Bengal', 'Bihar',
    'Punjab', 'Haryana', 'Himachal Pradesh', 'Uttarakhand', 'Goa',
    'Assam', 'Tripura', 'Meghalaya', 'Mizoram', 'Manipur', 'Nagaland',
    'Arunachal Pradesh', 'Sikkim', 'Delhi', 'Jammu & Kashmir', 'Ladakh',
    'Chandigarh', 'Puducherry', 'Multiple States', 'Pan-India',
    'Multiple Indian States', 'Pan India',
]


def is_goi(support_type):
    if not support_type:
        return False
    return any(kw.lower() in support_type.lower() for kw in GOI_KEYWORDS)


def is_international(state):
    if not state:
        return False
    return state.strip() not in INDIA_STATES


def get_color(sector):
    return SECTOR_COLORS.get(sector, '#888888')


def main():
    os.makedirs(os.path.dirname(JSON_PATH), exist_ok=True)

    projects = []
    with open(CSV_PATH, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                lat = float(row.get('Latitude', 0))
                lng = float(row.get('Longitude', 0))
                year = int(row.get('Year', 2020))
            except (ValueError, TypeError):
                continue

            support_type = row.get('GOI_Support_Type', '')
            state = row.get('State', '')

            projects.append({
                'group': row.get('Group', 'Adani'),
                'name': row.get('Project/Location', ''),
                'sector': row.get('Sector', ''),
                'state': state,
                'year': year,
                'status': row.get('Status', ''),
                'support_type': support_type,
                'support_note': row.get('Support_Note', ''),
                'modi_era': row.get('Modi_Era', 'No'),
                'lat': lat,
                'lng': lng,
                'details': row.get('Details', ''),
                'sources': row.get('Source_URLs', ''),
                'color': get_color(row.get('Sector', '')),
                'is_goi': is_goi(support_type),
                'is_international': is_international(state),
            })

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(projects, f, ensure_ascii=False)

    print(f'Generated {len(projects)} projects to {JSON_PATH}')


if __name__ == '__main__':
    main()
