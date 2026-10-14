import json,urllib.request,urllib.error,pathlib,time
root=pathlib.Path(__file__).parent
cfg=json.loads((root/'access.json').read_text());results=[]
models=['gemini-3.5-flash','gemini-3.5-flash-lite','gemini-3.1-flash-lite']
cases=['party','campus_event','group_outing']
for model in models:
 blocked=False
 for case in cases:
  if blocked:
   results.append({'model':model,'caseId':case,'status':'skipped_provider_unavailable'});continue
  req=urllib.request.Request('https://vwyudrmxatuukcbncats.supabase.co/functions/v1/velvet-qa-instant',data=json.dumps({'model':model,'caseId':case}).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer '+cfg['token']})
  try:
   with urllib.request.urlopen(req,timeout=25) as r: item=json.loads(r.read());item['httpStatus']=r.status
  except urllib.error.HTTPError as e:
   try:item=json.loads(e.read())
   except:item={'error':'Provider HTTP error'}
   item.update({'model':model,'caseId':case,'httpStatus':e.code});blocked=e.code in (429,503)
  except Exception as e:item={'model':model,'caseId':case,'error':str(e),'httpStatus':0};blocked=True
  results.append(item);(root/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
  print(json.dumps(item,ensure_ascii=False),flush=True)
(root/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
