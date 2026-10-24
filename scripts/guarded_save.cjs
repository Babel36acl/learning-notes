'use strict';
const io = require('./note_io.cjs');
const os = require('node:os');
const { fs, path, fail, sha } = io;
function prepare(vault, request) {
  const root = io.vaultRoot(vault);
  if (!Array.isArray(request.edits) || !request.edits.length) fail('invalid_request','edits must be a nonempty array');
  const writes = [], seen = new Set();
  for (const edit of request.edits) {
    const rel = io.relative(edit.path), key = rel.toLocaleLowerCase();
    if (!rel.endsWith('.md') || seen.has(key)) fail('invalid_target','Only unique Markdown targets are supported');
    seen.add(key);
    const before = io.readBytes(root,rel); let value;
    if (Object.hasOwn(edit,'create')) {
      if (before !== null) fail('already_exists',rel);
      if (typeof edit.create !== 'string') fail('invalid_request','create must contain text');
      value = edit.create;
    } else {
      if (before === null) fail('missing_target',rel);
      value = io.text(before);
      if (!Array.isArray(edit.replace) || !edit.replace.length) fail('invalid_request','Existing notes require explicit replace pairs');
      const crlf = value.includes('\r\n') && !value.replace(/\r\n/g,'').includes('\n');
      for (const patch of edit.replace) {
        if (typeof patch.old !== 'string' || !patch.old || typeof patch.new !== 'string') fail('invalid_patch','old must be nonempty text; new must be text');
        const adapt = s => crlf ? s.replace(/\r?\n/g,'\r\n') : s;
        const old = adapt(patch.old), next = adapt(patch.new);
        const index = value.indexOf(old);
        if (index < 0 || value.indexOf(old,index+old.length) >= 0) fail('nonunique_patch',rel+': old text must match exactly once');
        value = value.slice(0,index)+next+value.slice(index+old.length);
      }
    }
    const after = Buffer.from(value,'utf8');
    writes.push({path:rel,before:before===null?null:before.toString('base64'),after:after.toString('base64'),expectedSha256:sha(before),afterSha256:sha(after)});
  }
  return {schema:'learning-notes-save/v1',id:io.crypto.randomUUID(),vault:root,createdAt:new Date().toISOString(),review:request.edits,writes};
}
function validatePlan(plan) {
  if (!plan || plan.schema !== 'learning-notes-save/v1' || !/^[A-Za-z0-9_-]{8,80}$/.test(plan.id)) fail('invalid_plan','Unknown plan schema or invalid operation id');
  const root = io.vaultRoot(plan.vault), seen = new Set();
  if (!Array.isArray(plan.writes) || !plan.writes.length) fail('invalid_plan','No writes');
  for (const w of plan.writes) {
    io.target(root,w.path); const key = w.path.toLocaleLowerCase();
    if (!w.path.endsWith('.md') || seen.has(key)) fail('invalid_plan','Only unique Markdown targets are supported');
    seen.add(key);
    for (const [field,hashField] of [['before','expectedSha256'],['after','afterSha256']]) {
      if (field==='before' && w[field]===null) { if (w[hashField]!==null) fail('invalid_plan','Invalid absent baseline'); continue; }
      if (typeof w[field]!=='string') fail('invalid_plan','Missing content');
      const bytes = Buffer.from(w[field],'base64');
      if (bytes.toString('base64')!==w[field] || sha(bytes)!==w[hashField]) fail('invalid_plan','Content digest mismatch');
      io.text(bytes);
    }
  }
  return root;
}
function location(plan,stateDir) {
  const root = validatePlan(plan), state = io.externalDir(root,stateDir);
  if (io.inside(path.resolve(__dirname,'..'),state)) fail('state_inside_skill','Runtime receipts must stay outside the installed skill');
  const folder = path.join(state,sha(Buffer.from(root)).slice(0,24));
  io.externalDir(root,folder);
  if (fs.existsSync(folder) && fs.lstatSync(folder).isSymbolicLink()) fail('invalid_state','Linked receipt directory');
  return {root,folder,file:path.join(folder,plan.id+'.json'),lock:path.join(folder,'writer.lock'),fingerprint:sha(Buffer.from(io.canonical(plan)))};
}
function loadJournal(loc,plan) {
  if (!fs.existsSync(loc.file)) return null;
  if (fs.lstatSync(loc.file).isSymbolicLink()) fail('invalid_state','Linked receipt');
  const j = JSON.parse(fs.readFileSync(loc.file,'utf8'));
  if (j.fingerprint !== loc.fingerprint || io.canonical(j.plan)!==io.canonical(plan)) fail('operation_id_reused','This operation id already belongs to a different plan');
  if (!Array.isArray(j.steps) || j.steps.length!==plan.writes.length || j.steps.some((s,i)=>s.path!==plan.writes[i].path)) fail('invalid_state','Receipt steps differ from plan');
  return j;
}
function current(root,w) { return sha(io.readBytes(root,w.path)); }
function observation(w,step,hash) {
  if (step?.state==='rolled_back') return hash===w.expectedSha256?'rolled_back':'changed_after_rollback';
  if (step?.state==='completed' || step?.state==='already_matches') return hash===w.afterSha256?'completed':'changed_after_commit';
  if (step?.state==='restoring') return hash===w.expectedSha256?'rollback_readback':hash===w.afterSha256?'rollback_uncertain':'conflict';
  if (hash===w.afterSha256) return 'desired_state_present';
  if (step?.state==='writing' || step?.state==='uncertain') return hash===w.expectedSha256?'write_uncertain':'conflict';
  return hash===w.expectedSha256?'ready':'conflict';
}
function status(plan,stateDir) {
  const loc = location(plan,stateDir), journal = loadJournal(loc,plan);
  return {schema:'learning-notes-save-result/v1',id:plan.id,mode:'read_only',receipt:journal?loc.file:null,lockPresent:fs.existsSync(loc.lock),files:plan.writes.map((w,i)=>{ const hash=current(loc.root,w); return {path:w.path,recorded:journal?.steps[i]?.state||'not_started',currentSha256:hash,state:observation(w,journal?.steps[i],hash)}; })};
}
function lock(loc) {
  fs.mkdirSync(loc.folder,{recursive:true});
  const owner = {pid:process.pid,host:os.hostname(),nonce:io.crypto.randomUUID()};
  try { fs.writeFileSync(loc.lock,JSON.stringify(owner),{flag:'wx',mode:0o600}); }
  catch (e) {
    if (e.code !== 'EEXIST') throw e;
    if (fs.lstatSync(loc.lock).isSymbolicLink()) fail('invalid_state','Linked writer lock');
    // A live or foreign-host owner is never displaced. A dead local process cannot still write.
    let old; try { old=JSON.parse(fs.readFileSync(loc.lock,'utf8')); } catch { fail('locked','Unreadable writer lock; inspect state before recovery'); }
    let dead=false;
    if (old.host===os.hostname() && Number.isInteger(old.pid) && old.pid>0) { try { process.kill(old.pid,0); } catch (p) { dead=p.code==='ESRCH'; } }
    if (!dead) fail('locked','Another writer owns this state directory');
    if (fs.readFileSync(loc.lock,'utf8')!==JSON.stringify(old)) fail('locked','Writer lock changed');
    fs.unlinkSync(loc.lock);
    try { fs.writeFileSync(loc.lock,JSON.stringify(owner),{flag:'wx',mode:0o600}); } catch { fail('locked','Writer lock was reacquired'); }
  }
  return () => { try { const value=JSON.parse(fs.readFileSync(loc.lock,'utf8')); if (value.nonce===owner.nonce) fs.unlinkSync(loc.lock); } catch { /* Never delete a lock whose identity is unknown. */ } };
}
function ensureApp(app,root) {
  if (!app?.vault?.adapter?.getBasePath || typeof app.vault.process!=='function' || typeof app.vault.create!=='function') fail('unsupported','A running desktop Obsidian Vault API is required');
  if (io.vaultRoot(app.vault.adapter.getBasePath())!==root) fail('wrong_vault','The running Obsidian vault differs from the plan');
}
function ensureEditor(app,rel,data) {
  for (const leaf of app.workspace?.getLeavesOfType?.('markdown') || []) {
    const v=leaf.view;
    const editorText=v?.editor?.getValue?.();
    const normalized=s=>s.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
    if (v?.file?.path===rel && typeof editorText==='string' && normalized(editorText)!==normalized(data)) fail('unsaved_editor_conflict',rel);
  }
}
async function writeOne(app,root,w,reverse=false) {
  io.target(root,w.path);
  const desired = reverse?w.before:w.after, expected = reverse?w.afterSha256:w.expectedSha256;
  if (desired===null) fail('unsupported','Removing a newly created note is not provided by this interface');
  const next=io.text(Buffer.from(desired,'base64'));
  if (expected===null) {
    if (current(root,w)!==null || app.vault.getAbstractFileByPath(w.path)) fail('conflict',w.path);
    await app.vault.create(w.path,next);
  } else {
    const file=app.vault.getAbstractFileByPath(w.path);
    if (!file || file.children || file.path!==w.path) fail('unavailable','Target is not indexed as a file: '+w.path);
    await app.vault.process(file,data=>{
      io.target(root,w.path);
      if (file.path!==w.path || sha(Buffer.from(data,'utf8'))!==expected) fail('conflict',w.path);
      ensureEditor(app,w.path,data);
      return next;
    });
  }
}
async function execute(app,plan,stateDir,{restorePaths}={}) {
  const loc=location(plan,stateDir); ensureApp(app,loc.root);
  const restore=restorePaths!==undefined;
  if (restore && (!Array.isArray(restorePaths)||!restorePaths.length||restorePaths.some(p=>!plan.writes.some(w=>w.path===p)))) fail('invalid_restore','Select explicit paths from the original plan');
  const unlock=lock(loc);
  try {
    let journal=loadJournal(loc,plan);
    if (restore && !journal) fail('missing_receipt','No recorded operation to restore');
    if (!journal) journal={schema:'learning-notes-receipt/v1',fingerprint:loc.fingerprint,plan,steps:plan.writes.map(w=>({path:w.path,state:'pending'}))};
    const persist=()=>{journal.updatedAt=new Date().toISOString();io.atomicJson(loc.file,journal);};
    persist(); let stopped=false;
    for (let i=0;i<plan.writes.length;i++) {
      const w=plan.writes[i],step=journal.steps[i];
      if (restore && !restorePaths.includes(w.path)) continue;
      const observed=current(loc.root,w), state=observation(w,step,observed);
      step.observedSha256=observed;
      if (restore) {
        if (state==='rolled_back' || state==='rollback_readback') {step.state='rolled_back';persist();continue;}
        if (w.before===null) {step.lastError='Restoring a created note would delete it; unsupported';stopped=true;persist();break;}
        if (!['completed','desired_state_present'].includes(state) || !['completed','writing'].includes(step.state)) {step.lastError='Current file is not a confirmed restorable result: '+state;stopped=true;persist();break;}
        step.state='restoring';persist();
      } else {
        if (state==='completed') continue;
        if (['changed_after_commit','rolled_back','changed_after_rollback','rollback_readback','rollback_uncertain'].includes(state)) {step.lastError=state;stopped=true;persist();break;}
        if (state==='desired_state_present') {step.state=step.state==='writing'?'completed':'already_matches';persist();continue;}
        if (state==='write_uncertain') {step.state='uncertain';step.lastError='Previous write outcome is unknown; inspect before making a new plan';stopped=true;persist();break;}
        if (state!=='ready') {step.state='conflict';step.lastError='Baseline changed';stopped=true;persist();break;}
        step.state='writing';persist();
      }
      try {
        await writeOne(app,loc.root,w,restore);
        const expected=restore?w.expectedSha256:w.afterSha256;
        if (current(loc.root,w)!==expected) fail('write_uncertain','Readback differs from the requested content');
        step.state=restore?'rolled_back':'completed';delete step.lastError;persist();
      } catch(e) {
        let observedAfter;
        try {observedAfter=current(loc.root,w);} catch {observedAfter=undefined;}
        const desired=restore?w.expectedSha256:w.afterSha256;
        if (observedAfter===desired) {step.state=restore?'rolled_back':'completed';step.transportError=e.code||e.message;persist();continue;}
        step.state=restore?'restoring':(observedAfter===w.expectedSha256?'failed':'uncertain');
        step.lastError=e.code||e.message;stopped=true;persist();break;
      }
    }
    const observed=status(plan,stateDir);
    const selected=restore?observed.files.filter(f=>restorePaths.includes(f.path)):observed.files;
    const ok=selected.every(f=>f.state===(restore?'rolled_back':'completed'));
    return {...observed,lockPresent:undefined,lockHeldDuringExecution:observed.lockPresent,mode:restore?'restore':'apply',outcome:ok?'completed':selected.some(f=>['completed','rolled_back'].includes(f.state))?'partial':stopped?'stopped':'uncertain',protection:'Expected content checked inside Obsidian Vault.process; receipts serialize this interface only. External programs, sync clients and other hosts are not a distributed transaction.'};
  } finally {unlock();}
}
async function dispatch(app,request) {
  try {
    if (!request || !['apply','restore'].includes(request.command)) fail('invalid_command','Unknown mutation command');
    return await execute(app,request.plan,request.stateDir,request.command==='restore'?{restorePaths:request.paths}:{});
  } catch(e) {return {outcome:'failed',error:{code:e.code||'failed',message:e.message}};}
}
module.exports={prepare,validatePlan,status,execute,dispatch};
