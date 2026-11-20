#!/usr/bin/env python3
from pathlib import Path
import sys, hashlib, json, csv, importlib.util, re

def h(s): return hashlib.sha256(str(s).strip().lower().encode()).hexdigest()
def parse_kv(path):
    out={}
    for raw in Path(path).read_text(encoding='utf-8').splitlines():
        raw=raw.strip()
        if not raw or raw.startswith('#'): continue
        if '=' not in raw: continue
        k,v=raw.split('=',1); out[k.strip().lower()]=v.strip()
    return out

def require_hashes(ans, expected):
    bad=[]
    for key, digest in expected.items():
        if key not in ans or h(ans[key]) != digest: bad.append(key)
    return bad

def phase1(path):
    exp={
      'provider_account':'d7e0180ae4ed84bb370cd6f91b1acf9f8585c3f08556debbe6a166960d32485c','source_ip':'35413343c1f2a50e500b0c304f26ee6b167e85adfece20974d553660be5ba1d3','affected_system':'198cddd3e9def6e20915074f56526f9514c17fb7546e23f01c3e40c79486706a',
      'earliest_malicious_event':'5d3d62504fd8e9e7dd0c493b539eee3f2d6f79c9ebdb5a9ed886540e0b2b15c5','record_count':'065f4fa6723db9087ba06d66629821913cac0ec250a6e0e8e5e54f736751a132'
    }
    ans=parse_kv(path); bad=require_hashes(ans,exp)
    ev={h('AUTH-1042'),h('CLM-2219')}
    supplied={h(ans.get('evidence_event_1','')),h(ans.get('evidence_event_2',''))}
    if not ev.issubset(supplied): bad.append('evidence_event_1/evidence_event_2')
    if bad:
        print('PHASE-1 NOT YET: check ' + ', '.join(sorted(set(bad)))); return 2
    print('PHASE-1 PASS | CASE WINDOW: 08:20-08:30 CST'); return 0

def phase2(path):
    exp={
      'external_ip':'0c25434b09c62046f88142b1412b949ea7e9bc61479d71b2b74ab8dbc3d2d946','domain':'7aaed31ff3aeb42f7ea953a6b2ce5b39579a708d3c4b5ce13017516b459fbef8','protocol':'e0603c499aae47eb89343ad0ef3178e044c62e70ae2309b35591d1d49a3211ec','destination_port':'6c237681e70921603a306be9a1a5d9833fce5c1e268f52b1650970eaad0dce21',
      'staged_file':'f1ce53aa93497d2c56eb48fe13e2a309ad3eb74b482dd9e841e5d7485878c913','uri':'c90e71b368aacec11ad6c9cf84c14ff617ef32f7c1f2bec3a32a2b759493b470','decoded_token':'bd06111a4e5e4dd1956470e479ed7f67d64f466cf6cd649ba265871bf1b9abb7'
    }
    ans=parse_kv(path); bad=require_hashes(ans,exp)
    if bad:
        print('PHASE-2 NOT YET: check ' + ', '.join(sorted(set(bad)))); return 2
    print('PHASE-2 PASS | RULE KEYWORD: ' + ans['decoded_token'].upper()); return 0

def load_detector(path):
    spec=importlib.util.spec_from_file_location('team_detect', str(path)); mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    if not hasattr(mod,'is_suspicious'): raise RuntimeError('detect.py must define is_suspicious(event)')
    return mod

