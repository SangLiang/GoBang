// 单人模式选择逻辑
var UI = require("./UI");
var util = require("./util.js");
var gameLogic = require('./gameLogic.js');
var AI = require("./AI");

window.gameList = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

window.gameTurn = null; // 0代表黑子，1代表白子
window.isUserTurn = false;
window.userLastPieceLocation = null;
window.result = false;

module.exports.start = function () {
    Hamster.add(UI.background);
    Hamster.add(UI.turnUI);

    var ai = new AI();

    // 设置电脑的先后手
    var random = util.getRandomNumber(0, 1);

    random = 1;
    UI.changedSideText(gameTurn);
    if (random == 0) {
        window.gameTurn = 0;
        //电脑先放子
        ai.shotPiece(gameTurn, gameList);
        isUserTurn = false;
    } else {
        // 玩家先放子
        window.gameTurn = 0;
        window.isUserTurn = true;
    }

    UI.background.isTrigger = true;
    Hamster.addEventListener(UI.background, "click", function (e) {

        // 判断游戏的结果
        if (!window.isUserTurn) {
            return;
        }

        if (window.result) {
            console.log("game over");
            return;
        }
        var position = util.getBoardPosition(e.x, e.y);
        var _pos = util.setPositionByBoardPosition(position.x, position.y);
        window.userLastPieceLocation = position;

        var rightPlace = gameLogic.setPieceInGameList(gameTurn, gameList, position);
        if (!rightPlace) {
            return;
        }

        //生成棋子 
        var piece = gameLogic.shotPiece(gameTurn, _pos);
        Hamster.add(piece);
        window.result = gameLogic.getResult(gameList, position.x, position.y);

        //  转换回合
        if (window.gameTurn == 0) {
            window.gameTurn = 1;
        } else if (window.gameTurn == 1) {
            window.gameTurn = 0;
        }

        UI.changedSideText(gameTurn);

        window.isUserTurn = false;

        ai.shotPiece(gameTurn, gameList);
    });

}
