/*
 * 双人模式逻辑
 */ 
var UI = require("./UI.js");
var util = require("./util.js");
var gameLogic = require('./gameLogic.js');

var gameList = [
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

var gameTurn = 0; // 0代表黑子，1代表白子
var result = false;

module.exports.start = function () {
    UI.changedSideText(gameTurn);
    UI.background.isTrigger = true;
    Hamster.addEventListener(UI.background, "click", function (e) {
        // 判断游戏的结果
        if (result) {
            return;
        }

        var position = util.getBoardPosition(e.x, e.y);
        var _pos = util.setPositionByBoardPosition(position.x, position.y);
        var rightPlace = gameLogic.setPieceInGameList(gameTurn, gameList, position);
        if (!rightPlace) {
            return;
        }
        //生成棋子 
        var piece = gameLogic.shotPiece(gameTurn, _pos);
        
        Hamster.add(piece);
        // 获取游戏结果以及判定
        result = gameLogic.getResult(gameList, position.x, position.y);
        if (gameTurn == 0) {
            gameTurn = 1;
        } else {
            gameTurn = 0;
        }
        
        UI.changedSideText(gameTurn);
    });

    Hamster.add(UI.background);
    Hamster.add(UI.turnUI);
}
