import '@testing-library/jest-dom/vitest';
// jsdom has no IndexedDB; this installs an in-memory implementation globally.
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs without globals here, so Testing Library cannot register its own
// automatic cleanup.
afterEach(() => {
  cleanup();
});
