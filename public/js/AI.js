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
            // console.log("进攻");
            // console.log(_win_weight_list);

            // console.log("防守");
            // console.log(_danger_weight_list);

            //计算出最具有威胁的点
            var _winPoint = util.getMostDangerPlace(_win_weight_list);
            var _dangerPoint = util.getMostDangerPlace(_danger_weight_list);

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
                console.log("[AI][NN] decide", {
                    "winPoint": _winPoint,
                    "dangerPoint": _dangerPoint,
                    "selected": position
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
