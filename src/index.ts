import type {BaseProgram} from '@diplodoc/cli/lib/program';
import {getHooks} from '@diplodoc/cli/lib/program';
import {getHooks as getMarkdownHooks, type MarkdownService} from '@diplodoc/cli/lib/markdown';
import type {Run} from '@diplodoc/cli/lib/run';
import calc = require('./calc');

export class Extension {
    apply(program: BaseProgram) {
        getHooks<Run & {markdown: MarkdownService}>(program).BeforeAnyRun.tap('Calc', (run) => {
            getMarkdownHooks(run.markdown).Collects.tap('Calc', (collects) => [
                ...collects,
                function (content) {
                    return calc.collect.call(
                        {vars: {
                            lang: String(this.vars.lang || 'en'),
                            region: String(this.vars.region || 'int'),
                        }},
                        content,
                    );
                },
            ]);
        });
    }
}
