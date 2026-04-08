"use strict";

/**
 * 胜利检测性能对比测试
 * 对比全盘扫描 vs 局部检测的性能差异
 */

var boardCore = require("./boardCore");

function benchmark(name, fn, iterations) {
	var start = process.hrtime.bigint();
	for (var i = 0; i < iterations; i++) {
		fn();
	}
	var end = process.hrtime.bigint();
	var ms = Number(end - start) / 1e6;
	console.log(name + ": " + ms.toFixed(2) + "ms (" + iterations + " 次)");
	return ms;
}

// 创建一个有多个棋子的棋盘
function createTestBoard() {
	var b = boardCore.createEmptyBoard();
	// 模拟一局对弈的中盘状态
	var moves = [
		[7, 7, 0], [7, 8, 1], [8, 7, 0], [8, 8, 1],
		[6, 7, 0], [6, 8, 1], [9, 7, 0], [9, 8, 1],
		[5, 7, 0], [5, 8, 1], [10, 7, 0], [10, 8, 1],
		[4, 7, 0]  // 黑棋五连的最后一子
	];
	for (var i = 0; i < moves.length; i++) {
		boardCore.applyMove(b, moves[i][0], moves[i][1], moves[i][2]);
	}
	return { board: b, lastX: 4, lastY: 7 };
}

function main() {
	console.log("=== 胜利检测性能对比 ===\n");
	
	var test = createTestBoard();
	var iterations = 10000;
	
	// 测试1: 高效模式（传入最后落子坐标）
	var fastTime = benchmark(
		"高效模式(局部检测)",
		function() { boardCore.checkWin(test.board, test.lastX, test.lastY); },
		iterations
	);
	
	// 测试2: 兼容模式（全盘扫描）
	var slowTime = benchmark(
		"兼容模式(全盘扫描)",
		function() { boardCore.checkWin(test.board); },
		iterations
	);
	
	console.log("\n性能提升: " + (slowTime / fastTime).toFixed(1) + "x");
	console.log("\n说明:");
	console.log("- 高效模式: 只检查最后落子点的4个方向 (O(1))");
	console.log("- 兼容模式: 遍历整个15x15棋盘 (O(n²))");
	console.log("- AI训练/对弈时使用高效模式");
}

main();
