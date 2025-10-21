
// Webpack Asset Optimization Configuration
const path = require('path');

module.exports = {
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8KB - inline small images as base64
          },
        },
        generator: {
          filename: 'assets/[name].[hash:8][ext]',
        },
      },
      {
        test: /\.(png|jpe?g)$/i,
        use: [
          {
            loader: 'imagemin-webpack-loader',
            options: {
              mozjpeg: {
                progressive: true,
                quality: 85,
              },
              pngquant: {
                quality: [0.8, 0.9],
                speed: 4,
              },
            },
          },
        ],
      },
    ],
  },
};