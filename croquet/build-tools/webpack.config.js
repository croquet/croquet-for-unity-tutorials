// invoked with an env.appName argument, which is used to determine the source
// and the output directories.
// NB: even if invoked from a different working directory, __dirname is the
// location of this config
const HtmlWebPackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = env => ({
    entry : `./sources/${env.buildTarget === 'node' ? 'index-node.tmp.js' : 'index.tmp.js'}`,
    output: {
        path: path.join(__dirname, `../../unity/Assets/StreamingAssets/${env.appName}/`),
        pathinfo: false,
        filename: env.buildTarget === 'node' ? 'node-main.js' : '[name]-[contenthash:8].js',
        chunkFilename: env.buildTarget === 'node' ? 'node-chunk.js' : 'chunk-[name]-[contenthash:8].js',
        clean: true
    },
    cache: {
        type: 'filesystem',
        name: `${env.appName}-${env.buildTarget}`,
        buildDependencies: {
            config: [__filename],
        }
    },
    resolve: {
        fallback: { "crypto": false }
    },
    experiments: {
        asyncWebAssembly: true,
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                enforce: "pre",
                use: ["source-map-loader"],
            },
        ],
    },
    plugins: env.buildTarget === 'node' ? [] : [
        new HtmlWebPackPlugin({
            template: './sources/index.html',   // input
            filename: 'index.html',   // output filename in dist/
        }),
    ],
    externals: env.buildTarget !== 'node' ? [] : [
        {
            'utf-8-validate': 'commonjs utf-8-validate',
            bufferutil: 'commonjs bufferutil',
        },
    ],
    target: env.buildTarget || 'web'
});
