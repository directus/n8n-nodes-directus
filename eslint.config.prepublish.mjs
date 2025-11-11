import { config } from '@n8n/node-cli/eslint';
import n8nNodesBase from 'eslint-plugin-n8n-nodes-base';

export default [
	...config,
	{
		ignores: ['**/__tests__/**', '**/*.test.ts', '**/*.test.js'],
	},
	{
		plugins: {
			'n8n-nodes-base': n8nNodesBase,
		},
		files: ['package.json'],
		rules: {
			'n8n-nodes-base/community-package-json-name-still-default': 'error',
		},
	},
];
