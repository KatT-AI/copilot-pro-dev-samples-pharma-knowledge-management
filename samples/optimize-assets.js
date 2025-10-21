#!/usr/bin/env node

/**
 * Asset Optimization Script
 * 
 * This script provides guidelines and utilities for optimizing assets in Teams samples.
 * For production use, consider using tools like imagemin, sharp, or online services.
 */

const fs = require('fs');
const path = require('path');

class AssetOptimizer {
    constructor() {
        this.recommendations = [];
    }

    analyzeDirectory(dirPath) {
        console.log(`🔍 Analyzing assets in: ${dirPath}`);
        
        const files = this.getAllFiles(dirPath, ['.png', '.jpg', '.jpeg', '.gif']);
        
        files.forEach(file => {
            const stats = fs.statSync(file);
            const sizeInKB = Math.round(stats.size / 1024);
            
            if (sizeInKB > 500) {
                this.recommendations.push({
                    file: path.relative(process.cwd(), file),
                    size: sizeInKB,
                    type: 'large-image',
                    suggestion: 'Consider compressing or resizing this image'
                });
            }
            
            if (file.endsWith('.png') && sizeInKB > 100) {
                this.recommendations.push({
                    file: path.relative(process.cwd(), file),
                    size: sizeInKB,
                    type: 'png-optimization',
                    suggestion: 'Consider converting to WebP or optimizing PNG compression'
                });
            }
        });
        
        return this.recommendations;
    }

    getAllFiles(dirPath, extensions) {
        let files = [];
        
        try {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                const fullPath = path.join(dirPath, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    files = files.concat(this.getAllFiles(fullPath, extensions));
                } else if (extensions.some(ext => item.toLowerCase().endsWith(ext))) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            console.warn(`Warning: Could not read directory ${dirPath}`);
        }
        
        return files;
    }

    generateOptimizationReport() {
        console.log('\n📊 Asset Optimization Report\n');
        console.log('='.repeat(50));
        
        if (this.recommendations.length === 0) {
            console.log('✅ No optimization recommendations found!');
            return;
        }
        
        // Group by type
        const byType = this.recommendations.reduce((acc, rec) => {
            if (!acc[rec.type]) acc[rec.type] = [];
            acc[rec.type].push(rec);
            return acc;
        }, {});
        
        Object.entries(byType).forEach(([type, recs]) => {
            console.log(`\n🔧 ${type.toUpperCase().replace('-', ' ')}:`);
            recs.forEach(rec => {
                console.log(`  📁 ${rec.file} (${rec.size}KB)`);
                console.log(`     💡 ${rec.suggestion}`);
            });
        });
        
        console.log('\n🚀 Optimization Tips:');
        console.log('  • Use WebP format for better compression');
        console.log('  • Resize images to actual display dimensions');
        console.log('  • Use appropriate compression levels');
        console.log('  • Consider lazy loading for large images');
        console.log('  • Use CDN for better delivery performance');
    }

    generateWebpackConfig() {
        const config = `
// Webpack Asset Optimization Configuration
const path = require('path');

module.exports = {
  module: {
    rules: [
      {
        test: /\\.(png|jpe?g|gif|svg)$/i,
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
        test: /\\.(png|jpe?g)$/i,
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
};`;
        
        fs.writeFileSync(path.join(__dirname, 'webpack.assets.config.js'), config);
        console.log('\n📝 Generated webpack.assets.config.js for asset optimization');
    }
}

// Run the analyzer
const optimizer = new AssetOptimizer();
const samplesDir = path.join(__dirname);
optimizer.analyzeDirectory(samplesDir);
optimizer.generateOptimizationReport();
optimizer.generateWebpackConfig();

module.exports = AssetOptimizer;