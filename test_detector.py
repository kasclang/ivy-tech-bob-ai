#!/usr/bin/env python3
from pathlib import Path
import sys, json, hashlib, importlib.util

def h(s): return hashlib.sha256(str(s).strip().lower().encode()).hexdigest()
def load_detector(path):
    spec=importlib.util.spec_from_file_location('team_detect', str(path)); mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    if not hasattr(mod,'is_suspicious'): raise RuntimeError('detect.py must define is_suspicious(event)')
    return mod

def parse_kv(path):
    out={}
    for line in Path(path).read_text(encoding='utf-8').splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            k,v=line.split('=',1); out[k.strip().lower()]=v.strip()
    return out

def main():
    if len(sys.argv)<2:
        print('Usage: python test_detector.py submission/detect.py [submission/containment.txt]'); return 2
    det=load_detector(Path(sys.argv[1]))
    data=Path(__file__).with_name('practice_events.jsonl')
    expected=set(['1aa4e3c5399f9c272a4bbc7440479dad5d37d9b726934f8c33b82e8ece5f00da', '1c6191f3e7f5b85dff7e0cbd6217cc86ecd0d8c6d5ffcdd443fa07489dbc704f', '34ab25a7780d574fd2002feca759aa774b1828b11be63afa1447fc531fb32345', '3835c0ad42cc019274ec7cc13b18cd37b786f7beae7872201cccb4e5ec0d7324', '8f9bbab948a0f9ec06426bbb6a3ad80c2065bb42c9f9a22bb30cb1f66991f09b'])
    tp=fp=fn=0
    for line in data.read_text(encoding='utf-8').splitlines():
        if not line.strip(): continue
        ev=json.loads(line); is_bad=h(ev.get('event_id','')) in expected
        try: got=bool(det.is_suspicious(ev))
        except Exception as e: print('Detector raised an exception:',e); return 2
        if got and is_bad: tp+=1
        elif got and not is_bad: fp+=1
        elif is_bad and not got: fn+=1
    containment_ok=True; issues=[]
    if len(sys.argv)>=3:
        p=Path(sys.argv[2]);
        if not p.exists(): containment_ok=False; issues.append('containment file missing')
        else:
            kv=parse_kv(p)
            exact={'provider_account':'prv_48217','affected_system':'PRV-API-02','malicious_ip':'203.0.113.77','malicious_domain':'claims-sync-support.example'}
            for k,v in exact.items():
                if kv.get(k,'').lower()!=v.lower(): issues.append(k); containment_ok=False
            for k in ['account_action','system_action','network_action','business_continuity']:
                if len(kv.get(k,''))<12: issues.append(k); containment_ok=False
            risky=' '.join(kv.values()).lower()
            if any(x in risky for x in ['shut down all claims','disable all claims','take the entire claims platform offline']):
                issues.append('containment is broader than necessary'); containment_ok=False
    else:
        containment_ok=False; issues.append('containment path not supplied')
    print(f'Practice detector results: TP={tp} FN={fn} FP={fp}')
    if fn==0 and fp==0 and containment_ok:
        print('PHASE-3 PASS'); return 0
    print('PHASE-3 NOT YET' + (': ' + ', '.join(issues) if issues else '')); return 2
if __name__=='__main__': raise SystemExit(main())
