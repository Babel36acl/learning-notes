'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const MAX_TEXT = 16 * 1024 * 1024;
function fail(code, message) { const e = new Error(message); e.code = code; throw e; }
function sha(bytes) { return bytes === null ? null : crypto.createHash('sha256').update(bytes).digest('hex'); }
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
function inside(root, target) { const r = path.relative(root, target); return r === '' || (!r.startsWith('..' + path.sep) && r !== '..' && !path.isAbsolute(r)); }
function vaultRoot(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) fail('invalid_vault', 'Vault must be an absolute path');
  const root = fs.realpathSync(value);
  if (!fs.statSync(root).isDirectory() || !fs.existsSync(path.join(root, '.obsidian'))) fail('invalid_vault', 'Expected an existing vault with .obsidian (a temporary test vault is valid)');
  return root;
}
function relative(value) {
  if (typeof value !== 'string' || !value || /[\\:\x00-\x1f]/.test(value) || value.startsWith('/')) fail('invalid_path', 'Use a vault-relative path with forward slashes');
  if (value.split('/').some(s => !s || s === '.' || s === '..' || s.startsWith('.') || /[<>"|?*]/.test(s) || /[. ]$/.test(s))) fail('invalid_path', 'Hidden, traversal, empty or nonportable path component');
  return value;
}
function target(root, rel, { missingParents = false } = {}) {
  relative(rel);
  const parts = rel.split('/'); let current = root;
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    let stat; try { stat = fs.lstatSync(current); } catch (e) { if(e.code!=='ENOENT') throw e; }
    if (stat) {
      if (stat.isSymbolicLink()) fail('linked_path', 'Linked paths are not supported: ' + rel);
      if (!inside(root, fs.realpathSync(current))) fail('outside_vault', rel);
      if (i < parts.length - 1 && !fs.statSync(current).isDirectory()) fail('invalid_parent', rel);
    } else if (i < parts.length - 1 && !missingParents) fail('missing_parent', rel);
  }
  return current;
}
function readBytes(root, rel) {
  const p = target(root, rel);
  if (!fs.existsSync(p)) return null;
  const s = fs.statSync(p);
  if (!s.isFile()) fail('not_file', rel);
  if (s.size > MAX_TEXT) fail('too_large', rel);
  return fs.readFileSync(p);
}
function text(bytes) { try { return decoder.decode(bytes); } catch { fail('unsupported_encoding', 'Expected valid UTF-8'); } }
function inventory(root) {
  const files = [], skipped = [];
  function walk(dir, prefix) {
    let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { skipped.push({ path: prefix, reason: e.code }); return; }
    for (const e of entries.sort((a,b) => a.name.localeCompare(b.name))) {
      const rel = prefix + e.name, full = path.join(dir, e.name);
      if (e.name.startsWith('.')) { skipped.push({ path: rel, reason: 'hidden' }); continue; }
      if (e.isSymbolicLink()) { skipped.push({ path: rel, reason: 'linked_path' }); continue; }
      if (e.isDirectory()) walk(full, rel + '/'); else if (e.isFile()) files.push(rel);
    }
  }
  walk(root, ''); return { files, skipped };
}
function externalDir(root, value) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) fail('invalid_state', 'State/output directory must be absolute');
  const full = path.resolve(value); let existing = full;
  while (!fs.existsSync(existing)) { const parent = path.dirname(existing); if (parent === existing) fail('invalid_state', value); existing = parent; }
  const resolved = path.join(fs.realpathSync(existing), path.relative(existing, full));
  if (inside(root, resolved)) fail('state_inside_vault', 'Plans, receipts and backups must stay outside the vault');
  return resolved;
}
function atomicJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.' + crypto.randomUUID() + '.tmp';
  const fd = fs.openSync(tmp, 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n', 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
}
module.exports = { fs, path, crypto, fail, sha, canonical, inside, vaultRoot, relative, target, readBytes, text, inventory, externalDir, atomicJson };
