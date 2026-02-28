module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src/__tests__"],
  moduleFileExtensions: ["ts", "tsx", "js"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  setupFilesAfterEnv: ["@testing-library/jest-dom", "<rootDir>/setupTests.js"],
};
