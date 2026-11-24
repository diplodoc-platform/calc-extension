# @diplodoc/calc-extension

Build-time calculations for Diplodoc, extracted from the server-yfm calc plugin.

```markdown
{% calc (10 + 5 + 3) × 990 %}
{% calc [currency=RUB] (10 + 5 + 3) × 990 %}
```

Supports RUB, USD and KZT. Currency formatting uses `lang` and `region` variables;
`region: int` maps to the US locale region. Decimal commas and × are supported.

## Connection

Install the package before building, then add to the documentation config:

```yaml
extensions:
  - '@diplodoc/calc-extension'
```

The extension runs during Markdown collection, before rendering.
Use the same configuration for Markdown and HTML builds.
Install the extension and CLI in the same npm project; a separate global CLI
can load a different copy of the hooks and leave directives unprocessed.
Tested with CLI 5.71.0 and two workers.

## Development

```bash
npm install
npm test
```

`npm run build` compiles TypeScript into `lib/`. The `prepare` script also builds
when installing this package from Git. Pin a tag or commit when using it in CI.
