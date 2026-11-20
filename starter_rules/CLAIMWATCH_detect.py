"""Operation Clean Claim - CLAIMWATCH starter detector.
Complete is_suspicious(event) using evidence from Parts 1 and 2.
Each alert condition should combine at least two evidence fields so benign look-alikes are ignored.
Do not use event_id as a detection condition.
"""

def is_suspicious(event):
    # Useful fields include: event_type, provider_account, source_ip, app_node,
    # action, record_count, destination_ip, destination_domain, filename.
    # TODO: replace the line below with your evidence-based logic.
    return False

def explain(event):
    # Optional: return a concise reason for an alert.
    return "Review event against Operation Clean Claim indicators."
