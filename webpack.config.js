// const path = require('path');
//
// module.exports = {
// 	mode: 'development',
// 	experiments: {
// 		topLevelAwait: true,
// 	},
// 	// devtool: 'inline-source-map',
// 	// module: {
// 	// 	rules: [
// 	// 		{
// 	// 			test: /\.tsx?$/,
// 	// 			use: 'ts-loader',
// 	// 			exclude: /node_modules/,
// 	// 		},
// 	// 	],
// 	// },
// 	// resolve: {
// 		// alias: {
// 		// 	o1js: path.resolve('node_modules/o1js'),
// 		// },
// 		// extensions: ['.tsx', '.ts', '.js'],
// 	// },
// 	entry: {
// 		// main: 'src/main.ts',
// 		o1js: 'node_modules/o1js/dist/web/index.js'
// 	},
// 	// entry: {
// 	// 	o1js: /[\\/]node_modules[\\/](o1js)[\\/][\\/]dist[\\/]snarky.js/,
// 	// },
//
// 	// optimization: {
// 	// 	splitChunks: {
// 	// 		cacheGroups: {
// 	// 			formComponents: {
// 	// 				chunks: 'all',
// 	// 				enforce: true,
// 	// 				minChunks: 1,
// 	// 				name: 'form-components',
// 	// 				priority: 10,
// 	// 				test: /[\\/]node_modules[\\/](o1js)[\\/]dist[\\/]web[\\/]snarky.js/,
// 	// 			},
// 	// 		},
// 	// 	},
// 	// },
// 	optimization: {
// 		splitChunks: {
// 			chunks: 'all',
// 			minChunks: 2,
// 		},
// 		// splitChunks: {
// 		// 	cacheGroups: {
// 		// 		o1js: {
// 		// 			test: /[\\/]node_modules[\\/]/,
// 		// 			name: 'vendor',
// 		// 			chunks: 'all',
// 		// 		},
// 		// 	},
// 		// },
// 		minimize: true,
// 	},
// 	// optimization: {
// 	// 	splitChunks: {
// 	// 		chunks: 'all',
// 	// 		cacheGroups: {
// 	// 			o1js: {
// 	// 				test: /[\\/]node_modules[\\/](o1js)[\\/]dist[\\/]web[\\/]index.js/,
// 	// 				name: 'o1js',
// 	// 				chunks: 'all',
// 	// 			}
// 	// 		}
// 	// 	},
// 	// },
// 	output: {
// 		wasmLoading: 'fetch',
// 		filename: '[name].js',
// 		path: path.resolve(__dirname, 'dist'),
// 	},
// }
//
const path = require('path');

module.exports = {
	experiments: {
		topLevelAwait: true
	},
	optimization: {
		minimize: false
	},
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "[name].js",
	},
	// module: {
	// 	rules: [
	// 		{
	// 			test: /\.ts?$/,
	// 			use: 'ts-loader',
	// 			exclude: /node_modules/,
	// 		},
	// 		{
	// 			test: /\.(js)$/,
	// 			exclude: /node_modules/,
	// 			use: "babel-loader",
	// 		},
	// 	],
	// },
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
	// mode: "development",
	// devServer: {
	// 	static: {
	// 		directory: path.join(__dirname, 'dist'),
	// 	},
	// 	compress: true,
	// 	port: 9000,
	// 	headers: {
	// 		'Cross-Origin-Opener-Policy': 'same-origin',
	// 		'Cross-Origin-Embedder-Policy': 'require-corp'
	// 	}
	// }
}