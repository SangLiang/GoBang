"use strict";

var boardCore = require("./boardCore");
var nnFeatures = require("../public/js/nnFeatures");

/**
 * 轻量断言工具：校验失败时直接抛错中断脚本。
 * verify 脚本的定位是“快速失败”，便于第一时间看到不一致位置。
 */
function assert(cond, msg) {
	if (!cond) {
		throw new Error(msg);
	}
}

/**
 * 批量向棋盘写入测试子。
 * stones: [[x, y, stone], ...]，stone 取值 1/2。
 */
function setStones(board, stones) {
	for (var i = 0; i < stones.length; i++) {
		var s = stones[i];
		board[s[0]][s[1]] = s[2];
	}
}

/**
 * 核心校验逻辑（单个测试局面）：
 * 1) 分别调用浏览器端/Node 端 v2 特征提取
 * 2) 校验维度必须为 22
 * 3) 校验每一维都在 [0,1] 且无 NaN
 * 4) 校验两端逐维完全一致（允许极小浮点误差）
 */
function checkOneCase(name, board, x, y, player) {
	var stones = boardCore.countStones(board);
	var b = nnFeatures.buildFeaturesV2(board, x, y, player, {
		stonesOnBoard: stones,
		isMyTurn: 1
	});
	var n = boardCore.buildLocalFeatures(board, x, y, player, stones);
	assert(b.length === 22, name + " browser dim != 22");
	assert(n.length === 22, name + " node dim != 22");

	for (var i = 0; i < 22; i++) {
		assert(!isNaN(b[i]), name + " browser NaN @" + i);
		assert(!isNaN(n[i]), name + " node NaN @" + i);
		assert(b[i] >= 0 && b[i] <= 1, name + " browser out of range @" + i + " = " + b[i]);
		assert(n[i] >= 0 && n[i] <= 1, name + " node out of range @" + i + " = " + n[i]);
		assert(Math.abs(b[i] - n[i]) < 1e-12, name + " mismatch @" + i + ": " + b[i] + " vs " + n[i]);
	}
	console.log("[verify-features] pass:", name);
}

/**
 * 入口：构造几个覆盖关键形态的测试局面。
 * - gap-and-diagonal: 覆盖跳空 + 斜线影响
 * - opp-threat: 覆盖对手连续威胁方向
 * - edge-case: 覆盖边界坐标行为
 */
function main() {
	var case1 = boardCore.createEmptyBoard();
	setStones(case1, [
		[6, 7, 1], [7, 7, 1], [9, 7, 1], // 构造我方跳空
		[6, 6, 2], [8, 8, 2]
	]);
	checkOneCase("gap-and-diagonal", case1, 8, 7, 1);

	var case2 = boardCore.createEmptyBoard();
	setStones(case2, [
		[5, 7, 2], [6, 7, 2], [8, 7, 2], // 对手横向威胁
		[7, 6, 1], [7, 8, 1]
	]);
	checkOneCase("opp-threat", case2, 7, 7, 1);

	var case3 = boardCore.createEmptyBoard();
	setStones(case3, [
		[0, 1, 1], [1, 1, 1], [2, 1, 2], [1, 0, 2]
	]);
	checkOneCase("edge-case", case3, 0, 0, 1);

	console.log("[verify-features] all passed");
}

main();
