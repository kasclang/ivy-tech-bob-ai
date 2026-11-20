# Operation Clean Claim - Student Package

## Mission
You are the incident-response team for **ExampleCare Health Plan**, a fictional U.S. healthcare insurance company. Investigate suspicious provider-portal and claims activity, trace the suspected transfer, build a focused detector/containment plan, and prove that normal claims processing can continue.

All member, provider, account, claim, IP, and domain data in this challenge are synthetic or reserved for documentation. **Do not contact, scan, or browse to any indicator found in the evidence.**

## Timebox
Total event time: **3 hours**. Suggested pacing: Part 1 = 35 min; Part 2 = 45 min; Part 3 = 45 min; Part 4 = 35 min; final documentation/submission = 20 min.

## Recommended team roles (5 students)
Incident lead; identity/log analyst; claims-log analyst; network analyst; detection/documentation engineer. Roles may rotate.

## Files you start with
- `provider_auth.csv` - synthetic provider portal authentication events
- `claims_audit.jsonl` - synthetic claims-system audit events
- `traffic.pcapng` - offline synthetic network capture
- `practice_events.jsonl` - events used to test your detector
- `starter_rules/` - choose the correct starter after Part 2
- `validator.py` and `test_detector.py` - local self-check scripts
- `templates/` - copy these files into `submission/` and complete them
- `team_manifest.json` - your assigned team number

Do not modify `validator.py`, `test_detector.py`, or the evidence files. Judges may validate your submission with clean copies.

## Part 1
Copy `templates/phase1_template.txt` to `submission/phase1.txt`, complete it, then run:

    python validator.py phase1 submission/phase1.txt

On Windows, `py -3` may be used instead of `python`. A pass returns the packet-capture time window.

## Part 2
Open `traffic.pcapng` in Wireshark. Focus on the Part 1 window. Find the suspicious external indicator, protocol/port, staged export filename or URI, and the encoded case token. Decode the token with CyberChef or Python Base64 support. Copy `templates/phase2_template.txt` to `submission/phase2.txt`, complete it, then run:

    python validator.py phase2 submission/phase2.txt

A pass returns the rule keyword.

## Part 3
Use the rule keyword to select the matching file in `starter_rules/`. Copy that starter to `submission/detect.py` and implement `is_suspicious(event)`. Copy `templates/containment_template.txt` to `submission/containment.txt` and complete it. Test both with:

    python test_detector.py submission/detect.py submission/containment.txt

A full pass requires all seeded malicious practice events to alert, no benign practice events to alert, and a targeted containment plan. Show `PHASE-3 PASS` to a judge to receive your team's **Final Validation Pack**.

## Part 4
Copy `final_events.jsonl` and `post_containment_claims.csv` from the Final Validation Pack into `submission/`. Copy `templates/final_report_template.md` to `submission/final_report.md` and complete it. Then run:

    python validator.py final submission

Record the final confirmation code and show it to the judge.

## Safety and competition scope
- Work only with the supplied files.
- Do not scan, exploit, or connect to any live system or external IP/domain.
- Treat the fictional healthcare data as if it were sensitive.
- Do not share the Final Validation Pack or answers across teams.
- The goal is targeted containment and continuity, not shutting down the entire claims environment.
