const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    entry: path.join(__dirname, 'src/index.tsx'),
    output: {
        path: path.join(__dirname, 'dist/'),
        filename: `index.js`,
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.scss', '.css'],
    },
    module: {
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
        minimizer: [new TerserPlugin({
            extractComments: false,
            terserOptions: {
                format: {
                    comments: false,
                },
            },
        })],
    },
};
