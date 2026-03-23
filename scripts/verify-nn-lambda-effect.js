/**
 * 验证：同一局面下，纯 ruleAi 与 λ>0 的 nnAssistPick 选点可不同（支撑 M3-T5-a / 进化权重加载后行为可区分）。
 * 不启动浏览器；若 200 次随机浅盘面前均未分叉，则 exit 1。
 */

"use strict";

var boardCore = require("./boardCore");
var ruleAi = require("./ruleAi");
var nnAssistPick = require("./nnAssistPick");
var Neuroevolution = require("./vendor/Neuroevolution");

var LAMBDA = parseFloat(process.env.VERIFY_NN_LAMBDA || "0.12");
if (isNaN(LAMBDA)) {
	LAMBDA = 0.12;
}
var ATTEMPTS = parseInt(process.env.VERIFY_ATTEMPTS || "200", 10);

function randomInt(n) {
	return Math.floor(Math.random() * n);
}

function randomOpeningBoard() {
	var b = boardCore.createEmptyBoard();
	var turn = 0;
	var depth = 4 + randomInt(5);
	var t;
	for (t = 0; t < depth; t++) {
		var cands = boardCore.getLegalCandidates(b);
		if (cands.length === 0) {
			boardCore.applyMove(b, 7, 7, turn);
		} else {
			var j = randomInt(cands.length);
			boardCore.applyMove(b, cands[j].x, cands[j].y, turn);
		}
		if (boardCore.checkWin(b)) {
			return null;
		}
		turn = turn === 0 ? 1 : 0;
	}
	return { board: b, gameTurn: turn };
}

function main() {
	var ne = new Neuroevolution({
		network: [6, [4], 1],
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
		var pr = ruleAi.pickMove(st.board, st.gameTurn);
		var pn = pickNn(st.board, st.gameTurn);
		if (pr.x !== pn.x || pr.y !== pn.y) {
			console.log("[verify-nn-lambda-effect] ok: diverged at attempt", k + 1,
				"rule", pr.x, pr.y, "nnAssist λ=" + LAMBDA, pn.x, pn.y);
			return;
		}
	}
	console.error("[verify-nn-lambda-effect] no divergence in", ATTEMPTS, "tries; raise VERIFY_ATTEMPTS or LAMBDA");
	process.exit(1);
}

main();
