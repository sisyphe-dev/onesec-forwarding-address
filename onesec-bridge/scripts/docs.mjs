#!/usr/bin/env node

import { generateDocumentation } from "tsdoc-markdown";

const inputFiles = ["./src/bridge/evm-to-icp/index.ts", "./src/bridge/icp-to-evm/index.ts"];

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
