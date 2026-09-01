import json
import sys
#tetsing #testing from vs code
try:
    with open('.rohkun/reports/1/report.json', 'r') as f:
        data = json.load(f)

    print(f"Report ID: {data.get('id', 'N/A')}")
    print(f"Timestamp: {data.get('timestamp', 'N/A')}")
    print(f"Root keys: {list(data.keys())}")
    
    print("\n--- Summary ---")
    summary = data.get('summary', {})
    print(json.dumps(summary, indent=2))

    print("\n--- Project Stats ---")
    stats = data.get('projectStats', {})
    print(f"Files: {stats.get('fileCount')}")
    print(f"Lines: {stats.get('totalLines')}")

    # 1. High Impact Nodes (All severities)
    print("\n--- High Impact Nodes (Full List) ---")
    high_impact = data.get('high_impact_nodes', [])
    for node in high_impact:
        print(f"[{node.get('severity', 'UNKNOWN').upper()}] {node.get('target')} - Dependents: {node.get('total_dependents')}")

    # 2. UI Inspection
    print("\n--- UI Inspection Issues ---")
    ui_issues = data.get('ui_inspection', {}).get('issues', [])
    if ui_issues:
        for issue in ui_issues:
            print(f"- {issue}")
    else:
        print("No UI issues found.")

    # 3. Blast Radius (Check for other risky nodes)
    print("\n--- Blast Radius / Risky Nodes ---")
    blast_radius = data.get('blast_radius', [])
    print(f"Blast Radius Data Type: {type(blast_radius)}")
    if isinstance(blast_radius, list):
        print(f"Blast Radius Entries: {len(blast_radius)}")
        for i, item in enumerate(blast_radius[:5]):
            print(f"- Item {i}: {item}")
        
    # 4. Endpoints & API Calls (Check for 'uncertain' ones)
    print("\n--- API Calls (Uncertain/Attention Needed) ---")
    api_calls = data.get('api_calls', [])
    if api_calls:
        # Check if there's a status or confidence field
        uncertain = [c for c in api_calls if c.get('confidence') != 'confident']
        print(f"Total API Calls: {len(api_calls)}")
        print(f"Uncertain API Calls: {len(uncertain)}")
        for c in uncertain:
            print(f" - {c}")
            
    # 5. Semantic Context / Alerts
    print("\n--- Semantic Context / Alerts ---")
    semantic = data.get('semantic_context', {})
    if isinstance(semantic, dict):
         alerts = semantic.get('alerts', [])
         if alerts:
             for a in alerts:
                 print(f"ALERT: {a}")
         else:
             print("No global alerts found.")
    
    # 6. Check for general 'issues' key if it exists
    if 'issues' in data:
        print("\n--- General Issues ---")
        for i in data['issues']:
            print(f"- {i}")




except Exception as e:
    print(f"Error reading report: {e}")
