require('@testing-library/jest-dom');

// Mock console.log to capture output
const originalConsoleLog = console.log;
console.log = jest.fn((...args) => {
  originalConsoleLog(...args);
}); 