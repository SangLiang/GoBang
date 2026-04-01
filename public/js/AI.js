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
            var nnSchemaVersion = typeof NN_ASSIST_SCHEMA_VERSION === "number" ? NN_ASSIST_SCHEMA_VERSION : 1;
            // v2 仅在“NN启用 + schemaVersion=2”时生效；否则走 v1 或纯规则分支。
            var useNnV2 = useNnAssist && nnSchemaVersion === 2;

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
            // 进攻+防守活三策略
            function choosePointByWeight(winPoint, dangerPoint) {
                var OPEN3_THRESHOLD = 10000;  // 活三及以上
                var hasMyOpen3 = winPoint.weight >= OPEN3_THRESHOLD && winPoint.weight < 60000;
                var hasOpponentOpen3 = dangerPoint.weight >= OPEN3_THRESHOLD && dangerPoint.weight < 60000;
                
                // 策略：
                // 1. 自己有活三 + 对手没有 → 优先进攻
                // 2. 对手有活三 → 优先防守
                // 3. 双方都有活三 → 先成四（进攻优先）
                // 4. 都没有活三 → 正常比较
                
                if (hasMyOpen3 && !hasOpponentOpen3) {
                    return { "x": winPoint.x, "y": winPoint.y };
                }
                if (hasOpponentOpen3 && !hasMyOpen3) {
                    return { "x": dangerPoint.x, "y": dangerPoint.y };
                }
                if (hasMyOpen3 && hasOpponentOpen3) {
                    return { "x": winPoint.x, "y": winPoint.y };  // 进攻优先
                }
                
                // 都没有活三，正常比较
                if (winPoint.weight > dangerPoint.weight) {
                    return { "x": winPoint.x, "y": winPoint.y };
                }
                return { "x": dangerPoint.x, "y": dangerPoint.y };
            }

            if (useNnV2) {
                console.log("[AI][NN_V2] assist on", {
                    "lambda": nnLambda,
                    "candidateCount": candLen,
                    "stonesOnBoard": stonesOnBoard,
                    "player": _turnAttack
                });
                // v2：单列表评分，NN 输出直接作为候选点价值（再乘 lambda 放大量级）。
                for (var vi = 0; vi < candLen; vi++) {
                    var v2x = window.needComputePlace[vi].x;
                    var v2y = window.needComputePlace[vi].y;
                    var featV2 = nnFeatures.buildFeaturesV2(gameList, v2x, v2y, _turnAttack, {
                        "stonesOnBoard": stonesOnBoard,
                        "isMyTurn": 1
                    });
                    var scoreV2 = nnAssist.computeV2(featV2);
                    if (typeof scoreV2 !== "number" || isNaN(scoreV2)) {
                        scoreV2 = 0;
                    }
                    _win_weight_list.push({
                        "x": v2x,
                        "y": v2y,
                        "score": scoreV2,
                        "weight": nnLambda * scoreV2
                    });
                }
            } else if (useNnAssist) {
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
                    // v1：NN 仅提供 bump，仍与规则分（attack/defense）做混合。
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
                // 纯规则：不走 NN，分别计算进攻/防守分。
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

            var _winPoint = null;
            var _dangerPoint = null;
            var attackTop2 = null;
            var defenseTop2 = null;
            var attackGapRatio = 0;
            var defenseGapRatio = 0;

            if (useNnV2) {
                // v2：直接从单列表里取最高分候选点。
                _winPoint = util.getMostDangerPlace(_win_weight_list);
                position = {
                    x: _winPoint.x,
                    y: _winPoint.y
                };
                attackTop2 = getTop2ByKey(_win_weight_list, "weight");
                attackGapRatio = attackTop2.first && attackTop2.second ?
                    (attackTop2.first.weight - attackTop2.second.weight) / Math.max(1, attackTop2.first.weight) : 0;
            } else {
                //计算出最具有威胁的点
                _winPoint = util.getMostDangerPlace(_win_weight_list);
                _dangerPoint = util.getMostDangerPlace(_danger_weight_list);

                attackTop2 = getTop2ByKey(_win_weight_list, "weight");
                defenseTop2 = getTop2ByKey(_danger_weight_list, "weight");
                // gapRatio 越大表示“第一名领先第二名越明显”，可用于判断评分是否过陡。
                attackGapRatio = attackTop2.first && attackTop2.second ?
                    (attackTop2.first.weight - attackTop2.second.weight) / Math.max(1, attackTop2.first.weight) : 0;
                defenseGapRatio = defenseTop2.first && defenseTop2.second ?
                    (defenseTop2.first.weight - defenseTop2.second.weight) / Math.max(1, defenseTop2.first.weight) : 0;

                // 活三阈值
                var OPEN3_THRESHOLD = 10000;  // 活三及以上
                
                // 检查自己是否有活三
                var myOpen3List = [];
                for (var ei = 0; ei < _win_weight_list.length; ei++) {
                    if (_win_weight_list[ei].weight >= OPEN3_THRESHOLD && _win_weight_list[ei].weight < 60000) {
                        myOpen3List.push(_win_weight_list[ei]);
                    }
                }
                var hasMyOpen3 = myOpen3List.length > 0;
                
                // 检查对手是否有活三
                var opponentOpen3List = [];
                for (var ei = 0; ei < _danger_weight_list.length; ei++) {
                    if (_danger_weight_list[ei].weight >= OPEN3_THRESHOLD && _danger_weight_list[ei].weight < 60000) {
                        opponentOpen3List.push(_danger_weight_list[ei]);
                    }
                }
                var hasOpponentOpen3 = opponentOpen3List.length > 0;

                // 决策策略：
                // 1. 自己有活三 + 对手没有 → 优先进攻活三
                // 2. 对手有活三 → 优先防守
                // 3. 双方都有活三 → 先成四（进攻优先）
                // 4. 都没有活三 → 正常比较
                
                if (hasMyOpen3 && !hasOpponentOpen3) {
                    // 策略1: 自己有活三，对手没有，优先进攻
                    var bestAttack = myOpen3List[0];
                    for (var ei = 0; ei < myOpen3List.length; ei++) {
                        if (myOpen3List[ei].weight > bestAttack.weight) {
                            bestAttack = myOpen3List[ei];
                        }
                    }
                    position = {
                        x: bestAttack.x,
                        y: bestAttack.y
                    }
                } else if (hasOpponentOpen3 && !hasMyOpen3) {
                    // 策略2: 对手有活三，自己没有，必须防守
                    var bestDefend = opponentOpen3List[0];
                    for (var ei = 0; ei < opponentOpen3List.length; ei++) {
                        if (opponentOpen3List[ei].weight > bestDefend.weight) {
                            bestDefend = opponentOpen3List[ei];
                        }
                    }
                    position = {
                        x: bestDefend.x,
                        y: bestDefend.y
                    }
                } else if (hasMyOpen3 && hasOpponentOpen3) {
                    // 策略3: 双方都有活三，先成四（进攻优先）
                    var bestAttack = myOpen3List[0];
                    for (var ei = 0; ei < myOpen3List.length; ei++) {
                        if (myOpen3List[ei].weight > bestAttack.weight) {
                            bestAttack = myOpen3List[ei];
                        }
                    }
                    position = {
                        x: bestAttack.x,
                        y: bestAttack.y
                    }
                } else {
                    // 策略4: 都没有活三，正常比较
                    if (_winPoint.weight > _dangerPoint.weight) {
                        position = {
                            x: _winPoint.x,
                            y: _winPoint.y
                        }
                    } else {
                        // v1/规则：在"进攻最优点"和"防守最优点"之间二选一。
                        position = {
                            x: _dangerPoint.x,
                            y: _dangerPoint.y
                        }
                    }
                }
                } else {
                    // v1/规则：在“进攻最优点”和“防守最优点”之间二选一。
                    position = {
                        x: _dangerPoint.x,
                        y: _dangerPoint.y
                    }
                }
            }

            if (useNnV2) {
                // v2 指标：关注单列表 top1/top2 分差与最终选点。
                console.log("[AI][NN_V2][metric]", {
                    "candidateCount": candLen,
                    "stonesOnBoard": stonesOnBoard,
                    "topGapRatio": attackGapRatio,
                    "selected": position,
                    "selectedWeight": _winPoint ? _winPoint.weight : 0
                });
                trainingApi.appendDebugLog({
                    "tag": "[AI][NN_V2][metric]",
                    "candidateCount": candLen,
                    "stonesOnBoard": stonesOnBoard,
                    "topGapRatio": attackGapRatio,
                    "selected": position,
                    "selectedWeight": _winPoint ? _winPoint.weight : 0,
                    "ts": new Date().toISOString()
                });
            } else if (useNnAssist) {
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
            // 无候选点时回落到天元（理论上多见于开局或异常场景）。
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
                        "schemaVersion": nnSchemaVersion,
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
