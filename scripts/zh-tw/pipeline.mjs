// Shared conversion pipeline: protect() -> OpenCC (cn -> tw2) ->
// applyVocab() -> restore(), plus the percent-encoded-segment pass.
// Used by convert.mjs (build the edition) and check.mjs (idempotence
// gate). Requires opencc-cli on PATH or OPENCC=/path/to/opencc-cli.
import { execFileSync } from 'node:child_process';
import { protect, restore, applyVocab, applyPostVocab } from './vocab.mjs';

const OCC = process.env.OPENCC || 'opencc-cli';

const occ = (text) => execFileSync(OCC, ['-f', 'cn', '-t', 'tw2'], {
  input: text, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
});

// One full pipeline pass over a plain (decoded) string.
export const convertText = (t) => applyPostVocab(restore(applyVocab(occ(protect(t)))));

// Percent-encoded pass: shields.io badges in README.md and the doc links
// in index.html carry Chinese as %XX sequences, which OpenCC cannot see.
// Decode each run, convert it if it contains CJK, and re-encode only the
// non-ASCII characters (ASCII bytes stay exactly as decoded).
const ENC_RUN = /(?:%[0-9A-Fa-f]{2}){2,}/g;
export const convertEncoded = (t) => t.replace(ENC_RUN, (run) => {
  let dec;
  try { dec = decodeURIComponent(run); } catch { return run; }
  if (!/[\u4e00-\u9fff]/.test(dec)) return run;
  const out = convertText(dec);
  if (out === dec) return run;
  return [...out].map((ch) => (ch.charCodeAt(0) > 127 ? encodeURIComponent(ch) : ch)).join('');
});

export const convertFileText = (t) => convertEncoded(convertText(t));
