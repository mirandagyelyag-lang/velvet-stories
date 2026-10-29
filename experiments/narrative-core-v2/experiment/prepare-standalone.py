"""Create the standalone fixed-scenario deployment manifest.

Usage: python prepare-standalone.py TOKEN_FILE OUTPUT_MANIFEST
Only a hash of the temporary capability is deployed; provider keys stay in Supabase.
"""
import hashlib,json,pathlib,sys,time

token_file,manifest_file=sys.argv[1:]
root=pathlib.Path(__file__).parent
digest=hashlib.sha256(pathlib.Path(token_file).read_bytes()).hexdigest()
expiry=int(time.time())+7200
files=[{'name':'character-chat-eval/eval/'+name,'content':(root/name).read_text()} for name in ['core.mjs','crisis-response.js','model-adapter.mjs','provenance.mjs','edge-handler.mjs']]
entry='import {handleEvaluation} from "./eval/edge-handler.mjs";\nDeno.serve(request=>handleEvaluation(request,{capabilityHash:'+json.dumps(digest)+',expires:'+str(expiry)+',buildBaselinePrompt:()=>{throw new Error("Historical baseline disabled in standalone source audit");}}));'
files.extend([{'name':'character-chat-eval/index.ts','content':entry},{'name':'character-chat-eval/deno.json','content':'{}'}])
pathlib.Path(manifest_file).write_text(json.dumps({'name':'character-chat-eval','entrypoint_path':'character-chat-eval/index.ts','import_map_path':'character-chat-eval/deno.json','verify_jwt':False,'files':files}))
