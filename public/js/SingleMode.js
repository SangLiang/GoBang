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
var result = false;

module.exports.start = function () {
    Hamster.add(UI.background);
    Hamster.add(UI.turnUI);

    var ai = new AI();

    // 设置电脑的先后手
    var random = util.getRandomNumber(0,1);

    random = 0;
    UI.changedSideText(gameTurn);
    if(random == 0){
        gameTurn = 0;
         //电脑先放子
        ai.shotPiece(gameTurn,gameList);
        isUserTurn = false;
    }else {
        // 玩家先放子
        gameTurn == 0;
        isUserTurn = true;
    }
    Hamster.addEventListener(UI.background,"click",function(){
        if(gameTurn == 0){
            return;
        }

        console.log(1);

    UI.background.isTrigger = true;

    Hamster.addEventListener(UI.background, "click", function (e) {
        console.warn(gameTurn);

        // 判断游戏的结果
        if (result && !isUserTurn) {
            return;
        }

        var position = util.getBoardPosition(e.x, e.y);
        var _pos = util.setPositionByBoardPosition(position.x, position.y);
        userLastPieceLocation = position;
        // console.log("玩家放子区域 ----------------");
        // console.log(userLastPieceLocation);
        var rightPlace = gameLogic.setPieceInGameList(gameTurn, gameList, position);
        if (!rightPlace) {
            return;
        }

        //生成棋子 
        console.log("玩家放的棋子颜色"+gameTurn);
        var piece = gameLogic.shotPiece(gameTurn, _pos);
        Hamster.add(piece);
        result = gameLogic.getResult(gameList, position.x, position.y);
        
        //  转换回合
        if(gameTurn == 0){
            gameTurn =1;
        }else if(gameTurn ==1){
            gameTurn = 0;
        }

        UI.changedSideText(gameTurn);

        isUserTurn = false;

        ai.shotPiece(gameTurn,gameList);
    });

}
