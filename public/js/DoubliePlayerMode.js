/*
 * 双人模式逻辑
 */ 
var UI = require("./UI.js");
var util = require("./util.js");
var gameLogic = require('./gameLogic.js');
var GameState = require("./GameState");

var gameState = null;

module.exports.start = function () {
	// 清理旧状态
	if (gameState) {
		gameState.cleanup();
	}

	gameState = new GameState();
	// 暴露到 window 供调试工具使用
	window.gameState = gameState;

	Hamster.removeAll();
	Hamster.add(UI.background);
	Hamster.add(UI.turnUI);

	UI.changedSideText(gameState.gameTurn);

	UI.background.isTrigger = true;
	var clickHandler = function (e) {
		// 判断游戏的结果
		if (gameState.result) {
			return;
		}

		var position = util.getBoardPosition(e.x, e.y);
		if (!position || position.x < 0 || position.x >= 15 || position.y < 0 || position.y >= 15) {
			return;
		}

		var _pos = util.setPositionByBoardPosition(position.x, position.y);
		var rightPlace = gameLogic.setPieceInGameList(gameState.gameTurn, gameState.gameList, position);
		if (!rightPlace) {
			return;
		}
		// 生成棋子 
		var piece = gameLogic.shotPiece(gameState.gameTurn, _pos);
		
		Hamster.add(piece);
		// 获取游戏结果以及判定
		gameState.result = gameLogic.getResult(gameState.gameList, position.x, position.y);
		
		// 如果游戏结束，显示获胜方
		if (gameState.result) {
			setTimeout(function() {
				UI.showWinner(gameState.gameTurn);
			}, 1000);
			return;
		}
		
		gameState.nextTurn();
		
		UI.changedSideText(gameState.gameTurn);
	};

	Hamster.addEventListener(UI.background, "click", clickHandler);

	gameState.registerCleanup(function() {
		Hamster.removeAll();
	});
};
