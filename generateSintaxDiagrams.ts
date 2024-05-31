import { createSyntaxDiagramsCode } from "chevrotain";

import { IniParser } from "./src/ini_parser.ts";

const parser = new IniParser();

const grammar = parser.getSerializedGastProductions();
const html = createSyntaxDiagramsCode(grammar);

Deno.writeTextFile("./ini_syntax_diagram.html", html);
