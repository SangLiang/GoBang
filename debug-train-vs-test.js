/**
 * 精准对比：训练评估 vs 重新加载后的行为
 * 使用完全相同的权重和对手
 */

"use strict";

var fs = require("fs");
var path = require("path");
var boardCore = require("./scripts/boardCore.js");
var nnFeatures = require(path.join(__dirname, "public", "js", "nnFeatures.js"));
var nnAssistPick = require("./scripts/nnAssistPick.js");
var playout = require("./scripts/playout.js");

function makeNetworkFromSave(save) {
	var Neuroevolution = require("./scripts/vendor/Neuroevolution.js");
	var ne = new Neuroevolution({
		network: [nnFeatures.FEATURE_DIM_V2, nnFeatures.NN_ASSIST_HIDDEN_V2, 1],
		population: 1, elitism: 1, randomBehaviour: 0, mutationRate: 0, historic: 0
	});
	var n = ne.nextGeneration()[0];
	if (save) n.setSave(save);
	return n;
}

function mutateSave(save, range) {
	var out = { neurons: save.neurons.slice(), weights: [] };
	for (var i = 0; i < save.weights.length; i++) {
		out.weights.push(save.weights[i] + (Math.random() * 2 - 1) * range);
	}
	return out;
}

// 加载权重
var aiTraining = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "ai-training.json"), "utf8"));
var opponentBlack = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "opponent-black.json"), "utf8"));

var blackSave = opponentBlack.nnAssistWeights;

console.log("=== 精准对比：训练评估 vs 重新加载 ===\n");

// ===== 阶段1：模拟训练评估 =====
console.log("阶段1：模拟训练评估（创建网络 → 评估 → 保存）");

// 创建白方（扰动变种，模拟第0代个体#0）
var whiteSave = mutateSave(aiTraining.nnAssistWeights, 0.3);
var whiteNetA = makeNetworkFromSave(whiteSave);
var whitePickA = nnAssistPick.makePicker(whiteNetA, 1000);

// 创建黑方（固定对手，模拟selfOpponentPick）
var blackNetA = makeNetworkFromSave(blackSave);
var blackPickA = nnAssistPick.makePicker(blackNetA, 1000);

var trainWins = 0;
for (var i = 0; i < 7; i++) {
	var r = playout.playOneGame(blackPickA, whitePickA);
	if (r.winner === "white") trainWins++;
}
console.log("  训练评估: 白方 " + trainWins + "/7 胜");

// 保存白方权重（模拟bestSave）
var savedWhiteSave = whiteNetA.getSave();

// ===== 阶段2：重新加载并测试 =====
console.log("\n阶段2：重新加载保存的权重并测试");

// 重新创建白方（从保存的权重）
var whiteNetB = makeNetworkFromSave(savedWhiteSave);
var whitePickB = nnAssistPick.makePicker(whiteNetB, 1000);

// 重新创建黑方（从相同的对手权重）
var blackNetB = makeNetworkFromSave(blackSave);
var blackPickB = nnAssistPick.makePicker(blackNetB, 1000);

var testWins = 0;
for (var i = 0; i < 7; i++) {
	var r = playout.playOneGame(blackPickB, whitePickB);
	if (r.winner === "white") testWins++;
}
console.log("  重新加载测试: 白方 " + testWins + "/7 胜");

// ===== 阶段3：对比走法 =====
console.log("\n阶段3：对比具体走法");

console.log("  训练时第1局走法:");
var board1 = boardCore.createEmptyBoard();
var turn1 = 0;
var moves1 = [];
while (moves1.length < 12) {
	var pick1 = turn1 === 0 ? blackPickA : whitePickA;
	var pos1 = pick1(board1, turn1);
	boardCore.applyMove(board1, pos1.x, pos1.y, turn1);
	moves1.push((turn1===0?"黑":"白") + String.fromCharCode(65+pos1.x) + pos1.y);
	if (boardCore.checkWin(board1)) break;
	turn1 = turn1 === 0 ? 1 : 0;
}
console.log("    " + moves1.join(" → "));

console.log("  重新加载后第1局走法:");
var board2 = boardCore.createEmptyBoard();
var turn2 = 0;
var moves2 = [];
while (moves2.length < 12) {
	var pick2 = turn2 === 0 ? blackPickB : whitePickB;
	var pos2 = pick2(board2, turn2);
	boardCore.applyMove(board2, pos2.x, pos2.y, turn2);
	moves2.push((turn2===0?"黑":"白") + String.fromCharCode(65+pos2.x) + pos2.y);
	if (boardCore.checkWin(board2)) break;
	turn2 = turn2 === 0 ? 1 : 0;
}
console.log("    " + moves2.join(" → "));

// ===== 结论 =====
console.log("\n=== 结论 ===");
if (trainWins === testWins && moves1.join("") === moves2.join("")) {
	console.log("✓ 训练评估和重新加载后完全一致");
	console.log("  如果训练显示7胜但测试显示0胜，说明测试脚本用的权重不同");
} else if (trainWins === testWins) {
	console.log("△ 胜负一致但走法不同（可能是随机性导致）");
} else {
	console.log("✗ 训练评估(" + trainWins + "胜) ≠ 重新加载测试(" + testWins + "胜)");
	console.log("  这说明 getSave/setSave 或网络创建过程有问题！");
}
