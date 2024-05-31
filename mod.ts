/**
 * @module
 * @example
 * ```ts
 * import { parse } from "jsr:@gunseikpaseri/perfect-ini-parser";
 * const iniFile = `[hoge]
 * ; comment
 * fuga=piyo
 * `;
 *
 * const parsed = parse(iniFile);
 *
 * parsed.edit("hoge", "fuga", "momo");
 *
 * const editedIni = parsed.stringify();
 *
 * console.log(editedIni);
 * // [hoge]
 * // ; comment
 * // fuga=momo
 * ```
 */

export { INIData, type INIDataInnerObj, parse } from "./src/ini.ts";
