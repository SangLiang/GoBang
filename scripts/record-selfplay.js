/**
 * 记录 NN AI vs NN AI 自对弈棋谱
 * 
 * 用法：
 *   node scripts/record-selfplay.js                    # 记录1局（使用种子权重）
 *   node scripts/record-selfplay.js 5                  # 记录5局
 *   node scripts/record-selfplay.js 1 output.txt       # 指定输出文件
 */

"use strict";

var fs = require("fs");
var path = require("path");
var boardCore = require("./boardCore.js");
var nnFeatures = require(path.join(__dirname, "..", "public", "js", "nnFeatures.js"));
var nnAssistPick = require("./nnAssistPick.js");

// 加载配置
var config = require(path.join(__dirname, "..", "config.js"));

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

function recordGame(blackPick, whitePick) {
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
        
        moves.push({
            num: moveNum,
            player: gameTurn === 0 ? "黑" : "白",
            x: pos.x,
            y: pos.y,
            pos: moveToString(pos.x, pos.y),
            board: JSON.parse(JSON.stringify(board))
        });
        
        if (boardCore.checkWin(board)) {
            return {
                winner: gameTurn === 0 ? "黑" : "白",
                moves: moves,
                totalMoves: moveNum
            };
        }
        
        if (moveNum >= 225) {
            return {
                winner: null,
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
    lines.push("五子棋 NN AI 自对弈对局记录");
    lines.push("=".repeat(50));
    lines.push("");
    lines.push("黑方: NN AI");
    lines.push("白方: NN AI");
    lines.push("结果: " + (result.winner ? result.winner + "方胜" : "和棋"));
    lines.push("总手数: " + result.totalMoves);
    lines.push("");
    lines.push("-".repeat(50));
    lines.push("棋谱:");
    lines.push("-".repeat(50));
    lines.push("");
    
    // 输出每手棋
    for (var i = 0; i < result.moves.length; i++) {
        var m = result.moves[i];
        lines.push("第" + (m.num < 10 ? " " : "") + m.num + "手: " + m.player + "方 → " + m.pos);
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
function main() {
    var args = process.argv.slice(2);
    var numGames = parseInt(args[0]) || 1;
    var outputFile = args[1] || null;
    
    // 加载种子权重
    var seedSave = null;
    var seedFile = config.EVOLVE_SEED_FILE || "data/ai-training.json";
    
    try {
        var projectRoot = path.join(__dirname, "..");
        var resolvedPath = path.isAbsolute(seedFile) ? seedFile : path.join(projectRoot, seedFile);
        if (fs.existsSync(resolvedPath)) {
            var raw = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
            if (raw.nnAssistWeights) {
                seedSave = raw.nnAssistWeights;
            } else if (raw.weights) {
                seedSave = raw.weights;
            } else if (raw.records && raw.records.length > 0 && raw.records[0].nnAssistWeights) {
                seedSave = raw.records[0].nnAssistWeights;
            }
            if (seedSave) {
                console.log("[record-selfplay] 已加载种子权重:", resolvedPath);
            }
        }
    } catch (e) {
        console.warn("[record-selfplay] 加载种子失败:", e.message);
    }
    
    console.log("开始记录 NN AI 自对弈棋谱...");
    console.log("");
    
    var allTexts = [];
    var blackWins = 0, whiteWins = 0, draws = 0;
    
    for (var i = 0; i < numGames; i++) {
        // 创建两个独立的网络实例
        var Neuroevolution = require("./vendor/Neuroevolution.js");
        
        var ne1 = new Neuroevolution({
            network: [nnFeatures.FEATURE_DIM_V2, nnFeatures.NN_ASSIST_HIDDEN_V2, 1],
            population: 1, elitism: 1, randomBehaviour: 0, mutationRate: 0, historic: 0
        });
        var net1 = ne1.nextGeneration()[0];
        
        var ne2 = new Neuroevolution({
            network: [nnFeatures.FEATURE_DIM_V2, nnFeatures.NN_ASSIST_HIDDEN_V2, 1],
            population: 1, elitism: 1, randomBehaviour: 0, mutationRate: 0, historic: 0
        });
        var net2 = ne2.nextGeneration()[0];
        
        if (seedSave) {
            net1.setSave(seedSave);
            net2.setSave(seedSave);
        }
        
        var pick1 = nnAssistPick.makePicker(net1, config.NN_LAMBDA || 1000);
        var pick2 = nnAssistPick.makePicker(net2, config.NN_LAMBDA || 1000);
        
        // 随机决定哪个网络执黑
        var result;
        if (Math.random() < 0.5) {
            result = recordGame(pick1, pick2);
        } else {
            result = recordGame(pick2, pick1);
        }
        
        if (result.winner === "黑") blackWins++;
        else if (result.winner === "白") whiteWins++;
        else draws++;
        
        var text = gameToText(result, true);
        allTexts.push(text);
        
        console.log("第" + (i+1) + "局: " + (result.winner ? result.winner + "方胜" : "和棋") + ", " + result.totalMoves + "手");
    }
    
    // 汇总
    var summary = "\n\n" + "=".repeat(50) + "\n";
    summary += "汇总统计\n";
    summary += "=".repeat(50) + "\n";
    summary += "总局数: " + numGames + "\n";
    summary += "黑方胜: " + blackWins + "\n";
    summary += "白方胜: " + whiteWins + "\n";
    summary += "和棋: " + draws + "\n";
    
    allTexts.push(summary);
    
    var fullText = allTexts.join("\n\n");
    
    if (outputFile) {
        fs.writeFileSync(outputFile, fullText, "utf8");
        console.log("\n棋谱已保存到: " + outputFile);
    } else {
        var defaultFile = path.join(__dirname, "..", "data", "selfplay-record.txt");
        fs.writeFileSync(defaultFile, fullText, "utf8");
        console.log("\n棋谱已保存到: data/selfplay-record.txt");
    }
    
    console.log("\n" + summary);
}

main();