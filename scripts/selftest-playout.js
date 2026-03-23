/**
 * 验收 playout：playOneGame、fitnessFromResult。
 */

"use strict";

var assert = require("assert");
var boardCore = require("./boardCore");
var ruleAi = require("./ruleAi");
var playout = require("./playout");

function testFitnessDefaults() {
	// 计划：胜=1 负=-1 平=0（不传 options 时和棋为 0）
	assert.strictEqual(playout.fitnessFromResult("black", true), 1);
	assert.strictEqual(playout.fitnessFromResult("white", true), -1);
	assert.strictEqual(playout.fitnessFromResult("white", false), 1);
	assert.strictEqual(playout.fitnessFromResult("black", false), -1);
	assert.strictEqual(playout.fitnessFromResult(null, true), 0);
	assert.strictEqual(playout.fitnessFromResult(null, false), 0);
}

function testRuleVsRule() {
	var i;
	for (i = 0; i < 3; i++) {
		var r = playout.playOneGame(ruleAi.pickMove, ruleAi.pickMove);
		assert(r.board && r.board.length === boardCore.BOARD_SIZE);
		assert(typeof r.moves === "number" && r.moves > 0);
		assert(r.winner === "black" || r.winner === "white" || r.winner === null);
	}
}

function main() {
	testFitnessDefaults();
	testRuleVsRule();
	console.log("[selftest-playout] ok");
}

main();

