const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (_env, argv) => ({
    // Development default is `eval`, which wraps modules in eval() where `import.meta` is a
    // syntax error; source maps keep dev builds debuggable without it.
    devtool: argv.mode === 'production' ? false : 'source-map',
    entry: path.join(__dirname, 'src/index.tsx'),
    output: {
        path: path.join(__dirname, 'dist/'),
        filename: `index.js`,
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.scss', '.css'],
    },
    module: {
        parser: {
            // Keep `import.meta.url` for the browser: the bundle runs as a module script and
            // resolves its sounds relative to its own URL.
            javascript: { importMeta: false },
        },
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules|\.d\.ts$/,
                use: 'ts-loader',
            },
            {
                test: /\.scss$/,
                use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader'],
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader', 'postcss-loader'],
            },
            {
                test: /\.html$/,
                use: { loader: 'html-loader' },
            },
        ],
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                extractComments: false,
                terserOptions: {
                    format: {
                        comments: false,
                    },
                },
            }),
        ],
    },
});
