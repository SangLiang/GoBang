/**
 * 创建对手权重文件
 * 根据当前训练目标，设置固定对手权重
 */

"use strict";

var fs = require("fs");
var path = require("path");

// 读取种子权重（作为初始对手）
var seedData = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "ai-training.json"), "utf8"));

// 创建黑方对手权重文件（白棋训练时使用）
var blackOpponent = {
    nnAssistSchemaVersion: 2,
    nnAssistWeights: seedData.nnAssistWeights,
    note: "固定黑方对手权重",
    createdAt: new Date().toISOString(),
    source: "ai-training.json"
};

fs.writeFileSync(
    path.join(__dirname, "..", "data", "opponent-black.json"),
    JSON.stringify(blackOpponent, null, 2)
);

console.log("✓ 创建 data/opponent-black.json（固定黑方对手）");

// 创建白方对手权重文件（黑棋训练时使用）
// 初始时也使用相同种子，训练后可替换为训练好的白棋权重
var whiteOpponent = {
    nnAssistSchemaVersion: 2,
    nnAssistWeights: seedData.nnAssistWeights,
    note: "固定白方对手权重",
    createdAt: new Date().toISOString(),
    source: "ai-training.json"
};

fs.writeFileSync(
    path.join(__dirname, "..", "data", "opponent-white.json"),
    JSON.stringify(whiteOpponent, null, 2)
);

console.log("✓ 创建 data/opponent-white.json（固定白方对手）");

console.log("\n使用说明：");
console.log("- 训练白棋时（PLAY_BLACK_RATIO=0）：读取 opponent-black.json 作为黑方");
console.log("- 训练黑棋时（PLAY_BLACK_RATIO=1）：读取 opponent-white.json 作为白方");
console.log("- 训练完成后，可将最佳权重复制到对应的对手文件中，形成交替训练");