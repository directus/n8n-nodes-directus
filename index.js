module.exports = {
	nodes: [
		require('./dist/nodes/Directus/Directus.node.js'),
		require('./dist/nodes/DirectusTrigger/DirectusTrigger.node.js'),
	],
	credentials: [require('./dist/credentials/DirectusApi.credentials.js')],
};
