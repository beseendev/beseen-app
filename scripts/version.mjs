#!/usr/bin/env node
// Atualiza a versão do app em um único comando (package.json, Android e iOS).
//
// Uso:
//   npm run version:bump                  -> pergunta a versão (builds sobem +1 sozinhos)
//   npm run version:show                  -> mostra as versões atuais
//   npm run version:bump -- patch         -> 1.2.1 -> 1.2.2  (build +1)
//   npm run version:bump -- minor         -> 1.2.1 -> 1.3.0  (build +1)
//   npm run version:bump -- major         -> 1.2.1 -> 2.0.0  (build +1)
//   npm run version:bump -- 1.4.0         -> define versão exata (build +1)
//   npm run version:bump -- build         -> só incrementa o build (versão igual)
//   Opcional: --build 60  força o número do build (Android versionCode e iOS)
//   Opcional: --dry       mostra o que mudaria sem gravar

import { createInterface } from 'node:readline/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PKG = resolve(root, 'package.json');
const GRADLE = resolve(root, 'android/app/build.gradle');
const PBXPROJ = resolve(root, 'ios/App/App.xcodeproj/project.pbxproj');

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const buildIdx = args.indexOf('--build');
const forcedBuild = buildIdx >= 0 ? Number(args[buildIdx + 1]) : null;
let target = args.find((a, i) => !a.startsWith('--') && (buildIdx < 0 || i !== buildIdx + 1));

const read = (p) => readFileSync(p, 'utf8');
const fail = (msg) => { console.error(`✖ ${msg}`); process.exit(1); };

const gradle = read(GRADLE);
const pbx = read(PBXPROJ);
const pkgText = read(PKG);

const cur = {
  version: JSON.parse(pkgText).version,
  versionCode: Number(gradle.match(/versionCode\s+(\d+)/)?.[1]),
  iosBuild: Number(pbx.match(/CURRENT_PROJECT_VERSION = (\d+);/)?.[1]),
};

if (args.includes('--show')) {
  console.log(`package.json : ${cur.version}`);
  console.log(`Android      : ${gradle.match(/versionName\s+"([^"]+)"/)?.[1]} (versionCode ${cur.versionCode})`);
  console.log(`iOS          : ${pbx.match(/MARKETING_VERSION = ([^;]+);/)?.[1]} (build ${cur.iosBuild})`);
  process.exit(0);
}

if (!target) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log(`Versão atual: ${cur.version} (Android versionCode ${cur.versionCode}, iOS build ${cur.iosBuild})`);
  const ans = (await rl.question('Nova versão (ex: 1.3.0, patch, minor, major; Enter = só subir o build): ')).trim();
  rl.close();
  target = ans || 'build';
}

const [maj, min, pat] = cur.version.split('.').map(Number);
let next;
if (target === 'patch') next = `${maj}.${min}.${pat + 1}`;
else if (target === 'minor') next = `${maj}.${min + 1}.0`;
else if (target === 'major') next = `${maj + 1}.0.0`;
else if (target === 'build') next = cur.version;
else if (/^\d+\.\d+\.\d+$/.test(target)) next = target;
else fail(`Argumento inválido "${target}". Use patch | minor | major | build | X.Y.Z`);

if (forcedBuild !== null && !Number.isInteger(forcedBuild)) fail('--build precisa ser um inteiro');
const nextCode = forcedBuild ?? cur.versionCode + 1;
const nextIos = forcedBuild ?? cur.iosBuild + 1;

const count = (s, re) => (s.match(re) || []).length;
if (count(gradle, /versionCode\s+\d+/g) !== 1) fail('versionCode não encontrado no build.gradle');
if (count(pbx, /MARKETING_VERSION = [^;]+;/g) < 1) fail('MARKETING_VERSION não encontrado no pbxproj');

const newPkg = pkgText.replace(/("version"\s*:\s*")[^"]+(")/, `$1${next}$2`);
// versionName às vezes vem como `"1.2.1" + ""`, por isso troca só a 1ª string
const newGradle = gradle
  .replace(/versionCode\s+\d+/, `versionCode ${nextCode}`)
  .replace(/(versionName\s+")[^"]+(")/, `$1${next}$2`);
const newPbx = pbx
  .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${next};`)
  .replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${nextIos};`);

console.log(`Versão : ${cur.version} -> ${next}`);
console.log(`Android: versionCode ${cur.versionCode} -> ${nextCode}`);
console.log(`iOS    : build ${cur.iosBuild} -> ${nextIos} (${count(pbx, /MARKETING_VERSION/g)} blocos)`);

if (dry) { console.log('(dry-run: nada foi gravado)'); process.exit(0); }

writeFileSync(PKG, newPkg);
writeFileSync(GRADLE, newGradle);
writeFileSync(PBXPROJ, newPbx);
console.log('✔ Arquivos atualizados');
