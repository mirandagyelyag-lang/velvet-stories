"""Run only fixed synthetic cases against a temporary, capability-gated harness.

Usage: python run-remote.py ENDPOINT TOKEN_FILE OUTPUT_PREFIX
No provider credential is accepted, read or printed.
"""
import json,pathlib,sys,time,urllib.request,urllib.error

endpoint,token_path,prefix=sys.argv[1:]
token=pathlib.Path(token_path).read_text()
jobs=[('quality','reviewer'),('correction','experiment'),('interior','experiment'),('care','experiment'),('invitation','experiment'),('safety','experiment')]
for scenario,mode in jobs:
    request=urllib.request.Request(endpoint,data=json.dumps({'scenario':scenario,'mode':mode}).encode(),headers={'Content-Type':'application/json','x-evaluation-token':token},method='POST')
    began=time.time()
    try:
        with urllib.request.urlopen(request,timeout=210) as response:
            status,raw=response.status,response.read().decode()
    except urllib.error.HTTPError as error:
        status,raw=error.code,error.read().decode()
    data=json.loads(raw)
    pathlib.Path(f'{prefix}-{scenario}-{mode}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'scenario':scenario,'mode':mode,'http':status,'seconds':round(time.time()-began),'turns':len(data.get('output',[])),'error':data.get('error')}),flush=True)
    if status >= 400 or any(row.get('status')=='provider-error' for row in data.get('output',[])):break
