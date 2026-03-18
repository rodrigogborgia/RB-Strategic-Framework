module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/frontend/src/__tests__"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.svg$": "<rootDir>/__mocks__/svgMock.js",
    "\\.(jpg|jpeg|png|gif|webp|pdf)$": "<rootDir>/__mocks__/fileMock.js"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!@testing-library|@babel|identity-obj-proxy)/"
  ],
  setupFilesAfterEnv: ["@testing-library/jest-dom", "<rootDir>/frontend/setupTests.js"],
};
