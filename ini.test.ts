import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { INIData, parse } from "./ini.ts";

const testcase: [string, string, ReturnType<INIData["valueOf"]>, object][] = [[
  "simple case",
  `[hoge]
fuga=piyo
`,
  {
    commentBeforeSection: [],
    originalNewLineCode: "\n",
    value: [
      {
        header: {
          sectionName: "hoge",
          spaceAfterHeader: "\n",
          spaceBeforeHeader: "",
        },
        sectionComment: [],
        values: [
          {
            commentAfterKeyValue: [],
            key: "fuga",
            spaceAfterEqual: "",
            spaceBeforeKey: "",
            keyValueLF: "\n",
            value: "piyo",
          },
        ],
      },
    ],
  },
  {
    "hoge": {
      fuga: "piyo",
    },
  },
], [
  "simple case with emptyline",
  `

[hoge]

fuga=piyo

`,
  {
    commentBeforeSection: [{
      type: "emptyLine",
      value: "\n",
    }, {
      type: "emptyLine",
      value: "\n",
    }],
    originalNewLineCode: "\n",
    value: [
      {
        header: {
          sectionName: "hoge",
          spaceAfterHeader: "\n",
          spaceBeforeHeader: "",
        },
        sectionComment: [{
          type: "emptyLine",
          value: "\n",
        }],
        values: [
          {
            commentAfterKeyValue: [{
              type: "emptyLine",
              value: "\n",
            }],
            key: "fuga",
            spaceAfterEqual: "",
            spaceBeforeKey: "",
            keyValueLF: "\n",
            value: "piyo",
          },
        ],
      },
    ],
  },
  {
    "hoge": {
      fuga: "piyo",
    },
  },
], [
  "simple case without endline",
  `[hoge]
fuga=piyo`,
  {
    commentBeforeSection: [],
    isAddLFAtEndOfFile: true,
    originalNewLineCode: "\n",
    value: [
      {
        header: {
          sectionName: "hoge",
          spaceAfterHeader: "\n",
          spaceBeforeHeader: "",
        },
        sectionComment: [],
        values: [
          {
            commentAfterKeyValue: [],
            key: "fuga",
            spaceAfterEqual: "",
            spaceBeforeKey: "",
            keyValueLF: "\n",
            value: "piyo",
          },
        ],
      },
    ],
  },
  {
    "hoge": {
      fuga: "piyo",
    },
  },
], [
  "comment case",
  `;test
[hoge]
 ;  exam
foo=bar
 ;  java
fuga=piyo
 ;  vavava
 ;  vava
`,
  {
    "commentBeforeSection": [{
      commentLF: "\n",
      commentMark: ";",
      spaceAfterMark: "",
      spaceBeforeMark: "",
      type: "comment",
      value: "test",
    }],
    originalNewLineCode: "\n",
    "value": [
      {
        "header": {
          "spaceAfterHeader": "\n",
          "spaceBeforeHeader": "",
          "sectionName": "hoge",
        },
        sectionComment: [{
          commentLF: "\n",
          commentMark: ";",
          spaceAfterMark: "  ",
          spaceBeforeMark: " ",
          type: "comment",
          value: "exam",
        }],
        "values": [
          {
            "commentAfterKeyValue": [
              {
                "commentLF": "\n",
                "spaceBeforeMark": " ",
                "commentMark": ";",
                "spaceAfterMark": "  ",
                "type": "comment",
                "value": "java",
              },
            ],
            "key": "foo",
            "value": "bar",
            "spaceAfterEqual": "",
            "spaceBeforeKey": "",
            "keyValueLF": "\n",
          },
          {
            "commentAfterKeyValue": [
              {
                "commentLF": "\n",
                "spaceBeforeMark": " ",
                "commentMark": ";",
                "spaceAfterMark": "  ",
                "type": "comment",
                "value": "vavava",
              },
              {
                "commentLF": "\n",
                "spaceBeforeMark": " ",
                "commentMark": ";",
                "spaceAfterMark": "  ",
                "type": "comment",
                "value": "vava",
              },
            ],
            "key": "fuga",
            "value": "piyo",
            "spaceAfterEqual": "",
            "keyValueLF": "\n",
            "spaceBeforeKey": "",
          },
        ],
      },
    ],
  },
  {
    "hoge": {
      fuga: "piyo",
      foo: "bar",
    },
  },
]];

describe("success ini parse", () => {
  testcase.forEach(([message, input, obj, _]) => {
    it(message, () => {
      assertEquals(parse(input).valueOf(), obj, `failed ${message}`);
    });
  });
});

describe("success convert to javascript object", () => {
  testcase.forEach(([message, _, input, jobj]) => {
    it(message, () => {
      assertEquals(new INIData(input).toObject(), jobj, `failed ${message}`);
    });
  });
});

describe("success ini stringify", () => {
  testcase.forEach(([message, ini, input, _]) => {
    it(message, () => {
      assertEquals(new INIData(input).stringify(), ini, `failed ${message}`);
    });
  });
});

const tinyTestcase: [string, string][] = [
  ["CRLF ini", "[hoge]\rfuga=piyo\r"],
  ["LF ini", "[hoge]\r\nfuga=piyo\r\n"],
];

describe("success ini regenerate", () => {
  tinyTestcase.forEach(([message, ini]) => {
    it(message, () => {
      assertEquals(parse(ini).stringify(), ini, `failed ${message}`);
    });
  });
});

const editTestCase: {
  message: string;
  ini: string;
  section: string;
  key: string;
  value: string;
  afterIni: string;
}[] = [{
  message: "simple edit",
  ini: `[hoge]
 ; test
fuga=piyo
`,
  section: "hoge",
  key: "fuga",
  value: "mama",
  afterIni: `[hoge]
 ; test
fuga=mama
`,
}, {
  message: "add key",
  ini: `[hoge]
 ; test
fuga=piyo
`,
  section: "hoge",
  key: "mono",
  value: "mama",
  afterIni: `[hoge]
 ; test
fuga=piyo
mono=mama
`,
}, {
  message: "add section",
  ini: `[hoge]
fuga=piyo
`,
  section: "java",
  key: "wawa",
  value: "poyo",
  afterIni: `[hoge]
fuga=piyo
[java]
wawa=poyo
`,
}];

describe("success edit value", () => {
  editTestCase.forEach(({ message, ini, section, key, value, afterIni }) => {
    it(message, () => {
      const iniInstance = parse(ini);
      iniInstance.edit(section, key, value);
      assertEquals(iniInstance.stringify(), afterIni, `failed ${message}`);
    });
  });
});
