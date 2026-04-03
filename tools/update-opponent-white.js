/**
 * 更新白方对手权重
 * 将训练好的白棋权重复制到 opponent-white.json，供下一轮黑棋训练使用
 * 
 * 用法：
 *   node tools/update-opponent-white.js                    # 使用最新的 evolved 权重
 *   node tools/update-opponent-white.js evolved-xxxx.json  # 使用指定的 evolved 文件
 */

"use strict";

var fs = require("fs");
var path = require("path");

var dataDir = path.join(__dirname, "..", "data");

// 获取命令行参数
var args = process.argv.slice(2);
var sourceFile = args[0] || null;

// 如果没有指定文件，找最新的 evolved 文件
if (!sourceFile) {
	var files = fs.readdirSync(dataDir)
		.filter(function(f) { return f.startsWith("evolved-") && f.endsWith(".json"); })
		.map(function(f) {
			var stat = fs.statSync(path.join(dataDir, f));
			return { file: f, mtime: stat.mtime };
		})
		.sort(function(a, b) { return b.mtime - a.mtime; });
	
	if (files.length === 0) {
		console.error("[update-opponent-white] 错误: 未找到 evolved-*.json 文件");
		console.error("请先运行训练: npm run evolve:self");
		process.exit(1);
	}
	
	sourceFile = files[0].file;
	console.log("[update-opponent-white] 使用最新的训练结果:", sourceFile);
} else {
	console.log("[update-opponent-white] 使用指定的训练结果:", sourceFile);
}

// 读取源文件
var sourcePath = path.isAbsolute(sourceFile) ? sourceFile : path.join(dataDir, sourceFile);
if (!fs.existsSync(sourcePath)) {
	console.error("[update-opponent-white] 错误: 文件不存在:", sourcePath);
	process.exit(1);
}

var sourceData = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

if (!sourceData.nnAssistWeights) {
	console.error("[update-opponent-white] 错误: 源文件中没有 nnAssistWeights");
	process.exit(1);
}

// 读取现有的 opponent-white.json（保留 note 等信息）
var targetPath = path.join(dataDir, "opponent-white.json");
var targetData = {
	nnAssistSchemaVersion: 2,
	nnAssistWeights: sourceData.nnAssistWeights,
	note: "固定白方对手权重（由训练结果更新）",
	updatedAt: new Date().toISOString(),
	source: sourceFile,
	bestFitness: sourceData.bestFitness || null,
	generations: sourceData.generations || null
};

// 保存
fs.writeFileSync(targetPath, JSON.stringify(targetData, null, 2), "utf8");

console.log("[update-opponent-white] ✓ 白方对手权重已更新");
console.log("[update-opponent-white]   文件:", targetPath);
console.log("[update-opponent-white]   来源:", sourceFile);
console.log("[update-opponent-white]   最佳适应度:", sourceData.bestFitness || "N/A");
console.log("");
console.log("现在可以修改 config.js 中 EVOLVE_PLAY_BLACK_RATIO = 1，开始训练黑棋！");