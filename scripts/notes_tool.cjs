#!/usr/bin/env node
'use strict';
const io=require('./note_io.cjs');
const {preview}=require('./impact_preview.cjs');
const save=require('./guarded_save.cjs');
const {spawnSync}=require('node:child_process');
const {fs,path,fail}=io;
function readJson(file) {return JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}
function output(result,out,vault) {
  if (out) {
    if (!path.isAbsolute(out)) fail('invalid_output','Output must be absolute');
    if (vault) io.externalDir(io.vaultRoot(vault),path.dirname(out));
    fs.mkdirSync(path.dirname(out),{recursive:true});
    fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{encoding:'utf8',flag:'wx',mode:0o600});
    console.log(JSON.stringify({outcome:'saved',output:out}));
  } else console.log(JSON.stringify(result,null,2));
}
async function main() {
  const [command,...rest]=process.argv.slice(2), args={};
  for(let i=0;i<rest.length;i+=2) {if(!rest[i].startsWith('--') || rest[i+1]===undefined)fail('arguments','Expected --name value');args[rest[i].slice(2)]=rest[i+1];}
  if(!command || command==='help') {
    console.log('preview --vault ABS --request JSON [--out ABS]\nprepare --vault ABS --request JSON --out ABS\nstatus --plan JSON --state-dir ABS [--out ABS]\napply --plan JSON --state-dir ABS --obsidian CLI --vault-name EXACT [--out ABS]\nrestore --plan JSON --state-dir ABS --paths JSON_ARRAY --obsidian CLI --vault-name EXACT [--out ABS]\nNo command renames, merges or deletes notes. apply/restore require a running desktop Obsidian; unsupported hosts can preview/prepare/status.');return;
  }
  if(command==='preview') return output(preview(args.vault,readJson(args.request)),args.out,args.vault);
  if(command==='prepare') {if(!args.out)fail('arguments','prepare requires --out outside the vault');return output(save.prepare(args.vault,readJson(args.request)),args.out,args.vault);}
  const plan=readJson(args.plan);
  if(args.out){if(!path.isAbsolute(args.out))fail('invalid_output','Output must be absolute');io.externalDir(io.vaultRoot(plan.vault),path.dirname(args.out));if(fs.existsSync(args.out))fail('output_exists','Choose a new output filename before writing notes');}
  if(command==='status')return output(save.status(plan,args['state-dir']),args.out,plan.vault);
  if(!['apply','restore'].includes(command))fail('arguments','Unknown command');
  if(!args.obsidian || !args['vault-name'])fail('arguments','Specify --obsidian and --vault-name; the plan vault path is checked again inside the app');
  save.validatePlan(plan);
  const state=io.externalDir(io.vaultRoot(plan.vault),args['state-dir']);
  fs.mkdirSync(state,{recursive:true});
  const request={command,plan,stateDir:state};
  if(command==='restore')request.paths=JSON.parse(args.paths||'null');
  const payload=path.join(state,'request-'+io.crypto.randomUUID()+'.json');
  fs.writeFileSync(payload,JSON.stringify(request),{flag:'wx',mode:0o600});
  const runtime=path.join(__dirname,'guarded_save.cjs');
  const code=`(async()=>{const p=${JSON.stringify(runtime)};delete require.cache[require.resolve(p)];return 'LN_RESULT:'+JSON.stringify(await require(p).dispatch(app,JSON.parse(require('node:fs').readFileSync(${JSON.stringify(payload)},'utf8'))));})()`;
  const child=spawnSync(args.obsidian,['vault='+args['vault-name'],'eval','code='+code],{encoding:'utf8',shell:false,timeout:90000,maxBuffer:8*1024*1024,windowsHide:true});
  // Never retry an uncertain transport or fall back to raw filesystem mutation.
  if(child.error || child.status!==0) {process.exitCode=3;return output({outcome:child.error?.code==='ENOENT'?'unavailable':'write_uncertain',error:child.error?.code||'client_failed',detail:(child.stderr||'').slice(0,1500),next:'Run status with the same plan and state directory; do not repeat or restore blindly'},args.out,plan.vault);}
  const marker=child.stdout.lastIndexOf('LN_RESULT:');
  if(marker<0) {process.exitCode=3;return output({outcome:'write_uncertain',next:'No structured receipt from client. Run status first.'},args.out,plan.vault);}
  let result;try{result=JSON.parse(child.stdout.slice(marker+10).trim());}catch{process.exitCode=3;return output({outcome:'write_uncertain',next:'Unparseable client receipt. Run status first.'},args.out,plan.vault);}
  output(result,args.out,plan.vault);
  if(result.outcome!=='completed')process.exitCode=3;
}
main().catch(e=>{console.log(JSON.stringify({outcome:'failed',error:{code:e.code||'failed',message:e.message}}));process.exitCode=2;});
