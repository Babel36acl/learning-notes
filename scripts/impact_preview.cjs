'use strict';
const io = require('./note_io.cjs');
const { path, fail } = io;
function mask(text) {
  let fence = null;
  return text.split(/(?<=\n)/).map(line => {
    const m = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) { if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null; return line.replace(/[^\r\n]/g, ' '); }
    if (m) { fence = m[1]; return line.replace(/[^\r\n]/g, ' '); }
    return line;
  }).join('').replace(/<!--[\s\S]*?(?:-->|$)/g, s => s.replace(/[^\r\n]/g, ' ')).replace(/(`+)[^\r\n]*?\1/g, s => ' '.repeat(s.length));
}
function references(text) {
  const clean = mask(text), result = [];
  function add(kind, value, index) {
    if ((clean.slice(0,index).match(/\\+$/)?.[0].length || 0) % 2) return;
    result.push({ kind, link: value, line: clean.slice(0,index).split('\n').length });
  }
  for (const m of clean.matchAll(/(!?)\[\[([^\]\r\n]+)\]\]/g)) add(m[1] ? 'wiki_embed' : 'wiki_link', m[2].split('|')[0], m.index);
  for (const m of clean.matchAll(/(!?)\[[^\]\r\n]*\]\(/g)) {
    let end = m.index + m[0].length, depth = 1, angle = false;
    for (; end < clean.length; end++) {
      const c = clean[end];
      if (c === '\\') { end++; continue; }
      if (c === '<') angle = true;
      if (c === '>') angle = false;
      if (!angle && c === '(') depth++;
      if (!angle && c === ')' && --depth === 0) break;
    }
    if (depth) continue;
    const raw = clean.slice(m.index+m[0].length,end).trim();
    const dest = raw.startsWith('<') ? raw.slice(1,raw.indexOf('>')) : raw.split(/\s+["']/)[0].trim();
    add(m[1] ? 'markdown_embed' : 'markdown_link', dest, m.index);
  }
  for (const m of clean.matchAll(/^ {0,3}\[[^\]\r\n]+\]:[ \t]*(<[^>]+>|\S+)/gm)) add('reference_definition', m[1].replace(/^<|>$/g,''), m.index);
  return result;
}
function anchors(text) {
  const clean = mask(text), headings = [], blocks = [];
  clean.split(/\r?\n/).forEach((line,i) => {
    const h = line.match(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/); if (h) headings.push({ value:h[1], line:i+1 });
    const b = line.match(/(?:^|\s)\^([A-Za-z0-9-]+)\s*$/); if (b) blocks.push({ value:b[1], line:i+1 });
  });
  return { headings, blocks };
}
function decode(s) { try { return decodeURIComponent(s); } catch { return s; } }
function resolve(link, source, files, kind) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith('//')) return { external:true, candidates:[] };
  const split = link.indexOf('#'); const raw = split < 0 ? link : link.slice(0,split);
  const anchor = split < 0 ? '' : decode(link.slice(split+1));
  const name = decode(raw).replace(/\\([ ()])/g,'$1');
  if (!name) return { candidates:[source], anchor };
  const isWiki = kind.startsWith('wiki'); const options = new Set();
  const add = s => { const p = path.posix.normalize(s).replace(/^\//,''); if (!p.startsWith('../')) { options.add(p); if (!path.posix.extname(p)) options.add(p+'.md'); } };
  if (name.startsWith('/')) add(name);
  else if (!isWiki || name.startsWith('.')) add(path.posix.join(path.posix.dirname(source),name));
  else {
    add(name); add(path.posix.join(path.posix.dirname(source),name));
    if (!name.includes('/')) for (const f of files) if (path.posix.basename(f) === name || path.posix.basename(f) === name+'.md') options.add(f);
  }
  const candidates = files.filter(f => options.has(f));
  return { candidates, anchor, unresolved: candidates.length === 0, ambiguous: candidates.length > 1 };
}
function preview(vault, request) {
  const root = io.vaultRoot(vault), inv = io.inventory(root), files = inv.files;
  if (!request || !['rename','merge'].includes(request.action)) fail('invalid_request','action must be rename or merge');
  const sourceList = request.action === 'rename' ? [request.source] : request.sources;
  if (!Array.isArray(sourceList) || !sourceList.length) fail('invalid_request','sources are required');
  const sources = [...new Set(sourceList.map(io.relative))], target = io.relative(request.target);
  if (request.action === 'rename' && sources[0] === target) fail('noop','Source and target are identical');
  for (const s of sources) if (!files.includes(s)) fail('missing_source',s);
  io.target(root,target,{missingParents:true});
  const retired = new Set(sources.filter(s => s !== target));
  const afterFiles = [...new Set(files.filter(f => !retired.has(f)).concat(target))];
  const findings = [], impacts = [], attachments = [], unknown = [], notes = new Map(), allRefs = [], scannedVersions=[];
  const collisions = files.filter(f => f !== sources[0] && f.toLocaleLowerCase() === target.toLocaleLowerCase());
  if (request.action === 'rename' && collisions.length) findings.push({ type:'target_conflict',paths:collisions });
  const sameName = files.filter(f => !sources.includes(f) && path.posix.basename(f).toLocaleLowerCase() === path.posix.basename(target).toLocaleLowerCase());
  if (sameName.length) findings.push({ type:'same_basename',paths:sameName });
  for (const file of files) {
    if (!/\.(md|canvas|base)$/i.test(file)) continue;
    try {
      const raw = io.text(io.readBytes(root,file));
      scannedVersions.push({path:file,sha256:io.sha(Buffer.from(raw))});
      if (file.endsWith('.md')) {
        notes.set(file,{text:raw,anchors:anchors(raw),sha256:io.sha(Buffer.from(raw))});
        allRefs.push(...references(raw).map(r=>({...r,source:file})));
        if (/^---\r?\n/.test(raw)) unknown.push({path:file,reason:'Plain YAML path values are not fully interpreted; wikilinks are scanned'});
        if (/<(?:a|img|iframe)\b/i.test(raw) || /```(?:dataview|dataviewjs|query)/i.test(raw)) unknown.push({path:file,reason:'HTML or computed query references require client/plugin review'});
      } else if (file.endsWith('.canvas')) {
        const canvas = JSON.parse(raw);
        for (const n of canvas.nodes || []) {
          if (n.type === 'file' && typeof n.file === 'string') allRefs.push({source:file,kind:'canvas_file',link:'/'+n.file+(n.subpath||''),node:n.id});
          if (n.type === 'text' && typeof n.text === 'string') allRefs.push(...references(n.text).map(r=>({...r,source:file,node:n.id})));
        }
      } else unknown.push({path:file,reason:'Bases filters/formulas may refer to paths; not interpreted'});
    } catch (e) { unknown.push({path:file,reason:e.code || e.message}); }
  }
  let proposedAnchors = null;
  if (request.action === 'merge') {
    if (typeof request.candidateContent === 'string') proposedAnchors = anchors(request.candidateContent);
    else unknown.push({path:target,reason:'No merged candidateContent; cannot verify preserved headings or blocks'});
    const combined = sources.concat(files.includes(target) && !sources.includes(target) ? [target] : []);
    for (const key of ['headings','blocks']) {
      const seen = new Map();
      for (const s of combined) for (const a of notes.get(s)?.anchors[key] || []) { const x = seen.get(a.value)||[]; x.push({path:s,line:a.line}); seen.set(a.value,x); }
      for (const [value,locations] of seen) if (locations.length>1) findings.push({type:'merge_duplicate_'+key,value,locations});
    }
    if (proposedAnchors) for (const key of ['headings','blocks']) {
      const values = proposedAnchors[key].map(a=>a.value);
      for (const value of new Set(values)) if (values.filter(v=>v===value).length>1) findings.push({type:'candidate_duplicate_'+key,value});
    }
  }
  for (const ref of allRefs) {
    const before = resolve(ref.link,ref.source,files,ref.kind);
    const isSource = sources.includes(ref.source);
    if (before.external) continue;
    const affectedDest = before.candidates.filter(f=>sources.includes(f) || (request.action==='merge' && f===target));
    const movedSource = request.action==='rename' && isSource ? target : ref.source;
    const after = resolve(ref.link,movedSource,afterFiles,ref.kind);
    const shifted = JSON.stringify(before.candidates) !== JSON.stringify(after.candidates);
    if (affectedDest.length || shifted || isSource) {
      const item = {...ref,before,afterWithoutLinkUpdate:after,reason:affectedDest.length?'references_changed_file':isSource?'outgoing_reference':'resolution_may_change'};
      if (before.anchor && affectedDest.some(f=>f.endsWith('.md'))) {
        const key = before.anchor.startsWith('^') ? 'blocks':'headings', value = before.anchor.replace(/^\^/,'');
        item.anchorBefore = affectedDest.map(f=>({path:f,matches:(notes.get(f)?.anchors[key]||[]).filter(a=>a.value===value)}));
        if (proposedAnchors) item.anchorInMergedCandidate = proposedAnchors[key].filter(a=>a.value===value);
        if (item.anchorBefore.some(a=>a.matches.length!==1)) item.anchorRequiresReview=true;
      }
      impacts.push(item);
      if (isSource) for (const dest of before.candidates) if (!dest.endsWith('.md')) attachments.push({from:ref.source,attachment:dest,kind:ref.kind,line:ref.line,action:'retain; this is a reference, not ownership or deletion authority'});
    }
  }
  for (const s of sources) if (!notes.has(s) && !s.endsWith('.md')) findings.push({type:'attachment_source',path:s});
  return {
    schema:'learning-notes-impact/v1',mode:'read_only',vault:root,generatedAt:new Date().toISOString(),request,scan:{visibleFiles:files.length,markdownFiles:notes.size,skipped:inv.skipped},scannedVersions,
    sourceVersions:sources.map(p=>({path:p,sha256:io.sha(io.readBytes(root,p))})),findings,impacts,attachments,uncertainties:unknown,
    limits:['Static candidate resolution is conservative, not Obsidian metadataCache equivalence. Ambiguous links require client verification.', 'After-state assumes source retirement and unchanged link text; no rename, merge or link update is executed.', 'Hidden/linked paths, external vaults, external applications, plugins, arbitrary YAML and complex Markdown constructs may add references.', 'Heading formatting, Setext headings and duplicate heading disambiguation require client review. A missing static match is not proof that the client anchor is broken.']
  };
}
module.exports={preview,references,anchors,resolve};
