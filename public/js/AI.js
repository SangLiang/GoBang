// AI部分

var util = require("./util");
var gameLogic = require("./gameLogic");

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

    // 检测棋盘
    "checkGameList": function (gameList) {
        for (var i = 0; i < gameList.length; i++) {

            for (var j = 0; j < gameList[i].length; j++) {
                // 横向检测条件
                if (x < 14 && gameList[i][j] != 0) {
                    this.checkHorizontal(gameList, i, j);
                }
            }
        }
    },
    // 横排检测
    "checkHorizontal": function (gameList, i, j) {
        var _obj = {};
        if (gameList[i][j] == gameList[i + 1][j]) {
            _obj.x = i;
            _obj.y = j;
            this.horizontalList.push(_obj);
        }
    },
    // 竖排检测
    "checkVertica": function () {

    },
    // 副对角线
    "checkViceDiagonal": function () {

    },
    // 主对角线
    "checkMainDiagonal": function () {

    },

    /*
     * AI放棋子
     * @param gameTurn 游戏的先后手
     */

    "shotPiece": function (gameTurn, gameList) {
        var _win_weight_list = [];
        var _danger_weight_list = [];
        gameLogic.checkDanger();
        var position = {};

        if (window.needComputePlace.length > 0) {

            var _turn = null;

            if (window.gameTurn == 0) {
                _turn = 1;
            } else if (window.gameTurn == 1) {
                _turn = 2;
            }
            for (var i = 0; i < window.needComputePlace.length; i++) {
                var weight = gameLogic.getTheGameWeight(gameList, window.needComputePlace[i].x, window.needComputePlace[i].y, _turn);
                var _o = {};
                _o.x = window.needComputePlace[i].x;
                _o.y = window.needComputePlace[i].y;
                _o.weight = weight.length;
                _win_weight_list.push(_o);
            }

            if (window.gameTurn == 0) {
                _turn = 2;
            } else if (window.gameTurn == 1) {
                _turn = 1;
            }

            for (var i = 0; i < window.needComputePlace.length; i++) {
                var weight = gameLogic.getTheGameWeight(gameList, window.needComputePlace[i].x, window.needComputePlace[i].y, _turn);
                var _o = {};
                _o.x = window.needComputePlace[i].x;
                _o.y = window.needComputePlace[i].y;
                _o.weight = weight.length;
                _danger_weight_list.push(_o);
            }
            console.log("进攻");
            console.log(_win_weight_list);

            console.log("防守");
            console.log(_danger_weight_list);

            var _winPoint = util.getMostDangerPlace(_win_weight_list);
            var _dangerPoint = util.getMostDangerPlace(_danger_weight_list);

            if (_winPoint.weight >= _dangerPoint.weight) {
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

        } else {
            position = {
                x: 7,
                y: 7
            }
        }

        // if (window.userLastPieceLocation != null) {
        //     var weight = gameLogic.getTheGameWeight(gameList, window.userLastPieceLocation.x, window.userLastPieceLocation.y);
        //     console.log(weight);
        // }

        var _pos = util.setPositionByBoardPosition(position.x, position.y);
        var rightPlace = gameLogic.setPieceInGameList(gameTurn, gameList, position);

        if (!rightPlace) return;
        var piece = gameLogic.shotPiece(gameTurn, _pos);

        // 切换回合
        if (window.gameTurn == 0) {
            window.gameTurn = 1;
        } else if (window.gameTurn == 1) {
            window.gameTurn = 0;
        }

        util.AIDelayShot(500, function () {
            Hamster.add(piece);
            window.isUserTurn = true;
        });
    }
}

module.exports = AI;