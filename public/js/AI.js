// AI部分

var util = require("./util");
var gameLogic = require("./gameLogic");
var UI = require("./UI");
var trainingApi = require("./trainingApi");
var nnAssist = require("./nnAssist");
var nnFeatures = require("./nnFeatures");

function AI() {
    var self = this;
    self.horizontalList = [];
    self.verticaList = [];
    self.viceDiagonalList = [];
    self.mainDiagonalList = [];
    self.init();
}

AI.prototype = {
    
    "init": function () {
        // console.log("AI ready");
    },

    /*
     * AI放棋子
     * @param gameTurn 游戏的先后手
     */

    "shotPiece": function (gameTurn, gameList) {

        // 胜利的权重列表
        var _win_weight_list = [];
        // 失败的权重列表 
        var _danger_weight_list = [];
        // 生成需要检测的威胁落子点
        gameLogic.checkDanger();

        var position = {};

        if (window.needComputePlace.length > 0) {

            var nnEnabled = typeof NN_ASSIST_ENABLED !== "undefined" && NN_ASSIST_ENABLED;
            var nnLambda = typeof NN_LAMBDA === "number" ? NN_LAMBDA : 0;
            var useNnAssist = nnEnabled && nnLambda !== 0;

            var _turnAttack = null;
            if (window.gameTurn == 0) {
                _turnAttack = 1;
            } else if (window.gameTurn == 1) {
                _turnAttack = 2;
            }

            var _turnDefense = null;
            if (window.gameTurn == 0) {
                _turnDefense = 2;
            } else if (window.gameTurn == 1) {
                _turnDefense = 1;
            }

            var candLen = window.needComputePlace.length;
            var stonesOnBoard = trainingApi.countStones(gameList);
            // 从候选列表中取某个分数字段的 Top1/Top2，用于观察“前二分差”。
            function getTop2ByKey(list, key) {
                var first = null;
                var second = null;
                for (var ti = 0; ti < list.length; ti++) {
                    var cur = list[ti];
                    if (!first || cur[key] > first[key]) {
                        second = first;
                        first = cur;
                    } else if (!second || cur[key] > second[key]) {
                        second = cur;
                    }
                }
                return { "first": first, "second": second };
            }

            // 复用当前决策规则：比较 winPoint 与 dangerPoint 的 weight，返回最终点位。
            function choosePointByWeight(winPoint, dangerPoint) {
                if (winPoint.weight > dangerPoint.weight) {
                    return { "x": winPoint.x, "y": winPoint.y };
                }
                return { "x": dangerPoint.x, "y": dangerPoint.y };
            }

            if (useNnAssist) {
                console.log("[AI][NN] assist on", {
                    "lambda": nnLambda,
                    "candidateCount": candLen,
                    "stonesOnBoard": stonesOnBoard,
                    "turnAttack": _turnAttack,
                    "turnDefense": _turnDefense
                });
                for (var i = 0; i < candLen; i++) {
                    var cx = window.needComputePlace[i].x;
                    var cy = window.needComputePlace[i].y;
                    var attackScore = gameLogic.getTheGameWeight(gameList, cx, cy, _turnAttack);
                    var defenseScore = gameLogic.getTheGameWeight(gameList, cx, cy, _turnDefense);
                    var feat = nnFeatures.buildFeatures(gameList, cx, cy, {
                        "attackScore": attackScore,
                        "defenseScore": defenseScore,
                        "candidateCount": candLen,
                        "stonesOnBoard": stonesOnBoard
                    });
                    var assist = nnAssist.computeAssist(feat);
                    var bump = nnLambda * assist;
                    var _ow = {};
                    _ow.x = cx;
                    _ow.y = cy;
                    _ow.weight = attackScore + bump;
                    _ow.assist = assist;
                    _ow.bump = bump;
                    _ow.patternScore = attackScore;
                    _win_weight_list.push(_ow);
                    var _od = {};
                    _od.x = cx;
                    _od.y = cy;
                    _od.weight = defenseScore + bump;
                    _od.assist = assist;
                    _od.bump = bump;
                    _od.patternScore = defenseScore;
                    _danger_weight_list.push(_od);

                    if (i < 3) {
                        console.log("[AI][NN] cand", i, {
                            "x": cx,
                            "y": cy,
                            "attackScore": attackScore,
                            "defenseScore": defenseScore,
                            "assist": assist,
                            "bump": bump,
                            "winWeight": _ow.weight,
                            "dangerWeight": _od.weight
                        });
                    }
                }
            } else {
                for (var j = 0; j < candLen; j++) {
                    var scoreWin = gameLogic.getTheGameWeight(gameList, window.needComputePlace[j].x, window.needComputePlace[j].y, _turnAttack);
                    var _oWin = {};
                    _oWin.x = window.needComputePlace[j].x;
                    _oWin.y = window.needComputePlace[j].y;
                    _oWin.weight = scoreWin;
                    _win_weight_list.push(_oWin);
                }
                for (var k = 0; k < candLen; k++) {
                    var scoreDanger = gameLogic.getTheGameWeight(gameList, window.needComputePlace[k].x, window.needComputePlace[k].y, _turnDefense);
                    var _oD = {};
                    _oD.x = window.needComputePlace[k].x;
                    _oD.y = window.needComputePlace[k].y;
                    _oD.weight = scoreDanger;
                    _danger_weight_list.push(_oD);
                }
            }

            //计算出最具有威胁的点
            var _winPoint = util.getMostDangerPlace(_win_weight_list);
            var _dangerPoint = util.getMostDangerPlace(_danger_weight_list);

            var attackTop2 = getTop2ByKey(_win_weight_list, "weight");
            var defenseTop2 = getTop2ByKey(_danger_weight_list, "weight");
            // gapRatio 越大表示“第一名领先第二名越明显”，可用于判断评分是否过陡。
            var attackGapRatio = attackTop2.first && attackTop2.second ?
                (attackTop2.first.weight - attackTop2.second.weight) / Math.max(1, attackTop2.first.weight) : 0;
            var defenseGapRatio = defenseTop2.first && defenseTop2.second ?
                (defenseTop2.first.weight - defenseTop2.second.weight) / Math.max(1, defenseTop2.first.weight) : 0;

            if (_winPoint.weight > _dangerPoint.weight) {
                position = {
                    x: _winPoint.x,
                    y: _winPoint.y
                }
            } else {
                position = {
                    x: _dangerPoint.x,
                    y: _dangerPoint.y
                }
            }

            if (useNnAssist) {
                var attackTop2Pattern = getTop2ByKey(_win_weight_list, "patternScore");
                var defenseTop2Pattern = getTop2ByKey(_danger_weight_list, "patternScore");
                // 构造“纯规则分”版本的候选列表，用于和“混合分”做同一步对照。
                var _win_pattern_list = [];
                var _danger_pattern_list = [];
                for (var pi = 0; pi < _win_weight_list.length; pi++) {
                    _win_pattern_list.push({
                        "x": _win_weight_list[pi].x,
                        "y": _win_weight_list[pi].y,
                        "weight": _win_weight_list[pi].patternScore
                    });
                    _danger_pattern_list.push({
                        "x": _danger_weight_list[pi].x,
                        "y": _danger_weight_list[pi].y,
                        "weight": _danger_weight_list[pi].patternScore
                    });
                }
                var winPointPattern = util.getMostDangerPlace(_win_pattern_list);
                var dangerPointPattern = util.getMostDangerPlace(_danger_pattern_list);
                var selectedPattern = choosePointByWeight(winPointPattern, dangerPointPattern);
                // flipByNN=true 代表 NN 介入后，本步最终落子与纯规则结果不同。
                var flip = selectedPattern.x !== position.x || selectedPattern.y !== position.y;
                var bumpSum = 0;
                var bumpRatioSum = 0;
                var cnt = 0;
                for (var bi = 0; bi < _win_weight_list.length; bi++) {
                    var b = _win_weight_list[bi].bump || 0;
                    var p = _win_weight_list[bi].patternScore || 0;
                    bumpSum += b;
                    bumpRatioSum += b / Math.max(1, p);
                    cnt++;
                }
                // avgBump/avgBumpRatio 用于观察 NN 增益在当前量级下是否“足够影响排序”。
                var avgBump = cnt > 0 ? bumpSum / cnt : 0;
                var avgBumpRatio = cnt > 0 ? bumpRatioSum / cnt : 0;
                console.log("[AI][NN] decide", {
                    "winPoint": _winPoint,
                    "dangerPoint": _dangerPoint,
                    "selected": position
                });
                console.log("[AI][NN][metric]", {
                    "candidateCount": candLen,
                    "stonesOnBoard": stonesOnBoard,
                    "attackGapRatioMixed": attackGapRatio,
                    "defenseGapRatioMixed": defenseGapRatio,
                    "attackGapRatioPattern": attackTop2Pattern.first && attackTop2Pattern.second ?
                        (attackTop2Pattern.first.patternScore - attackTop2Pattern.second.patternScore) / Math.max(1, attackTop2Pattern.first.patternScore) : 0,
                    "defenseGapRatioPattern": defenseTop2Pattern.first && defenseTop2Pattern.second ?
                        (defenseTop2Pattern.first.patternScore - defenseTop2Pattern.second.patternScore) / Math.max(1, defenseTop2Pattern.first.patternScore) : 0,
                    "avgBump": avgBump,
                    "avgBumpRatio": avgBumpRatio,
                    "selectedPatternOnly": selectedPattern,
                    "selectedMixed": position,
                    "flipByNN": flip
                });
                trainingApi.appendDebugLog({
                    "tag": "[AI][NN][metric]",
                    "candidateCount": candLen,
                    "stonesOnBoard": stonesOnBoard,
                    "attackGapRatioMixed": attackGapRatio,
                    "defenseGapRatioMixed": defenseGapRatio,
                    "attackGapRatioPattern": attackTop2Pattern.first && attackTop2Pattern.second ?
                        (attackTop2Pattern.first.patternScore - attackTop2Pattern.second.patternScore) / Math.max(1, attackTop2Pattern.first.patternScore) : 0,
                    "defenseGapRatioPattern": defenseTop2Pattern.first && defenseTop2Pattern.second ?
                        (defenseTop2Pattern.first.patternScore - defenseTop2Pattern.second.patternScore) / Math.max(1, defenseTop2Pattern.first.patternScore) : 0,
                    "avgBump": avgBump,
                    "avgBumpRatio": avgBumpRatio,
                    "selectedPatternOnly": selectedPattern,
                    "selectedMixed": position,
                    "flipByNN": flip,
                    "ts": new Date().toISOString()
                });
            } else {
                console.log("[AI][RULE][metric]", {
                    "candidateCount": candLen,
                    "stonesOnBoard": stonesOnBoard,
                    "attackGapRatio": attackGapRatio,
                    "defenseGapRatio": defenseGapRatio,
                    "winPoint": _winPoint,
                    "dangerPoint": _dangerPoint,
                    "selected": position
                });
                trainingApi.appendDebugLog({
                    "tag": "[AI][RULE][metric]",
                    "candidateCount": candLen,
                    "stonesOnBoard": stonesOnBoard,
                    "attackGapRatio": attackGapRatio,
                    "defenseGapRatio": defenseGapRatio,
                    "winPoint": _winPoint,
                    "dangerPoint": _dangerPoint,
                    "selected": position,
                    "ts": new Date().toISOString()
                });
            }

        } else {
            position = {
                x: 7,
                y: 7
            }
        }

        var _pos = util.setPositionByBoardPosition(position.x, position.y);
        var rightPlace = gameLogic.setPieceInGameList(gameTurn, gameList, position);

        if (!rightPlace) return;
        window.moveCountSingle = (window.moveCountSingle || 0) + 1;
        var piece = gameLogic.shotPiece(gameTurn, _pos);

        // 切换回合
        if (window.gameTurn == 0) {
            window.gameTurn = 1;
        } else if (window.gameTurn == 1) {
            window.gameTurn = 0;
        }

        util.AIDelayShot(500, function () {
            Hamster.add(piece);
            // AI落子后判断是否游戏结束
            window.result = gameLogic.getResult(gameList, position.x, position.y);
            if (window.result) {
                if (!window.hasLoggedSingleResult) {
                    window.hasLoggedSingleResult = true;
                    trainingApi.appendTrainingLog({
                        "mode": "single",
                        "result": "win-ai",
                        "winnerSide": "white",
                        "moves": trainingApi.countStones(gameList),
                        "schemaVersion": 1,
                        "ts": new Date().toISOString()
                    });
                }
                setTimeout(function() {
                    UI.showWinner(1); // AI是白棋，获胜
                }, 1000);
            }
            window.isUserTurn = true;
        });
    }
}

module.exports = AI;
