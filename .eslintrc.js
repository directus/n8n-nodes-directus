/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	root: true,

	env: {
		browser: true,
		es6: true,
		node: true,
	},

	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020,
	},

	ignorePatterns: ['.eslintrc.js', '**/node_modules/**', '**/dist/**'],

	rules: {
		// General rules
		'no-console': 'warn',
		'no-debugger': 'error',
		'no-unused-vars': 'warn',
		'prefer-const': 'error',
		'no-var': 'error',
		'no-undef': 'off', // TypeScript handles this
	},
};
