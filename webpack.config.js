module.exports = {
	experiments: {
		topLevelAwait: true,
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				o1js: {
					test: /[\\/]node_modules[\\/](o1js)[\\/]/,
					name: 'o1js',
					chunks: 'all',
				}
			}
		},
		minimize: false,
	},
}