def final(subdir):
    sub=Path(subdir)
    req=['phase1.txt','phase2.txt','detect.py','containment.txt','final_report.md','final_events.jsonl','post_containment_claims.csv']
    missing=[x for x in req if not (sub/x).exists()]
    if missing: print('FINAL NOT YET: missing ' + ', '.join(missing)); return 2
    # Verify phase answers again
    if phase1(sub/'phase1.txt') != 0 or phase2(sub/'phase2.txt') != 0:
        print('FINAL NOT YET: earlier phase answers do not validate'); return 2
    try: det=load_detector(sub/'detect.py')
    except Exception as e: print('FINAL NOT YET: cannot load detect.py:',e); return 2
    malicious_hashes=set(['2d0cdecdf2c4e3324122449a2d665b5982f4102571a9ca92137acff7e380ea35', '4b31c3c01f3b5d7c277b5d4ed17b7b0c5e779853f4f864544276bd2024066b32', '9f1ad5a36e790418959a8fbdea6265c764a82a72cf606ef844d634b681ff8bf9', 'b36187b76032bf34e39b25a23ff224a7b9da3035b34b6abafeb40d23febd1532', 'e9517f54200065b684f038beab3974b12ff6f94872050bcf84666ec6bc422dd2'])
    tp=fp=fn=0
    for line in (sub/'final_events.jsonl').read_text(encoding='utf-8').splitlines():
        if not line.strip(): continue
        ev=json.loads(line); expected=h(ev.get('event_id','')) in malicious_hashes
        try: got=bool(det.is_suspicious(ev))
        except Exception as e: print('FINAL NOT YET: detector error:',e); return 2
        if got and expected: tp+=1
        elif got and not expected: fp+=1
        elif expected and not got: fn+=1
    if fn or fp>1:
        print(f'FINAL NOT YET: detector results TP={tp} FN={fn} FP={fp}; requires FN=0 and FP<=1'); return 2
    # Post-containment verification: no compromised account or malicious destination after 08:35, >=5 completed legitimate claim workflows.
    cutoff='2026-11-14T08:35:00-06:00'; bad_after=[]; legit=0
    with (sub/'post_containment_claims.csv').open(newline='',encoding='utf-8') as f:
        for r in csv.DictReader(f):
            if r['timestamp'] > cutoff:
                if r.get('provider_account')=='prv_48217' or r.get('destination_ip')=='203.0.113.77': bad_after.append(r.get('event_id','?'))
                if r.get('status')=='COMPLETED' and r.get('event_type') in {'CLAIM_ADJUDICATION','CLAIM_STATUS_LOOKUP','CLAIM_PAYMENT','ELIGIBILITY_LOOKUP'}: legit+=1
    if bad_after or legit < 5:
        print(f'FINAL NOT YET: containment/continuity check failed; post-cutoff suspicious={bad_after}, legitimate_completed={legit}'); return 2
    # Required report sections and minimum substance
    report=(sub/'final_report.md').read_text(encoding='utf-8')
    needed=['timeline','affected assets','scope','indicators','containment','detection','business continuity']
    missing_sections=[x for x in needed if x not in report.lower()]
    if missing_sections or len(report.split()) < 120:
        print('FINAL NOT YET: final_report.md is incomplete; missing/insufficient: ' + ', '.join(missing_sections or ['minimum detail'])); return 2
    # Team-specific confirmation code
    manifest=Path(__file__).with_name('team_manifest.json')
    team='00'
    if manifest.exists(): team=str(json.loads(manifest.read_text(encoding='utf-8')).get('team_number','00')).zfill(2)
    code=hashlib.sha256(f'OCC2026|{team}|CLAIMWATCH|1287'.encode()).hexdigest()[:8].upper()
    print(f'FINAL PASS | FINAL CONFIRMATION CODE: OCC-T{team}-{code} | TP={tp} FP={fp}')
    return 0

def main():
    if len(sys.argv)<3:
        print('Usage: python validator.py phase1 <phase1.txt> | phase2 <phase2.txt> | final <submission_dir>'); return 2
    mode=sys.argv[1].lower()
    if mode=='phase1': return phase1(sys.argv[2])
    if mode=='phase2': return phase2(sys.argv[2])
    if mode=='final': return final(sys.argv[2])
    print('Unknown mode'); return 2
if __name__=='__main__': raise SystemExit(main())
