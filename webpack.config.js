'use strict';

const path              = require('path');
const ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
  entry: [
    path.resolve(__dirname, 'app', 'main.js')
  ],
  module: {
    loaders: [
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract('style-loader', 'css-loader')
      },
      {
        test: /\.scss$/,
        loader: ExtractTextPlugin.extract('style-loader', 'css-loader!sass-loader')
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'application.js',
    publicPath: '/'
  },
  plugins: [
    new ExtractTextPlugin("application.css")
  ]
}
