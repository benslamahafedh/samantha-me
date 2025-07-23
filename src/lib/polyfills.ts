// Polyfill for 'self is not defined' error during server-side builds
if (typeof self === 'undefined') {
  (global as any).self = global;
}

export {}; 