import { createToken, EmbeddedActionsParser, Lexer } from "chevrotain";

const LF = createToken({ name: "LF", pattern: "\n", label: "\\n" });
const Equal = createToken({ name: "Equal", pattern: "=", label: "'='" });
const LSquare = createToken({ name: "LSquare", pattern: "[", label: "'['" });
const RSquare = createToken({ name: "RSquare", pattern: "]", label: "']'" });
const Space = createToken({
  name: "Space",
  pattern: /[\x20\t]/,
  label: "' ' | \\t",
});
const Semicoron = createToken({
  name: "Semicoron",
  pattern: ";",
  label: "';'",
});
const NumberSign = createToken({
  name: "NumberSign",
  pattern: "#",
  label: "'#'",
});
const OtherChar = createToken({
  name: "OtherChar",
  pattern: /[^=\[\]#;\n\x20\t]/,
});

const iniTokens = [
  LF,
  Equal,
  LSquare,
  RSquare,
  Semicoron,
  NumberSign,
  Space,
  OtherChar,
];

export const IniLexer = new Lexer(iniTokens);

type Ini = { commentBeforeSection: IgnoreLine[]; value: Section[] };
type SectionValue =
  & { commentAfterKeyValue: IgnoreLine[] }
  & KeyValueLine;
type Section = {
  header: SectionHeaderLine;
  values: SectionValue[];
  sectionComment: IgnoreLine[];
};
type SectionHeaderLine = {
  spaceAfterHeader: string;
  spaceBeforeHeader: string;
  sectionName: string;
};
type IgnoreLine =
  | { type: "emptyLine"; value: string }
  | {
    type: "comment";
    commentMark: string;
    spaceAfterMark: string;
    value: string;
    spaceBeforeMark: string;
    commentLF: string;
  };
type CommentLF = {
  type: "comment";
  commentMark: string;
  spaceAfterMark: string;
  value: string;
  commentLF: string;
};
type ValueLF = { spaceBeforeValue: string; value: string; lfAfterLine: string };
type KeyValueLine = {
  key: string;
  value: string;
  spaceBeforeKey: string;
  spaceAfterEqual: string;
  keyValueLF: string;
};

export class IniParser extends EmbeddedActionsParser {
  constructor() {
    super(iniTokens);
    this.performSelfAnalysis();
  }
  public ini: () => Ini = this.RULE("ini", () => {
    const commentBeforeSection: IgnoreLine[] = [];
    this.MANY(() => {
      commentBeforeSection.push(this.SUBRULE(this.ignoreLine));
    });
    const value: Section[] = [];
    this.MANY1(() => {
      value.push(this.SUBRULE(this.section));
    });
    return { commentBeforeSection, value };
  });

  public section: () => Section = this.RULE("section", () => {
    const header = this.SUBRULE(this.sectionHeaderLine);
    const sectionComment: IgnoreLine[] = [];
    this.MANY(() => {
      sectionComment.push(this.SUBRULE1(this.ignoreLine));
    });
    const values: SectionValue[] = [];
    this.MANY1(() => {
      const keyValue = this.SUBRULE1(this.keyValueLine);
      const commentAfterKeyValue: IgnoreLine[] = [];
      this.MANY2(() => {
        commentAfterKeyValue.push(this.SUBRULE2(this.ignoreLine));
      });
      values.push({ commentAfterKeyValue, ...keyValue });
    });
    return { header, values, sectionComment };
  });

  public sectionHeaderLine: () => SectionHeaderLine = this.RULE(
    "sectionHeaderLine",
    () => {
      const spaceBeforeHeader = this.SUBRULE(this.spaces);
      this.CONSUME(LSquare);
      const sectionName = this.SUBRULE1(this.sectionName);
      this.CONSUME1(RSquare);
      let spaceAfterHeader = this.SUBRULE2(this.spaces);
      spaceAfterHeader += this.CONSUME2(LF).image;
      return { spaceAfterHeader, spaceBeforeHeader, sectionName };
    },
  );

  public sectionName: () => string = this.RULE("sectionName", () => {
    let str = "";
    this.AT_LEAST_ONE(() => {
      str += this.SUBRULE(this.sectionChar);
    });
    return str;
  });

  public sectionChar: () => string = this.RULE("sectionChar", () => {
    return this.OR([
      { ALT: () => this.SUBRULE(this.commentMark) },
      { ALT: () => this.CONSUME(Space).image },
      { ALT: () => this.CONSUME(Equal).image },
      { ALT: () => this.CONSUME(OtherChar).image },
    ]);
  });

  public ignoreLine: () => IgnoreLine = this.RULE("ignoreLine", () => {
    const space = this.SUBRULE(this.spaces);

    return this.OR<IgnoreLine>([
      {
        ALT: () => ({
          ...this.SUBRULE(this.commentLF),
          spaceBeforeMark: space,
        }),
      },
      {
        ALT: () => ({
          type: "emptyLine",
          value: space + this.CONSUME(LF).image,
        }),
      },
    ]);
  });

  public commentLF: () => CommentLF = this.RULE<
    () => {
      type: "comment";
      commentMark: string;
      spaceAfterMark: string;
      value: string;
      commentLF: string;
    }
  >("commentLF", () => {
    const commentMark = this.SUBRULE1(this.commentMark);
    const commentValue = this.SUBRULE2(this.valueLF);
    return {
      type: "comment",
      commentMark,
      spaceAfterMark: commentValue.spaceBeforeValue,
      value: commentValue.value,
      commentLF: commentValue.lfAfterLine,
    };
  });

  public valueLF: () => ValueLF = this.RULE("valueLF", () => {
    const spaceBeforeValue = this.SUBRULE(this.spaces);
    let value = "";
    this.MANY2(() => {
      value += this.SUBRULE(this.anyChar);
    });
    const lfAfterLine = this.CONSUME(LF).image;
    return { spaceBeforeValue, value, lfAfterLine };
  });

  public keyValueLine: () => KeyValueLine = this.RULE("keyValueLine", () => {
    const spaceBeforeKey = this.SUBRULE(this.spaces);
    const key = this.SUBRULE(this.key);
    this.CONSUME(Equal);
    const value = this.SUBRULE1(this.valueLF);
    return {
      key,
      value: value.value,
      spaceBeforeKey,
      spaceAfterEqual: value.spaceBeforeValue,
      keyValueLF: value.lfAfterLine,
    };
  });

  public key: () => string = this.RULE("key", () => {
    let str: string = this.SUBRULE(this.keyHeadChar);
    this.MANY(() => {
      str += this.SUBRULE(this.keyChar);
    });
    return str;
  });

  public commentMark: () => string = this.RULE("commentMark", () => {
    return this.OR([
      { ALT: () => this.CONSUME(Semicoron).image },
      { ALT: () => this.CONSUME(NumberSign).image },
    ]);
  });

  public spaces: () => string = this.RULE("spaces", () => {
    let str = "";
    this.MANY(() => {
      str += this.CONSUME(Space).image;
    });
    return str;
  });

  public keyHeadChar: () => string = this.RULE("keyHeadChar", () => {
    return this.OR([
      { ALT: () => this.CONSUME(RSquare).image },
      { ALT: () => this.CONSUME(OtherChar).image },
    ]);
  });

  public keyChar: () => string = this.RULE("keyChar", () => {
    return this.OR([
      { ALT: () => this.SUBRULE(this.commentMark) },
      { ALT: () => this.CONSUME(LSquare).image },
      { ALT: () => this.CONSUME(Space).image },
      { ALT: () => this.SUBRULE(this.keyHeadChar) },
    ]);
  });

  public anyChar: () => string = this.RULE("anyChar", () => {
    return this.OR([
      { ALT: () => this.SUBRULE(this.keyChar) },
      { ALT: () => this.CONSUME(Equal).image },
    ]);
  });
}
