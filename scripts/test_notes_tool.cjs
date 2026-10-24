'use strict';
const assert=require('node:assert/strict');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const io=require('./note_io.cjs');
const save=require('./guarded_save.cjs');
const {preview}=require('./impact_preview.cjs');
const {fs,path}=io;
const base=fs.mkdtempSync(path.join(os.tmpdir(),'learning-notes-tests-'));
const results=[];
function fixture() {
  const folder=fs.mkdtempSync(path.join(base,'case-')),vault=path.join(folder,'vault'),state=path.join(folder,'state');
  fs.mkdirSync(path.join(vault,'.obsidian'),{recursive:true});
  const put=(name,text)=>{fs.mkdirSync(path.dirname(path.join(vault,name)),{recursive:true});fs.writeFileSync(path.join(vault,name),text);};
  const get=name=>fs.readFileSync(path.join(vault,name),'utf8');
  const calls={};let hook=null;
  // An explicit adapter fixture, not a live Obsidian implementation.
  const app={workspace:{getLeavesOfType:()=>[]},vault:{adapter:{getBasePath:()=>vault},getAbstractFileByPath:rel=>fs.existsSync(path.join(vault,rel))?{path:rel}:null,
    process:async(file,fn)=>{calls[file.path]=(calls[file.path]||0)+1;if(hook)await hook('before',file.path);const next=fn(get(file.path));put(file.path,next);if(hook)await hook('after',file.path);return next;},
    create:async(rel,value)=>{calls[rel]=(calls[rel]||0)+1;fs.writeFileSync(path.join(vault,rel),value,{flag:'wx'});return {path:rel};}}};
  return {folder,vault,state,put,get,app,calls,setHook:f=>hook=f};
}
function edit(f,edits){return save.prepare(f.vault,{edits});}
function receipt(f,p){return path.join(f.state,io.sha(Buffer.from(fs.realpathSync(f.vault))).slice(0,24),p.id+'.json');}
async function test(name,fn){try{await fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.stack});}}
(async()=>{
await test('Preview: links, embeds, attachments, duplicate names, code exclusion and no writes',()=>{
  const f=fixture();f.put('one/A.md','# 标题\n段落 ^b1\n![[pic.png]]\n');f.put('two/A.md','# Other');f.put('pic.png',Buffer.from([1,2,3]));
  f.put('引用.md','[[one/A#标题|显示]]\n![[one/A#^b1]]\n[[A]]\n[相对](one/A.md#标题)\n```js\n[[one/A]]\n```\n`[[one/A]]`');
  const before=io.sha(fs.readFileSync(path.join(f.vault,'引用.md')));
  const r=preview(f.vault,{action:'rename',source:'one/A.md',target:'one/B.md'});
  assert(r.impacts.some(x=>x.before.ambiguous));assert(r.impacts.some(x=>x.kind==='wiki_embed'&&x.before.anchor==='^b1'));
  assert(r.attachments.some(x=>x.attachment==='pic.png'));assert(!r.impacts.some(x=>x.source==='引用.md'&&x.line>=6));
  assert.equal(io.sha(fs.readFileSync(path.join(f.vault,'引用.md'))),before);assert(!fs.existsSync(path.join(f.vault,'one/B.md')));
});
await test('Preview: same-name destination conflict and move changes relative links',()=>{
  const f=fixture();f.put('x/A.md','[asset](pic.png)');f.put('x/pic.png','a');f.put('y/B.md','b');f.put('y/pic.png','b');
  const r=preview(f.vault,{action:'rename',source:'x/A.md',target:'y/B.md'});
  assert(r.findings.some(x=>x.type==='target_conflict'));assert(r.impacts.some(x=>x.before.candidates[0]==='x/pic.png'&&x.afterWithoutLinkUpdate.candidates[0]==='y/pic.png'));
});
await test('Preview: merge collisions and lost heading/block targets',()=>{
  const f=fixture();f.put('A.md','# Same\na ^id');f.put('B.md','# Same\nb ^id');f.put('Ref.md','[[A#Same]]\n[[B#^id]]');
  const r=preview(f.vault,{action:'merge',sources:['A.md','B.md'],target:'B.md',candidateContent:'# New\nx'});
  assert(r.findings.some(x=>x.type==='merge_duplicate_blocks'));assert(r.impacts.some(x=>x.anchorInMergedCandidate?.length===0));
});
await test('Preview: Canvas file/text nodes and Bases uncertainty',()=>{
  const f=fixture();f.put('A.md','A');f.put('Map.canvas',JSON.stringify({nodes:[{id:'1',type:'file',file:'A.md'},{id:'2',type:'text',text:'[[A]]'}]}));f.put('View.base','filters: file.name == "A"');
  const r=preview(f.vault,{action:'rename',source:'A.md',target:'B.md'});
  assert(r.impacts.some(x=>x.kind==='canvas_file'));assert(r.impacts.some(x=>x.node==='2'));assert(r.uncertainties.some(x=>x.path==='View.base'));
});
await test('Prepare: preserves UTF-8 BOM, CRLF, unknown YAML and block ID',()=>{
  const f=fixture();const old='\uFEFF---\r\ncustom: keep\r\n---\r\n旧句\r\n段 ^id\r\n';f.put('A.md',old);
  const p=edit(f,[{path:'A.md',replace:[{old:'旧句\n',new:'新句\n'}]}]);
  assert.equal(Buffer.from(p.writes[0].after,'base64').toString(),old.replace('旧句','新句'));assert.equal(f.get('A.md'),old);
});
await test('Prepare: refuses nonunique patches, traversal and non-UTF8',()=>{
  const f=fixture();f.put('A.md','same same');assert.throws(()=>edit(f,[{path:'A.md',replace:[{old:'same',new:'new'}]}]),{code:'nonunique_patch'});
  assert.throws(()=>edit(f,[{path:'../outside.md',create:'x'}]),{code:'invalid_path'});
  f.put('Bad.md',Buffer.from([0xff,0xfe]));assert.throws(()=>edit(f,[{path:'Bad.md',replace:[{old:'x',new:'y'}]}]),{code:'unsupported_encoding'});
});
await test('Apply: success, readback, operation replay is a no-op',async()=>{
  const f=fixture();f.put('A.md','old');const p=edit(f,[{path:'A.md',replace:[{old:'old',new:'new'}]}]);
  assert.equal((await save.execute(f.app,p,f.state)).outcome,'completed');assert.equal((await save.execute(f.app,p,f.state)).outcome,'completed');assert.equal(f.calls['A.md'],1);assert.equal(f.get('A.md'),'new');
});
await test('Apply: stale baseline preserves concurrent edit',async()=>{
  const f=fixture();f.put('A.md','old');const p=edit(f,[{path:'A.md',replace:[{old:'old',new:'new'}]}]);f.put('A.md','human');
  assert.equal((await save.execute(f.app,p,f.state)).outcome,'stopped');assert.equal(f.get('A.md'),'human');assert.equal(f.calls['A.md'],undefined);
});
await test('Apply: race immediately before callback is rejected inside process',async()=>{
  const f=fixture();f.put('A.md','old');const p=edit(f,[{path:'A.md',replace:[{old:'old',new:'new'}]}]);f.setHook((phase)=>{if(phase==='before')f.put('A.md','race');});
  assert.notEqual((await save.execute(f.app,p,f.state)).outcome,'completed');assert.equal(f.get('A.md'),'race');
});
await test('Apply: unsaved editor content blocks a write',async()=>{
  const f=fixture();f.put('A.md','old');const p=edit(f,[{path:'A.md',replace:[{old:'old',new:'new'}]}]);f.app.workspace.getLeavesOfType=()=>[{view:{file:{path:'A.md'},editor:{getValue:()=> 'unsaved'}}}];
  assert.equal((await save.execute(f.app,p,f.state)).outcome,'stopped');assert.equal(f.get('A.md'),'old');
});
await test('Apply: partial success resumes only uncompleted targets',async()=>{
  const f=fixture();f.put('A.md','old');f.put('B.md','old');const p=edit(f,['A.md','B.md'].map(path=>({path,replace:[{old:'old',new:'new'}]})));
  f.setHook((phase,name)=>{if(phase==='before'&&name==='B.md')throw Error('failure');});
  assert.equal((await save.execute(f.app,p,f.state)).outcome,'partial');assert.equal(f.get('A.md'),'new');assert.equal(f.get('B.md'),'old');
  f.setHook(null);assert.equal((await save.execute(f.app,p,f.state)).outcome,'completed');assert.equal(f.calls['A.md'],1);
});
await test('Apply: transport error after write is resolved by readback',async()=>{
  const f=fixture();f.put('A.md','old');const p=edit(f,[{path:'A.md',replace:[{old:'old',new:'new'}]}]);f.setHook(phase=>{if(phase==='after')throw Error('lost response');});
  assert.equal((await save.execute(f.app,p,f.state)).outcome,'completed');assert.equal(f.get('A.md'),'new');
});
await test('Recovery: interrupted receipt with desired bytes is not replayed',async()=>{
  const f=fixture();f.put('A.md','old');const p=edit(f,[{path:'A.md',replace:[{old:'old',new:'new'}]}]);await save.execute(f.app,p,f.state);
  const file=receipt(f,p),j=JSON.parse(fs.readFileSync(file));j.steps[0].state='writing';io.atomicJson(file,j);
  assert.equal((await save.execute(f.app,p,f.state)).outcome,'completed');assert.equal(f.calls['A.md'],1);
});
await test('Recovery: unknown receipt with old bytes is not blindly replayed',async()=>{
  const f=fixture();f.put('A.md','old');const p=edit(f,[{path:'A.md',replace:[{old:'old',new:'new'}]}]);await save.execute(f.app,p,f.state);
  const file=receipt(f,p),j=JSON.parse(fs.readFileSync(file));j.steps[0].state='writing';io.atomicJson(file,j);f.put('A.md','old');
  const r=await save.execute(f.app,p,f.state);assert.equal(r.outcome,'stopped');assert.equal(r.files[0].state,'write_uncertain');assert.equal(f.calls['A.md'],1);
});
await test('Recovery: completed operation never overwrites later edits',async()=>{
  const f=fixture();f.put('A.md','old');const p=edit(f,[{path:'A.md',replace:[{old:'old',new:'new'}]}]);await save.execute(f.app,p,f.state);f.put('A.md','human');
  assert.equal((await save.execute(f.app,p,f.state)).files[0].state,'changed_after_commit');assert.equal(f.get('A.md'),'human');
});
await test('Restore: selected file only, repeat safe, original operation not replayed',async()=>{
  const f=fixture();f.put('A.md','old');f.put('B.md','old');const p=edit(f,['A.md','B.md'].map(path=>({path,replace:[{old:'old',new:'new'}]})));await save.execute(f.app,p,f.state);
  assert.equal((await save.execute(f.app,p,f.state,{restorePaths:['A.md']})).outcome,'completed');assert.equal(f.get('A.md'),'old');assert.equal(f.get('B.md'),'new');
  await save.execute(f.app,p,f.state,{restorePaths:['A.md']});assert.equal(f.calls['A.md'],2);assert.notEqual((await save.execute(f.app,p,f.state)).outcome,'completed');assert.equal(f.get('A.md'),'old');
});
await test('Restore: does not overwrite human changes or delete a created note',async()=>{
  const f=fixture();f.put('A.md','old');const p=edit(f,[{path:'A.md',replace:[{old:'old',new:'new'}]},{path:'B.md',create:'created'}]);await save.execute(f.app,p,f.state);f.put('A.md','human');
  assert.notEqual((await save.execute(f.app,p,f.state,{restorePaths:['A.md']})).outcome,'completed');assert.equal(f.get('A.md'),'human');
  assert.notEqual((await save.execute(f.app,p,f.state,{restorePaths:['B.md']})).outcome,'completed');assert.equal(f.get('B.md'),'created');
});
await test('Create: rejects a file appearing after preparation',async()=>{
  const f=fixture();const p=edit(f,[{path:'A.md',create:'new'}]);f.put('A.md','human');assert.equal((await save.execute(f.app,p,f.state)).outcome,'stopped');assert.equal(f.get('A.md'),'human');
});
await test('Restore: an externally achieved desired state is not owned by this operation',async()=>{
  const f=fixture();f.put('A.md','old');const p=edit(f,[{path:'A.md',replace:[{old:'old',new:'new'}]}]);f.put('A.md','new');
  assert.equal((await save.execute(f.app,p,f.state)).outcome,'completed');assert.equal(f.calls['A.md'],undefined);
  assert.notEqual((await save.execute(f.app,p,f.state,{restorePaths:['A.md']})).outcome,'completed');assert.equal(f.get('A.md'),'new');
});
await test('Boundary: linked directory cannot redirect a prepared write outside the vault',()=>{
  const f=fixture();const outside=path.join(f.folder,'outside');fs.mkdirSync(outside);fs.writeFileSync(path.join(outside,'A.md'),'private');
  fs.symlinkSync(outside,path.join(f.vault,'linked'),process.platform==='win32'?'junction':'dir');
  assert.throws(()=>edit(f,[{path:'linked/A.md',replace:[{old:'private',new:'oops'}]}]),{code:'linked_path'});assert.equal(fs.readFileSync(path.join(outside,'A.md'),'utf8'),'private');
});
await test('Identity: operation id cannot be reused for different contents',async()=>{
  const f=fixture();f.put('A.md','old');const p=edit(f,[{path:'A.md',replace:[{old:'old',new:'new'}]}]);await save.execute(f.app,p,f.state);
  const q=edit(f,[{path:'A.md',replace:[{old:'new',new:'other'}]}]);q.id=p.id;await assert.rejects(save.execute(f.app,q,f.state),{code:'operation_id_reused'});
});
await test('Boundaries: wrong vault, in-vault state and a live writer lock are rejected',async()=>{
  const f=fixture(),other=fixture();f.put('A.md','old');const p=edit(f,[{path:'A.md',replace:[{old:'old',new:'new'}]}]);
  await assert.rejects(save.execute(other.app,p,f.state),{code:'wrong_vault'});assert.throws(()=>save.status(p,f.vault),{code:'state_inside_vault'});
  const folder=path.dirname(receipt(f,p));fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'writer.lock'),JSON.stringify({pid:process.pid,host:os.hostname(),nonce:'live'}));
  await assert.rejects(save.execute(f.app,p,f.state),{code:'locked'});assert.equal(f.get('A.md'),'old');
});
await test('CLI: readonly preview produces parseable output without modifying vault',()=>{
  const f=fixture();f.put('A.md','old');f.put('Ref.md','[[A]]');const request=path.join(f.folder,'request.json');fs.writeFileSync(request,JSON.stringify({action:'rename',source:'A.md',target:'B.md'}));
  const r=spawnSync(process.execPath,[path.join(__dirname,'notes_tool.cjs'),'preview','--vault',f.vault,'--request',request],{encoding:'utf8'});
  assert.equal(r.status,0,r.stdout+r.stderr);assert.equal(JSON.parse(r.stdout).mode,'read_only');assert.equal(f.get('A.md'),'old');assert(!fs.existsSync(path.join(f.vault,'B.md')));
});
const report={runtime:process.version,fixtureRoot:base,adapter:'filesystem test double for Vault.process/create; not a live Obsidian vault test',passed:results.filter(x=>x.passed).length,total:results.length,results};
console.log(JSON.stringify(report,null,2));process.exitCode=report.passed===report.total?0:1;
})().catch(e=>{console.error(e);process.exitCode=1;});
