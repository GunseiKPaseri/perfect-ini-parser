# perfect-ini-parser

A parser that allows editing while _maintaining the structure_ of ini.

- support comment (';' '#')
- support CRLF
- support order retenation ( minimal change)

> [!WARNING]
>
> - unsupport inline comment
> - unsupport multi-line
> - unsupport quote
> - unsupport section nest

## Usage

```ts
import { parse } from "jsr:@gunseikpaseri/perfect-ini-parser";

const iniFile = `[hoge]
; comment
fuga=piyo
`;

const parsed = parse(iniFile);

parsed.edit("hoge", "fuga", "momo");

const editedIni = parsed.stringify();

console.log(editedIni);
// [hoge]
// ; comment
// fuga=momo
```
