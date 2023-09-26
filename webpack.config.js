const path = require('path');

module.exports = {
	mode: 'development',
	experiments: {
		topLevelAwait: true,
	},
	entry: {
		main: './src/main.ts',
		o1js: 'node_modules/o1js/dist/web/index.js'
	},
	// entry: {
	// 	o1js: /[\\/]node_modules[\\/](o1js)[\\/][\\/]dist[\\/]snarky.js/,
	// },

	// optimization: {
	// 	splitChunks: {
	// 		cacheGroups: {
	// 			formComponents: {
	// 				chunks: 'all',
	// 				enforce: true,
	// 				minChunks: 1,
	// 				name: 'form-components',
	// 				priority: 10,
	// 				test: /[\\/]node_modules[\\/](o1js)[\\/]dist[\\/]web[\\/]snarky.js/,
	// 			},
	// 		},
	// 	},
	// },
	optimization: {
		// splitChunks: {
		// 	cacheGroups: {
		// 		o1js: {
		// 			test: /[\\/]node_modules[\\/]/,
		// 			name: 'vendor',
		// 			chunks: 'all',
		// 		},
		// 	},
		// },
		minimize: false,
	},
	// optimization: {
	// 	splitChunks: {
	// 		chunks: 'all',
	// 		cacheGroups: {
	// 			o1js: {
	// 				test: /[\\/]node_modules[\\/](o1js)[\\/]dist[\\/]web[\\/]index.js/,
	// 				name: 'o1js',
	// 				chunks: 'all',
	// 			}
	// 		}
	// 	},
	// },
	output: {
		wasmLoading: 'fetch',
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
	},
}
