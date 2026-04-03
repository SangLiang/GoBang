/**
 * 查看训练后的棋谱
 * 自动加载最新的 evolved 权重和对应的对手权重文件
 * 
 * 用法：
 *   npm run tools:view-games
 *   node tools/view-trained-games.js
 */

"use strict";

var fs = require("fs");
var path = require("path");
var boardCore = require(path.join(__dirname, "..", "scripts", "boardCore.js"));
var nnFeatures = require(path.join(__dirname, "..", "public", "js", "nnFeatures.js"));
var nnAssistPick = require(path.join(__dirname, "..", "scripts", "nnAssistPick.js"));

function makeNetworkFromSave(save) {
	var Neuroevolution = require(path.join(__dirname, "..", "scripts", "vendor", "Neuroevolution.js"));
	var ne = new Neuroevolution({
		network: [nnFeatures.FEATURE_DIM_V2, nnFeatures.NN_ASSIST_HIDDEN_V2, 1],
		population: 1, elitism: 1, randomBehaviour: 0, mutationRate: 0, historic: 0
	});
	var n = ne.nextGeneration()[0];
	if (save) n.setSave(save);
	return n;
}

// 棋盘符号
var SYMBOLS = ["+", "●", "○"];
var COLS = "ABCDEFGHIJKLMNO";

function boardToString(board) {
	var lines = [];
	lines.push("   A B C D E F G H I J K L M N O");
	lines.push("  +" + "-".repeat(29) + "+");
	for (var y = 0; y < 15; y++) {
		var row = (y < 10 ? " " : "") + y + "|";
		for (var x = 0; x < 15; x++) {
			row += SYMBOLS[board[x][y]] + " ";
		}
		row += "|";
		lines.push(row);
	}
	lines.push("  +" + "-".repeat(29) + "+");
	return lines.join("\n");
}

function recordGame(blackPick, whitePick) {
	var board = boardCore.createEmptyBoard();
	var moves = [];
	var turn = 0;
	
	while (moves.length < 225) {
		var pick = turn === 0 ? blackPick : whitePick;
		var pos = pick(board, turn);
		boardCore.applyMove(board, pos.x, pos.y, turn);
		moves.push({
			num: moves.length + 1,
			player: turn === 0 ? "黑" : "白",
			pos: COLS[pos.x] + pos.y,
			board: JSON.parse(JSON.stringify(board))
		});
		if (boardCore.checkWin(board)) {
			return { winner: turn === 0 ? "黑" : "白", moves: moves };
		}
		turn = turn === 0 ? 1 : 0;
	}
	return { winner: null, moves: moves };
}

var dataDir = path.join(__dirname, "..", "data");
var evolvedDir = path.join(dataDir, "evolved");
var config = require(path.join(__dirname, "..", "config.js"));

// 自动找最新的 evolved 文件
var evolvedFiles = fs.readdirSync(evolvedDir)
	.filter(function(f) { return f.startsWith("evolved-") && f.endsWith(".json"); })
	.map(function(f) { return { file: f, mtime: fs.statSync(path.join(evolvedDir, f)).mtime }; })
	.sort(function(a, b) { return b.mtime - a.mtime; });

if (evolvedFiles.length === 0) {
	console.error("未找到 evolved-*.json 文件，请先运行训练: npm run evolve:self");
	process.exit(1);
}

var latestEvolved = evolvedFiles[0].file;
var evolvedData = JSON.parse(fs.readFileSync(path.join(evolvedDir, latestEvolved), "utf8"));

// 从 config.js 读取当前训练配置
var playBlackRatio = parseFloat(config.EVOLVE_PLAY_BLACK_RATIO !== undefined ? config.EVOLVE_PLAY_BLACK_RATIO : "0");
var opponentFile = playBlackRatio === 0 ? config.EVOLVE_OPPONENT_BLACK_FILE : config.EVOLVE_OPPONENT_WHITE_FILE;
var opponentPath = path.isAbsolute(opponentFile) ? opponentFile : path.join(__dirname, "..", opponentFile);

if (!fs.existsSync(opponentPath)) {
	console.error("对手文件不存在: " + opponentPath);
	console.error("请先运行: npm run tools:init-opponents");
	process.exit(1);
}

var opponentData = JSON.parse(fs.readFileSync(opponentPath, "utf8"));

var evolvedSave = evolvedData.nnAssistWeights;
var opponentSave = opponentData.nnAssistWeights;

var trainedSide = playBlackRatio === 0 ? "白方" : "黑方";
var opponentSide = playBlackRatio === 0 ? "黑方" : "白方";
var opponentNote = playBlackRatio === 0 ? "opponent-black.json" : "opponent-white.json";

console.log("训练结果验证：" + trainedSide + "(进化) vs " + opponentSide + "(固定对手)");
console.log("=====================================");
console.log("训练结果: " + latestEvolved);
console.log("对手文件: " + opponentNote);
console.log(trainedSide + "最佳适应度: " + evolvedData.bestFitness);
console.log("=====================================\n");

// 创建双方
var blackSave = playBlackRatio === 0 ? opponentSave : evolvedSave;
var whiteSave = playBlackRatio === 0 ? evolvedSave : opponentSave;

var blackNet = makeNetworkFromSave(blackSave);
var whiteNet = makeNetworkFromSave(whiteSave);

var blackPick = nnAssistPick.makePicker(blackNet, 1000);
var whitePick = nnAssistPick.makePicker(whiteNet, 1000);

// 记录10局详细棋谱
var allTexts = [];
var trainedWins = 0, opponentWins = 0;

for (var i = 0; i < 10; i++) {
	var result = recordGame(blackPick, whitePick);
	
	var isTrainedWin = result.winner === (playBlackRatio === 0 ? "白" : "黑");
	if (isTrainedWin) trainedWins++;
	else if (result.winner) opponentWins++;
	
	var lines = [];
	lines.push("=".repeat(50));
	lines.push("第" + (i+1) + "局: " + (result.winner ? result.winner + "方胜" : "和棋") + ", " + result.moves.length + "手");
	lines.push("=".repeat(50));
	lines.push("");
	
	for (var j = 0; j < result.moves.length; j++) {
		var m = result.moves[j];
		lines.push("第" + (m.num < 10 ? " " : "") + m.num + "手: " + m.player + "方 " + m.pos);
	}
	
	lines.push("");
	lines.push("最终棋盘:");
	lines.push(boardToString(result.moves[result.moves.length - 1].board));
	lines.push("");
	
	allTexts.push(lines.join("\n"));
	console.log("第" + (i+1) + "局: " + (result.winner ? result.winner + "方胜" : "和棋") + ", " + result.moves.length + "手");
}

var summary = "\n" + "=".repeat(50) + "\n";
summary += "10局统计\n";
summary += "=".repeat(50) + "\n";
summary += trainedSide + "胜(进化): " + trainedWins + "\n";
summary += opponentSide + "胜(对手): " + opponentWins + "\n";
summary += "和棋: " + (10 - trainedWins - opponentWins) + "\n";

allTexts.push(summary);
console.log(summary);

var gamesDir = path.join(dataDir, "games");
if (!fs.existsSync(gamesDir)) {
	fs.mkdirSync(gamesDir, { recursive: true });
}

var fullText = allTexts.join("\n\n");
var stamp = new Date().toISOString().replace(/[:.]/g, "-");
var outputFile = path.join(gamesDir, "games-" + stamp + ".txt");
fs.writeFileSync(outputFile, fullText, "utf8");
console.log("详细棋谱已保存到: " + path.relative(path.join(__dirname, ".."), outputFile));
