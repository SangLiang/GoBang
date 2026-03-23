"use strict";

var assert = require("assert");
var boardCore = require("./boardCore");
var ruleAi = require("./ruleAi");
var playout = require("./playout");

function testWinHorizontal() {
	var b = boardCore.createEmptyBoard();
	var y;
	for (y = 0; y < 5; y++) {
		assert.strictEqual(boardCore.applyMove(b, y, 0, 0), true);
	}
	assert.strictEqual(boardCore.checkWin(b), true);
}

function testParityEmptyBoardNoWin() {
	var b = boardCore.createEmptyBoard();
	assert.strictEqual(boardCore.checkWin(b), false);
}

function testRandomPlayoutNoThrow() {
	var rng = 0;
	function randomPick(board, gameTurn) {
		var empties = [];
		var x;
		var y;
		for (x = 0; x < boardCore.BOARD_SIZE; x++) {
			for (y = 0; y < boardCore.BOARD_SIZE; y++) {
				if (board[x][y] === 0) {
					empties.push({ x: x, y: y });
				}
			}
		}
		rng = (rng * 9301 + 49297) % 233280;
		var idx = rng % empties.length;
		return empties[idx];
	}

	var i;
	for (i = 0; i < 40; i++) {
		playout.playOneGame(randomPick, randomPick);
	}
}

function testRuleVsRuleMany() {
	var i;
	for (i = 0; i < 30; i++) {
		playout.playOneGame(ruleAi.pickMove, ruleAi.pickMove);
	}
}

testWinHorizontal();
testParityEmptyBoardNoWin();
testRandomPlayoutNoThrow();
testRuleVsRuleMany();

console.log("[selftest-board] ok");
