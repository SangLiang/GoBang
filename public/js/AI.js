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

        } else {
            position = {
                x: 7,
                y: 7
            }
        }

        if(window.killPosition.length>0){
            position = {
                x: window.killPosition[0].x,
                y: window.killPosition[0].y
            }
        }

        window.killPosition = [];

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
            // AI落子后判断是否游戏结束
            window.result = gameLogic.getResult(gameList, position.x, position.y);
            window.isUserTurn = true;
        });
    }
}

module.exports = AI;
