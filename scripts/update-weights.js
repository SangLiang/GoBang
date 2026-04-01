/**
 * 更新权重到 ai-training.json
 * 
 * 用法：
 *   node scripts/update-weights.js evolved-2026-03-31T09-08-44-194Z.json
 *   node scripts/update-weights.js data/evolved-2026-03-31T09-08-44-194Z.json
 */

"use strict";

var fs = require("fs");
var path = require("path");

var args = process.argv.slice(2);
if (args.length === 0) {
    console.log("用法: node scripts/update-weights.js <evolved文件名>");
    console.log("示例: node scripts/update-weights.js evolved-2026-03-31T09-08-44-194Z.json");
    
    // 列出可用的 evolved 文件
    var dataDir = path.join(__dirname, "..", "data");
    var files = fs.readdirSync(dataDir).filter(function(f) {
        return f.startsWith("evolved-") && f.endsWith(".json");
    }).sort().reverse();
    
    if (files.length > 0) {
        console.log("\n可用的 evolved 文件：");
        files.forEach(function(f) {
            console.log("  " + f);
        });
    }
    process.exit(1);
}

var inputPath = args[0];
// 如果只给了文件名，自动加上 data/ 前缀
if (!inputPath.includes("/") && !inputPath.includes("\\")) {
    inputPath = path.join(__dirname, "..", "data", inputPath);
}

// 检查文件是否存在
if (!fs.existsSync(inputPath)) {
    console.error("文件不存在:", inputPath);
    process.exit(1);
}

// 读取 evolved 文件
var evolved;
try {
    evolved = JSON.parse(fs.readFileSync(inputPath, "utf8"));
} catch (e) {
    console.error("读取文件失败:", e.message);
    process.exit(1);
}

// 验证文件格式
if (!evolved.nnAssistWeights || !evolved.nnAssistWeights.neurons || !evolved.nnAssistWeights.weights) {
    console.error("文件格式错误：缺少 nnAssistWeights");
    process.exit(1);
}

// 读取 ai-training.json
var trainingPath = path.join(__dirname, "..", "data", "ai-training.json");
var training;
try {
    training = JSON.parse(fs.readFileSync(trainingPath, "utf8"));
} catch (e) {
    console.error("读取 ai-training.json 失败:", e.message);
    process.exit(1);
}

// 更新权重
training.nnAssistSchemaVersion = evolved.nnAssistSchemaVersion || 2;
training.nnAssistWeights = evolved.nnAssistWeights;
training.evolvedAt = evolved.evolvedAt || new Date().toISOString();
training.bestFitness = evolved.bestFitness || 0;
training.bestFitnessNote = evolved.bestFitnessNote || "";
training.generations = evolved.generations || 0;
training.population = evolved.population || 0;

// 写入
fs.writeFileSync(trainingPath, JSON.stringify(training, null, 2), "utf8");

console.log("更新成功！");
console.log("  来源:", path.basename(inputPath));
console.log("  bestFitness:", training.bestFitness);
console.log("  generations:", training.generations);
console.log("  evolvedAt:", training.evolvedAt);
