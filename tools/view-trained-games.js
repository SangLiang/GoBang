/**
 * 查看训练后的白方 vs 固定黑方的棋谱
 */

"use strict";

var fs = require("fs");
var path = require("path");
var boardCore = require(path.join(__dirname, "..", "scripts", "boardCore.js"));
var nnFeatures = require(path.join(__dirname, "..", "public", "js", "nnFeatures.js"));
var nnAssistPick = require(path.join(__dirname, "..", "scripts", "nnAssistPick.js"));
var playout = require(path.join(__dirname, "..", "scripts", "playout.js"));

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

// 加载两个权重
var seedData = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "ai-training.json"), "utf8"));
var evolvedData = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "evolved-2026-04-03T03-15-30-640Z.json"), "utf8"));

var seedSave = seedData.nnAssistWeights;
var evolvedSave = evolvedData.nnAssistWeights;

console.log("训练结果验证：白方(进化) vs 黑方(种子)");
console.log("=====================================");
console.log("黑方: 种子权重 (原始AI)");
console.log("白方: 进化后的权重 (训练50代)");
console.log("白方最佳适应度: " + evolvedData.bestFitness);
console.log("=====================================\n");

// 创建双方
var blackNet = makeNetworkFromSave(seedSave);
var whiteNet = makeNetworkFromSave(evolvedSave);

var blackPick = nnAssistPick.makePicker(blackNet, 1000);
var whitePick = nnAssistPick.makePicker(whiteNet, 1000);

// 记录3局详细棋谱
var allTexts = [];

for (var i = 0; i < 3; i++) {
    var result = recordGame(blackPick, whitePick);
    
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

// 统计10局
var blackWins = 0, whiteWins = 0;
for (var i = 0; i < 10; i++) {
    var result = recordGame(blackPick, whitePick);
    if (result.winner === "黑") blackWins++;
    else if (result.winner === "白") whiteWins++;
}

var summary = "\n" + "=".repeat(50) + "\n";
summary += "10局统计\n";
summary += "=".repeat(50) + "\n";
summary += "黑方胜(种子): " + blackWins + "\n";
summary += "白方胜(进化): " + whiteWins + "\n";
summary += "和棋: " + (10 - blackWins - whiteWins) + "\n";

allTexts.push(summary);
console.log(summary);

var fullText = allTexts.join("\n\n");
var outputFile = path.join(__dirname, "..", "data", "trained-white-games.txt");
fs.writeFileSync(outputFile, fullText, "utf8");
console.log("详细棋谱已保存到: data/trained-white-games.txt");