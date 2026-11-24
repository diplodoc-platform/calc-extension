const {test} = require('node:test');
const assert = require('node:assert/strict');
const plugin = require('../lib/calc');
const calc = (text) => plugin.collect.call({vars: {lang: 'ru', region: 'ru'}}, text);

test('calculates expressions and multiple blocks', () => {
    assert.equal(calc('Price: {% calc (10+5+3) × 990 %}; {% calc 0,1 + 0,2 %}'), 'Price: 17820; 0.3');
});

test('formats currency', () => {
    const expected = new Intl.NumberFormat('ru-RU', {
        style: 'currency', currency: 'RUB', currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 0, maximumFractionDigits: 10,
    }).format(17820);
    assert.equal(calc('{% calc [currency=RUB] (10+5+3) × 990 %}'), expected);
});

test('rejects invalid blocks and does not poison the next call', () => {
    assert.throws(() => calc('{% calc 2 + 2'), /Closing tag/);
    assert.throws(() => calc('{% calc [currency=EUR] 2 %}'), /Unsupported currency/);
    assert.equal(calc('{% calc 2 + 2 %}'), '4');
    assert.equal(calc('Plain text'), 'Plain text');
});
