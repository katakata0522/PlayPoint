import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [sourcePath, outputPath] = process.argv.slice(2);
assert.ok(sourcePath && outputPath, 'Usage: node build-staging.mjs <backed-up stg PHP> <output directory>');
const source = await fs.readFile(sourcePath, 'utf8');
assert.ok(source.includes('/home/hajikkoroom/playpoint-sim.com/public_html/stg.playpoint-sim.com/cms'), 'stg host/path guard');
const replacements = [
  ["function ppfn_shell_data() { return ppfn_data()['shell']; }", "function ppfn_shell_data() { return apply_filters('playpoint_stg_shell',ppfn_data()['shell']); }"],
  ["  return $content;\n}\nadd_action('init',function(){", "  return apply_filters('playpoint_stg_content',$content);\n}\nadd_action('init',function(){"],
  ["echo ppfn_data()['harness'];", "echo apply_filters('playpoint_stg_harness',ppfn_data()['harness']);"],
  ["echo ppfn_data()['article']['breadcrumb'];", "echo apply_filters('playpoint_stg_content',ppfn_data()['article']['breadcrumb']);"]
];
let candidate = source;
const applied=[];
for (const [before, after] of replacements) {
  if(candidate.split(before).length===1 && candidate.split(after).length===2)continue;
  assert.equal(candidate.split(before).length, 2, 'exact single integration point');
  candidate = candidate.replace(before, after);applied.push([before,after]);
}
let reversed = candidate;
for (const [before, after] of applied) reversed = reversed.replace(after, before);
assert.equal(reversed, source, 'no compressed payload, ads or design changes');
await fs.mkdir(outputPath, { recursive: true });
const files = {
  'playpoint-catalog-library.php': await fs.readFile(here + '/catalog.php'),
  'playpoint-catalog-staging.php': await fs.readFile(here + '/catalog-staging.php'),
  'playpoint-catalog-base.json': await fs.readFile(here + '/../../blog/articles.json'),
  'playpoint-ad-diagnostics.js': await fs.readFile(here + '/ad-diagnostics.js'),
  'playpoint-fest-candidate-staging.php': candidate
};
const manifest = {};
for (const [name, bytes] of Object.entries(files)) {
  await fs.writeFile(path.join(outputPath, name), bytes);
  manifest[name] = { bytes: Buffer.byteLength(bytes), sha256: createHash('sha256').update(bytes).digest('hex') };
}
console.log(JSON.stringify({ integrationPoints: replacements.length, newIntegrationPoints:applied.length, payloadUnchanged: true, files: manifest }, null, 2));
