const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ["<rootDir>/src/tests"],
  testTimeout: 20000,
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
};