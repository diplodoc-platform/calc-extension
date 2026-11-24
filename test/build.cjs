const {test} = require('node:test');
const assert = require('node:assert/strict');
const {mkdtemp, mkdir, writeFile, readFile, rm, realpath} = require('node:fs/promises');
const {tmpdir} = require('node:os');
const {join, dirname, resolve} = require('node:path');
const {execFileSync} = require('node:child_process');

for (const format of ['md', 'html']) {
    test(`calculates expressions in CLI ${format} build with workers`, async () => {
        const directory = await realpath(await mkdtemp(join(tmpdir(), 'calc-extension-')));
        try {
            const input = join(directory, 'input');
            const output = join(directory, 'output');
            await mkdir(input);
            await writeFile(join(input, '.yfm'), JSON.stringify({
                extensions: [resolve(__dirname, '../lib/index.js')],
                vars: {lang: 'ru', region: 'ru', price: 990},
            }));
            await writeFile(join(input, 'toc.yaml'), 'items:\n  - name: Test\n    href: index.md\n');
            await writeFile(join(input, 'index.md'),
                '# Calc\n\n{% calc 18 * {{ price }} %}\n\n{% calc [currency=RUB] 18 * 990 %}\n');

            const cli = join(dirname(require.resolve('@diplodoc/cli/package')), 'build/index.js');
            execFileSync(process.execPath, [cli, '-i', input, '-o', output,
                '--output-format', format, '--no-lint', '-j', '2'], {timeout: 60000});

            const result = await readFile(join(output, `index.${format}`), 'utf8');
            assert.match(result, /17820/);
            assert.match(result, /₽/);
            assert.doesNotMatch(result, /{%\s*calc/);
        } finally {
            await rm(directory, {recursive: true, force: true});
        }
    });
}
