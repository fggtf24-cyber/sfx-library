// npm run release — build installer, tag v<version>, publish GitHub release with exe + blockmap + latest.yml.
// Uses gh CLI (already logged in) instead of electron-builder's publisher: it needs the tag to exist first and its uploads are flaky.
const { execSync } = require('child_process');
const fs = require('fs'), crypto = require('crypto');
const run = c => execSync(c, { stdio: 'inherit' });
const out = c => execSync(c, { encoding: 'utf8' }).trim();
const tag = 'v' + require('./package.json').version;

if (out('git status --porcelain')) throw new Error('commit your changes first');
if (out(`git tag -l ${tag}`)) throw new Error(`${tag} already exists: bump "version" in package.json`);

run('node icon.js');
run('npx electron-builder --win --publish never');

// latest.yml must describe exactly this exe, or auto-update fails the sha512 check
const exe = 'dist/SFXLibrary-Setup.exe', yml = fs.readFileSync('dist/latest.yml', 'utf8');
const sha = crypto.createHash('sha512').update(fs.readFileSync(exe)).digest('base64');
if (!yml.includes(sha)) throw new Error('dist/latest.yml does not match the built exe');

run(`git tag ${tag}`);
// full ref names: a branch called like the tag (e.g. "v1.1.0") makes a bare "v1.1.0" ambiguous and the push fails
run(`git push origin HEAD refs/tags/${tag}`);
run(`gh release create ${tag} ${exe} ${exe}.blockmap dist/latest.yml --title ${tag} --generate-notes`);
console.log(`published ${tag}`);
