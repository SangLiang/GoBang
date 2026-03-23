/**
 * 一局对弈：双方通过 pick(board, gameTurn) => {x,y} 落子。
 */

"use strict";

var boardCore = require("./boardCore");

/**
 * @param {function} blackPick (gameList, gameTurn) => {x,y}  gameTurn 恒为 0
 * @param {function} whitePick (gameList, gameTurn) => {x,y}  gameTurn 恒为 1
 * @returns {{ winner: 'black'|'white'|null, moves: number, board: number[][] }}
 *   winner null 表示棋盘满仍未五连（平局处理为 null，适应度可按 0）
 */
function playOneGame(blackPick, whitePick) {
	var board = boardCore.createEmptyBoard();
	var gameTurn = 0;
	var moves = 0;
	var maxMoves = boardCore.BOARD_SIZE * boardCore.BOARD_SIZE;

	while (moves < maxMoves) {
		var pickFn = gameTurn === 0 ? blackPick : whitePick;
		var pos = pickFn(board, gameTurn);
		if (!boardCore.applyMove(board, pos.x, pos.y, gameTurn)) {
			throw new Error("playOneGame: illegal move " + pos.x + "," + pos.y + " turn=" + gameTurn);
		}
		moves++;
		if (boardCore.checkWin(board)) {
			return {
				winner: gameTurn === 0 ? "black" : "white",
				moves: moves,
				board: board
			};
		}
		gameTurn = gameTurn === 0 ? 1 : 0;
	}

	return { winner: null, moves: moves, board: board };
}

/**
 * @param {'black'|'white'|null} winner
 * @param {boolean} playingAsBlack 当前评估方是否执黑
 * @param {number} [moves] 本局总手数（用于胜局越快略加分，可选）
 * @param {object} [options]
 * @param {number} [options.drawFitness] 和棋（满盘无五连）得分，默认 0
 * @param {number} [options.winSpeedBonus] 胜局时按剩余步数比例加的奖励上限，默认 0
 */
function fitnessFromResult(winner, playingAsBlack, moves, options) {
	if (typeof moves === "object" && moves !== null && options === undefined) {
		options = moves;
		moves = undefined;
	}
	options = options || {};
	var drawFitness = options.drawFitness !== undefined ? options.drawFitness : 0;
	var winSpeedBonus = options.winSpeedBonus !== undefined ? options.winSpeedBonus : 0;
	var maxCells = 225;

	if (winner === null) {
		return drawFitness;
	}
	var won = (playingAsBlack && winner === "black") || (!playingAsBlack && winner === "white");
	if (won) {
		var extra = 0;
		if (winSpeedBonus > 0 && moves != null && moves > 0) {
			extra = winSpeedBonus * (maxCells - Math.min(moves, maxCells)) / maxCells;
		}
		return 1 + extra;
	}
	return -1;
}

module.exports = {
	playOneGame: playOneGame,
	fitnessFromResult: fitnessFromResult
};
