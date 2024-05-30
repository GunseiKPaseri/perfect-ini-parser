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

import { IniLexer, IniParser } from "./ini_parser.ts";

// parser

const parser = new IniParser();

function parseChevrotain(
  text: string,
): ReturnType<InstanceType<typeof IniParser>["ini"]> {
  const lexingResult = IniLexer.tokenize(text);
  parser.input = lexingResult.tokens;
  const p = parser.ini();

  if (parser.errors.length > 0) {
    console.log(parser.errors);
    throw new Error(parser.errors.map((err) => err.message).join("\n"));
  }
  return p;
}

export type INIDataInnerObj =
  & ReturnType<InstanceType<typeof IniParser>["ini"]>
  & {
    isAddLFAtEndOfFile?: boolean;
    originalNewLineCode: "\n" | "\r" | "\r\n";
  };

function parseCore(text: string): INIDataInnerObj {
  // support CRLF
  let originalNewLineCode: "\n" | "\r" | "\r\n" = "\n";
  if (text.indexOf("\r\n") !== -1) {
    text = text.replaceAll("\r\n", "\n");
    originalNewLineCode = "\r\n";
  } else if (text.indexOf("\r") !== -1) {
    text = text.replaceAll("\r", "\n");
    originalNewLineCode = "\r";
  }

  // support LF at EndOfFile
  let isAddLFAtEndOfFile = false;
  if (text.slice(-1) !== "\n") {
    text += "\n";
    isAddLFAtEndOfFile = true;
  }
  const parseTree = parseChevrotain(text);
  return {
    ...(isAddLFAtEndOfFile ? { ...parseTree, isAddLFAtEndOfFile } : parseTree),
    originalNewLineCode,
  };
}

// stringify

function stringifyIni(obj: INIDataInnerObj): string {
  return [
    obj.commentBeforeSection.map(stringifyIgnoreLine).join(""),
    obj.value.map(stringifySection).join(""),
  ].join("").replaceAll("\n", obj.originalNewLineCode);
}

function stringifyIgnoreLine(
  obj: ReturnType<InstanceType<typeof IniParser>["ignoreLine"]>,
): string {
  if (obj.type === "comment") {
    return [
      obj.spaceBeforeMark,
      obj.commentMark,
      obj.spaceAfterMark,
      obj.value,
      obj.commentLF,
    ].join("");
  } else {
    return obj.value;
  }
}

function stringifySection(
  obj: ReturnType<InstanceType<typeof IniParser>["section"]>,
): string {
  return [
    obj.header.spaceBeforeHeader,
    "[",
    obj.header.sectionName,
    "]",
    obj.header.spaceAfterHeader,
    obj.sectionComment.map(stringifyIgnoreLine).join(""),
    obj.values.map((value) =>
      [
        value.spaceBeforeKey,
        value.key,
        "=",
        value.spaceAfterEqual,
        value.value,
        value.keyValueLF,
        value.commentAfterKeyValue.map(stringifyIgnoreLine).join(""),
      ].join("")
    ).join(""),
  ].join("");
}

// edit

function createKeyValue(
  key: string,
  value: string,
): ReturnType<InstanceType<typeof IniParser>["section"]>["values"][0] {
  return {
    commentAfterKeyValue: [],
    key,
    value,
    spaceAfterEqual: "",
    keyValueLF: "\n",
    spaceBeforeKey: "",
  };
}

function createSection(
  section: string,
  key: string,
  value: string,
): ReturnType<InstanceType<typeof IniParser>["section"]> {
  return {
    header: {
      spaceAfterHeader: "\n",
      spaceBeforeHeader: "",
      sectionName: section,
    },
    sectionComment: [],
    values: [createKeyValue(key, value)],
  };
}

/**
 * parsed ini struct
 */
export class INIData {
  private iniobj: ReturnType<typeof parseCore>;
  constructor(obj: ReturnType<typeof parseCore>) {
    this.iniobj = obj;
  }
  /**
   * clone ini
   * @returns cloned INIObject
   */
  clone(): InstanceType<typeof INIData> {
    return new INIData(this.iniobj);
  }
  /**
   * get inner object
   * @returns javascript object
   */
  valueOf(): INIDataInnerObj {
    return Object.freeze(this.iniobj);
  }
  /**
   * get as javascript object
   * @returns javascript object
   */
  toObject(): { [k: string]: { [l: string]: string } } {
    return Object.fromEntries(
      this.iniobj.value.map((section) => {
        const sectionName = section.header.sectionName;
        const entries = section.values.map(
          (keyValue) => [keyValue.key, keyValue.value],
        );
        return [sectionName, Object.fromEntries(entries)];
      }),
    );
  }
  /**
   * get as ini file
   * @returns ini text
   */
  stringify(): string {
    const result = stringifyIni(this.iniobj);
    return this.iniobj.isAddLFAtEndOfFile ? result.slice(0, -1) : result;
  }
  /**
   * edit ini value
   * @param section Section Name
   * @param key Key Name
   * @param value Value to be set
   */
  edit(section: string, key: string, value: string) {
    const sIdx = this.iniobj.value.findIndex((s) =>
      s.header.sectionName === section
    );
    if (sIdx === -1) {
      this.iniobj.value = [
        ...this.iniobj.value,
        createSection(section, key, value),
      ];
      return;
    }
    const kIdx = this.iniobj.value[sIdx].values.findIndex((k) => k.key === key);
    if (kIdx === -1) {
      this.iniobj.value[sIdx].values = [
        ...this.iniobj.value[sIdx].values,
        createKeyValue(key, value),
      ];
      return;
    }
    this.iniobj.value[sIdx].values[kIdx].value = value;
  }
}

/**
 * parse ini text
 * @param text Contents of ini file
 * @returns parsed ini object
 */
export function parse(text: string): InstanceType<typeof INIData> {
  return new INIData(parseCore(text));
}
