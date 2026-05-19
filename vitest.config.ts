// eslint-disable-next-line @n8n/community-nodes/no-restricted-imports
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		pool: 'threads',
		maxThreads: 1,
		minThreads: 1,
		setupFiles: ['./__tests__/setup.ts'],
		include: ['__tests__/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['nodes/**/*.ts', 'credentials/**/*.ts', 'src/**/*.ts'],
			exclude: ['**/*.d.ts', '**/node_modules/**', 'dist/**'],
		},
		testTimeout: 10000,
	},
});
