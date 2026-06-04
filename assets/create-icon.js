/**
 * 生成 CCIsland 图标
 * 运行: node assets/create-icon.js
 * 需要安装: npm install canvas --save-dev
 */

// 这个脚本用于生成 PNG 图标
// 如果没有 canvas 模块，可以手动准备一个 256x256 的 PNG 图标放到 assets/icon.png

const fs = require('fs');
const path = require('path');

console.log('请准备一个 256x256 的 PNG 图标，保存为 assets/icon.png');
console.log('然后使用在线工具 (如 convertio.co) 转换为 assets/icon.ico');
console.log('');
console.log('或者直接运行 npm run build 跳过自定义图标');
