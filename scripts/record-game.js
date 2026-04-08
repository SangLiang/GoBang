/**
 * 记录 NN AI vs Rule AI 的棋谱
 * 
 * 用法：
 *   node scripts/record-game.js                    # 记录1局
 *   node scripts/record-game.js 5                  # 记录5局
 *   node scripts/record-game.js 1 output.txt       # 指定输出文件
 */

"use strict";

var fs = require("fs");
var path = require("path");
var Neuroevolution = require("./vendor/Neuroevolution.js");
var ruleAi = require("./ruleAi.js");
var nnAssistPick = require("./nnAssistPick.js");
var boardCore = require("./boardCore.js");
var nnFeatures = require(path.join(__dirname, "..", "public", "js", "nnFeatures.js"));

var trainingData = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "ai-training.json"), "utf8"));

function createNNAI(lambda) {
    var ne = new Neuroevolution({
        network: [nnFeatures.FEATURE_DIM_V2, nnFeatures.NN_ASSIST_HIDDEN_V2, 1],
        population: 1, elitism: 1, randomBehaviour: 0, mutationRate: 0, historic: 0
    });
    var net = ne.nextGeneration()[0];
    net.setSave(trainingData.nnAssistWeights);
    return nnAssistPick.makePicker(net, lambda || 1000);
}

// 棋盘符号
var SYMBOLS = ["+", "●", "○"];  // 空、黑、白
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

function moveToString(x, y) {
    return COLS[x] + y;
}

function recordGame(blackName, whiteName, blackPick, whitePick) {
    var board = boardCore.createEmptyBoard();
    var moves = [];
    var gameTurn = 0;
    var moveNum = 1;
    
    while (true) {
        var pickFn = gameTurn === 0 ? blackPick : whitePick;
        var pos = pickFn(board, gameTurn);
        
        if (!boardCore.applyMove(board, pos.x, pos.y, gameTurn)) {
            throw new Error("非法落子: " + pos.x + "," + pos.y);
        }
        
        var player = gameTurn === 0 ? "黑" : "白";
        var playerName = gameTurn === 0 ? blackName : whiteName;
        moves.push({
            num: moveNum,
            player: player,
            playerName: playerName,
            x: pos.x,
            y: pos.y,
            pos: moveToString(pos.x, pos.y),
            board: JSON.parse(JSON.stringify(board))
        });
        
        if (boardCore.checkWin(board, pos.x, pos.y)) {
            return {
                winner: player,
                winnerName: playerName,
                moves: moves,
                totalMoves: moveNum
            };
        }
        
        if (moveNum >= 225) {
            return {
                winner: null,
                winnerName: "和棋",
                moves: moves,
                totalMoves: moveNum
            };
        }
        
        gameTurn = gameTurn === 0 ? 1 : 0;
        moveNum++;
    }
}

function gameToText(result, showBoard) {
    var lines = [];
    lines.push("=".repeat(50));
    lines.push("五子棋对局记录");
    lines.push("=".repeat(50));
    lines.push("");
    lines.push("黑方: " + result.moves[0].playerName);
    lines.push("白方: " + result.moves[1].playerName);
    lines.push("结果: " + result.winner + "方(" + result.winnerName + ")胜");
    lines.push("总手数: " + result.totalMoves);
    lines.push("");
    lines.push("-".repeat(50));
    lines.push("棋谱:");
    lines.push("-".repeat(50));
    lines.push("");
    
    // 输出每手棋
    for (var i = 0; i < result.moves.length; i++) {
        var m = result.moves[i];
        lines.push("第" + (m.num < 10 ? " " : "") + m.num + "手: " + m.player + "方 " + m.playerName + " → " + m.pos);
    }
    
    if (showBoard) {
        lines.push("");
        lines.push("-".repeat(50));
        lines.push("最终棋盘:");
        lines.push("-".repeat(50));
        lines.push("");
        var lastMove = result.moves[result.moves.length - 1];
        lines.push(boardToString(lastMove.board));
    }
    
    lines.push("");
    lines.push("=".repeat(50));
    
    return lines.join("\n");
}

// 主函数
var args = process.argv.slice(2);
var numGames = parseInt(args[0]) || 1;
var outputFile = args[1] || null;

var nnAI = createNNAI(1000);
var ruleAI = ruleAi.pickMove;

var allTexts = [];
var nnWins = 0, ruleWins = 0, draws = 0;

console.log("开始记录棋谱...");
console.log("NN AI: 使用 ai-training.json 权重");
console.log("Rule AI: 规则AI");
console.log("");

for (var i = 0; i < numGames; i++) {
    var nnBlack = i % 2 === 0;
    var blackName = nnBlack ? "NN AI" : "Rule AI";
    var whiteName = nnBlack ? "Rule AI" : "NN AI";
    var blackPick = nnBlack ? nnAI : ruleAI;
    var whitePick = nnBlack ? ruleAI : nnAI;
    
    var result = recordGame(blackName, whiteName, blackPick, whitePick);
    
    if (result.winnerName === "NN AI") nnWins++;
    else if (result.winnerName === "Rule AI") ruleWins++;
    else draws++;
    
    var text = gameToText(result, true);
    allTexts.push(text);
    
    console.log("第" + (i+1) + "局完成: " + result.winner + "方(" + result.winnerName + ")胜, " + result.totalMoves + "手");
}

// 汇总
var summary = "\n\n" + "=".repeat(50) + "\n";
summary += "汇总统计\n";
summary += "=".repeat(50) + "\n";
summary += "总局数: " + numGames + "\n";
summary += "NN AI 胜: " + nnWins + "\n";
summary += "Rule AI 胜: " + ruleWins + "\n";
summary += "和棋: " + draws + "\n";

allTexts.push(summary);

var fullText = allTexts.join("\n\n");

if (outputFile) {
    fs.writeFileSync(outputFile, fullText, "utf8");
    console.log("\n棋谱已保存到: " + outputFile);
} else {
    var defaultFile = path.join(__dirname, "..", "data", "game-record.txt");
    fs.writeFileSync(defaultFile, fullText, "utf8");
    console.log("\n棋谱已保存到: data/game-record.txt");
}

console.log("\n" + summary);
