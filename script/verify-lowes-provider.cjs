const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const providerSrc = fs.readFileSync(path.join(root, 'packages/opencode/src/provider/provider.ts'), 'utf8');
const launchSrc = fs.readFileSync(path.join(root, 'start-lowecode.sh'), 'utf8');
const pkgSrc = fs.readFileSync(path.join(root, 'packages/opencode/package.json'), 'utf8');
const configSrc = fs.readFileSync(path.join(root, '.opencode/opencode.jsonc'), 'utf8');

const checks = [
  ['provider.ts has lowes-mylow', providerSrc.includes('"lowes-mylow"')],
  ['provider.ts has mylow-1', providerSrc.includes('"mylow-1"')],
  ['provider.ts uses LOWES_MYLOW_BASE_URL', providerSrc.includes('LOWES_MYLOW_BASE_URL')],
  ['provider.ts has LOWECODE_ALLOW_OTHER_PROVIDERS gate', providerSrc.includes('LOWECODE_ALLOW_OTHER_PROVIDERS')],
  ['start-lowecode.sh has LOWES_ENDPOINT_NOT_CONFIGURED', launchSrc.includes('LOWES_ENDPOINT_NOT_CONFIGURED')],
  ['start-lowecode.sh has LOWECODE_MOCK', launchSrc.includes('LOWECODE_MOCK')],
  ['opencode package bin is lowecode', pkgSrc.includes('"lowecode": "./bin/opencode"')],
  ['opencode package name is lowecode', pkgSrc.includes('"name": "lowecode"')],
  ['config forces lowes-mylow/mylow-1', configSrc.includes('"model": "lowes-mylow/mylow-1"')],
  ['config sets lowecode-blue theme', configSrc.includes('"theme": "lowecode-blue"')],
];

let failed = false;
for (const [label, ok] of checks) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    failed = true;
  } else {
    console.log(`ok: ${label}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log('LOWECODE provider wiring verified');
