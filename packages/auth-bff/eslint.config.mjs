import nextTypescript from "eslint-config-next/typescript";

export default [
  ...nextTypescript,
  {
    ignores: ["node_modules/**"]
  }
];
