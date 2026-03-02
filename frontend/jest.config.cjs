module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src/__tests__"],
  moduleFileExtensions: ["ts", "tsx", "js"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }]
  },
  setupFilesAfterEnv: ["@testing-library/jest-dom", "<rootDir>/setupTests.js"],
};
