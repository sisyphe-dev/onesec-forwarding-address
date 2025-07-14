#!/usr/bin/env node

import { generateDocumentation } from "tsdoc-markdown";

const inputFiles = ["./src/index.ts"];

const buildOptions = {
  repo: { url: "https://github.com/sisyphe-dev/key_token.git" },
  explore: false,
};

const markdownOptions = {
  headingLevel: "###",
};

generateDocumentation({
  inputFiles: inputFiles,
  outputFile: "./README.md",
  markdownOptions,
  buildOptions,
});
