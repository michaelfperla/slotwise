// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill for fetch if needed in Node environment for tests (Jest runs in Node)
// The 'whatwg-fetch' package was installed for this.
import 'whatwg-fetch';

// Mock next/navigation specifically for 'useRouter' and 'usePathname'
// This is a common requirement for testing Next.js components.
jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'), // Import and retain default behavior
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
    // Add any other router methods your components use
  }),
  usePathname: () => '/', // Default pathname, can be customized per test if needed
  useSearchParams: () => ({
    get: jest.fn(),
    // Add other searchParams methods if used
  }),
}));

// Mock 'next/link' if it causes issues, though often not needed if navigation is mocked.
// jest.mock('next/link', () => {
//   return ({ children, href }) => {
//     return <a href={href}>{children}</a>;
//   };
// });

// You can add other global setup items here if necessary.
// For example, mocking localStorage or other browser APIs not present in JSDOM.
if (typeof window !== 'undefined' && !window.localStorage) {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });
}

// Silence console.error and console.warn during tests to keep output clean,
// but ensure you are not hiding important warnings from your tests.
// const originalError = console.error;
// beforeAll(() => {
//   jest.spyOn(console, 'error').mockImplementation((...args) => {
//     if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render is no longer supported in React 19')) {
//       return; // Suppress specific React 19 warning if it's noisy and known
//     }
//     originalError.call(console, ...args);
//   });
// });
// afterAll(() => {
//   console.error.mockRestore();
// });
