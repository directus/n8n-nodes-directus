// Vitest setup file
import { vi } from 'vitest';

// Mock console methods to avoid noise in tests
global.console = {
	...console,
	log: vi.fn(),
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
};
