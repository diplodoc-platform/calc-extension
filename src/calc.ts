import {all, create} from 'mathjs';

const transform = () => {};

const CALC_OPTIONS_START = '[';
const CALC_OPTIONS_END = ']';
const CALC_OPTIONS_DELIMITER = ',';
const CALC_OPTION_KEY_VALUE_DELIMITER = '=';

const OPEN_TAG = '{%';
const CLOSE_TAG = '%}';
// eslint-disable-next-line security/detect-non-literal-regexp
const CALC_REGEXP = new RegExp(`${OPEN_TAG}\\s{0,}calc\\s+`, 'g');

const SUPPORTED_CURRENCIES = ['RUB', 'USD', 'KZT'] as const;

type PluginOptions = {
    vars: {
        lang: string;
        region: string;
    };
};

const formatOptions: Record<(typeof SUPPORTED_CURRENCIES)[number], Intl.NumberFormatOptions> = {
    RUB: {
        useGrouping: true,
        currency: 'RUB',
    },
    USD: {
        currency: 'USD',
    },
    KZT: {
        currency: 'KZT',
    },
} as const;

type CalcOptions = {
    currency?: keyof typeof formatOptions;
};

const replacesMap = {
    ' ': '',
    ',': '.',
    '×': '*',
};

const mathjs = create(
    all,
    {
        number: 'BigNumber',
    },
);

const getRegionAndLocale = (lang: string, region: string) => {
    switch (region) {
        case 'int':
            return `${lang}-US`;
        default:
            return `${lang}-${region}`;
    }
};

const getFormatOptions = (currency: CalcOptions['currency']): Intl.NumberFormatOptions => {
    const options = {
        currencyDisplay: 'narrowSymbol',
        style: 'currency',
    };

    switch (currency) {
        case 'RUB':
            return {...options, ...formatOptions.RUB} as Intl.NumberFormatOptions;
        case 'KZT':
            return {...options, ...formatOptions.KZT} as Intl.NumberFormatOptions;
        case 'USD':
            return {...options, ...formatOptions.USD} as Intl.NumberFormatOptions;
        default:
            throw new Error(`Unsupported currency "${currency}"`);
    }
};

const getOptions = (inputStr: string): [CalcOptions, optionsEndPos: number] => {
    const optionsStart = inputStr.indexOf(CALC_OPTIONS_START);
    if (optionsStart === -1) {
        return [{} as CalcOptions, 0];
    }

    const optionsEnd = inputStr.indexOf(CALC_OPTIONS_END, optionsStart);
    if (optionsEnd === -1) {
        throw new Error('Closing bracket "]" for "calc" options is not found');
    }

    const optionsRaw = inputStr
        .slice(optionsStart + CALC_OPTIONS_START.length, optionsEnd)
        .replaceAll(' ', '');

    const options = optionsRaw.split(CALC_OPTIONS_DELIMITER).reduce((acc, option) => {
        const [key, value] = option.split(CALC_OPTION_KEY_VALUE_DELIMITER);
        return {...acc, [key]: value};
    }, {} as CalcOptions);

    return [options, optionsEnd + CALC_OPTIONS_END.length];
};

const validateOptions = (options: CalcOptions) => {
    if (options.currency && !SUPPORTED_CURRENCIES.includes(options.currency)) {
        throw new Error(`Unsupported currency "${options.currency}"`);
    }
};

const getExpression = (calcInner: string, optionsEndPos: number): string => {
    let expression = calcInner.slice(optionsEndPos);

    Object.entries(replacesMap).forEach(([key, value]) => {
        expression = expression.replaceAll(key, value);
    });
    return expression;
};

const getOptionsAndExpression = (calcInner: string): [CalcOptions, string] => {
    const [options, optionsEndPos] = getOptions(calcInner);
    validateOptions(options);
    const expression = getExpression(calcInner, optionsEndPos);

    return [options, expression];
};

const collect = function (this: PluginOptions, input: string) {
    const regexp = new RegExp(CALC_REGEXP);
    let match = regexp.exec(input);
    if (match === null) {
        return input;
    }

    let result = input.slice();

    const {lang, region} = this.vars;

    while (match !== null) {
        const [matchValue, startPos] = [match[0], match.index];
        const endPos = result.indexOf(CLOSE_TAG, startPos + matchValue.length);
        if (
            endPos === -1 ||
            result.slice(startPos + matchValue.length, endPos).indexOf(OPEN_TAG) !== -1 // has another open tag inside
        ) {
            throw new Error('Closing tag for "calc" is not found');
        }

        const calcInner = result.slice(startPos + matchValue.length, endPos);

        const [options, expression] = getOptionsAndExpression(calcInner);

        let evalResult: number | string = mathjs.evaluate(expression).toNumber();
        if (options.currency) {
            const formatter = new Intl.NumberFormat(getRegionAndLocale(lang, region), {
                ...getFormatOptions(options.currency),
                minimumFractionDigits: 0,
                maximumFractionDigits: 10,
            });
            const parts = formatter.formatToParts(Number(evalResult));

            evalResult = parts
                .map((part) => {
                    if (part.type === 'fraction') {
                        return part.value.replace(/0+$/, '');
                    }
                    if (part.type === 'decimal') {
                        const fraction = parts.find((p) => p.type === 'fraction');
                        if (fraction && fraction.value.replace(/0+$/, '') === '') {
                            return '';
                        }
                    }
                    return part.value;
                })
                .join('');
        }

        result = result.replace(result.slice(startPos, endPos + CLOSE_TAG.length), String(evalResult));
        regexp.lastIndex = 0;

        match = regexp.exec(result);
    }

    return result;
};

transform.collect = collect;

export = transform;
