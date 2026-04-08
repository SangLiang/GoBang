/**
 * 验证：同一局面下，纯 ruleAi 与 λ>0 的 nnAssistPick 选点可不同。
 * 不启动浏览器；若 200 次随机浅盘面前均未分叉，则 exit 1。
 */

"use strict";

var path = require("path");
var boardCore = require("./boardCore");
var ruleAi = require("./ruleAi");
var nnAssistPick = require("./nnAssistPick");
var Neuroevolution = require("./vendor/Neuroevolution");
var nnFeatures = require(path.join(__dirname, "..", "public", "js", "nnFeatures.js"));

// 验证强度可通过环境变量调整：
// - VERIFY_NN_LAMBDA：NN 辅助混合系数，越大越容易与纯规则分叉
// - VERIFY_ATTEMPTS：随机抽样局面次数，越大越容易撞到分叉样本
var LAMBDA = parseFloat(process.env.VERIFY_NN_LAMBDA || "0.12");
if (isNaN(LAMBDA)) {
	LAMBDA = 0.12;
}

// 验证次数
var ATTEMPTS = parseInt(process.env.VERIFY_ATTEMPTS || "200", 10);

function randomInt(n) {
	return Math.floor(Math.random() * n);
}

function randomOpeningBoard() {
	var b = boardCore.createEmptyBoard();
	var turn = 0;
	// 生成 4~8 手的浅开局，避免总是空盘导致策略过于单一
	var depth = 4 + randomInt(5);
	var t;
	for (t = 0; t < depth; t++) {
		// 候选落子点数组：[{x:number, y:number}, ...]
		// "与已有子相邻的空位"（8 邻域），已去重并按坐标排序。
		var cands = boardCore.getLegalCandidates(b);
		var lastX, lastY;
		if (cands.length === 0) {
			// 空盘等早期情况可能没有候选，按项目约定先落中心点。
			lastX = 7; lastY = 7;
			boardCore.applyMove(b, lastX, lastY, turn);
		} else {
			// 从候选点里均匀随机挑一个，构造随机浅开局样本。
			var j = randomInt(cands.length);
			lastX = cands[j].x; lastY = cands[j].y;
			boardCore.applyMove(b, lastX, lastY, turn);
		}
		// 若随机过程已出现终局，丢弃该样本并重抽
		if (boardCore.checkWin(b, lastX, lastY)) {
			return null;
		}
		turn = turn === 0 ? 1 : 0;
	}
		// 若随机过程已出现终局，丢弃该样本并重抽
		if (boardCore.checkWin(b)) {
			return null;
		}
		turn = turn === 0 ? 1 : 0;
	}
	return { board: b, gameTurn: turn };
}

function main() {
	var ne = new Neuroevolution({
		network: [nnFeatures.FEATURE_DIM, nnFeatures.NN_ASSIST_HIDDEN, 1],
		population: 1,
		elitism: 1,
		randomBehaviour: 0,
		mutationRate: 0,
		historic: 0
	});
	var net = ne.nextGeneration()[0];
	var pickNn = nnAssistPick.makePicker(net, LAMBDA);

	var k;
	for (k = 0; k < ATTEMPTS; k++) {
		var st = randomOpeningBoard();
		if (!st) {
			continue;
		}
		// 纯规则分叉
		var pr = ruleAi.pickMove(st.board, st.gameTurn);

		// NN 辅助分叉
		var pn = pickNn(st.board, st.gameTurn);
		
		// 只要任意一次选点不同，就证明 λ 混合确实影响了决策路径
		if (pr.x !== pn.x || pr.y !== pn.y) {
			console.log("[verify-nn-lambda-effect] ok: diverged at attempt", k + 1,
				"rule", pr.x, pr.y, "nnAssist λ=" + LAMBDA, pn.x, pn.y);
			return;
		}
	}
	// 全部样本都不分叉通常说明 λ 太小或样本不足，可增大尝试次数再验
	console.error("[verify-nn-lambda-effect] no divergence in", ATTEMPTS, "tries; raise VERIFY_ATTEMPTS or LAMBDA");
	process.exit(1);
}

main();

