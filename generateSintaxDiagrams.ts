import { createSyntaxDiagramsCode } from "chevrotain";

import { IniParser } from "./ini_parser.ts";

const parser = new IniParser();

const grammar = parser.getSerializedGastProductions();
const html = createSyntaxDiagramsCode(grammar);

Deno.writeTextFile("./text.html", html);
