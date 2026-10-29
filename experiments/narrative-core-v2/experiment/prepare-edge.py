"""Build an isolated deployment manifest from an inspected source snapshot.

Usage: python prepare-edge.py SOURCE_DIRECTORY TOKEN_FILE MANIFEST_FILE
The token file stays local; only its SHA-256 digest enters the deployment.
No provider credential is read or copied by this script.
"""
import hashlib,json,pathlib,sys,time

source=pathlib.Path(sys.argv[1]);token=pathlib.Path(sys.argv[2]).read_bytes()
experiment=pathlib.Path(__file__).parent
files=[]
for path in sorted(source.rglob('*')):
    if path.is_file(): files.append({'name':'character-chat-eval/'+str(path.relative_to(source)), 'content':path.read_text()})
entry=next(f for f in files if f['name']=='character-chat-eval/index.ts')
assert entry['content'].count('Deno.serve(')==1, 'Review changed entrypoint before using harness'
entry['content']='import {handleEvaluation} from "./eval/edge-handler.mjs";\n'+entry['content'].replace('Deno.serve(','const unusedProductionHandler = (',1)
entry['content']+='\nDeno.serve(request=>handleEvaluation(request,{capabilityHash:'+json.dumps(hashlib.sha256(token).hexdigest())+',expires:'+str(int(time.time())+7200)+''',buildBaselinePrompt:({profile,session,content})=>buildNarrativePromptV3({conversation:{id:"synthetic-evaluation",title:"Synthetic evaluation",scene_state:session.scene},character:profile,userIdentity:{name:"User",age:21},messages:[...session.history.map(r=>({sender:r.role==="user"?"user":"character",content:r.content})),{sender:"user",content}],memories:[],loreEntries:[],latestUserRecord:{content},responseLanguage:"English",turnIntent:{},isRegeneration:false,regenerationInstruction:"",directorInstruction:"",developmentState:{},regenerationFeedback:[],storyPreferences:{},turnContract:{}})}));'''
for name in ['core.mjs','crisis-response.js','model-adapter.mjs','edge-handler.mjs']:
    files.append({'name':'character-chat-eval/eval/'+name,'content':(experiment/name).read_text()})
pathlib.Path(sys.argv[3]).write_text(json.dumps({'name':'character-chat-eval','entrypoint_path':'character-chat-eval/index.ts','import_map_path':'character-chat-eval/deno.json','verify_jwt':False,'files':files}))
