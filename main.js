(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

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
  "init": function init() {
    // console.log("AI ready");
  },
  /*
   * AI放棋子
   * @param gameTurn 游戏的先后手
   */

  "shotPiece": function shotPiece(gameTurn, gameList) {
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
        };
      } else {
        position = {
          x: _dangerPoint.x,
          y: _dangerPoint.y
        };
      }
    } else {
      position = {
        x: 7,
        y: 7
      };
    }
    if (window.killPosition.length > 0) {
      position = {
        x: window.killPosition[0].x,
        y: window.killPosition[0].y
      };
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
};
module.exports = AI;

},{"./gameLogic":5,"./util":7}],2:[function(require,module,exports){
"use strict";

/*
 * 双人模式逻辑
 */
var UI = require("./UI.js");
var util = require("./util.js");
var gameLogic = require('./gameLogic.js');
var gameList = [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
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
};

},{"./UI.js":4,"./gameLogic.js":5,"./util.js":7}],3:[function(require,module,exports){
"use strict";

// 单人模式选择逻辑
var UI = require("./UI");
var util = require("./util.js");
var gameLogic = require('./gameLogic.js');
var AI = require("./AI");
window.gameList = [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
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

    // 检测游戏结果
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
};

},{"./AI":1,"./UI":4,"./gameLogic.js":5,"./util.js":7}],4:[function(require,module,exports){
"use strict";

// 背景

module.exports.background = Hamster.Sprite({
  "name": "background",
  "imageName": "background",
  "x": 33,
  "y": 35
});
module.exports.turnUI = Hamster.UI.Text({
  "name": "turnUI",
  "text": "当前回合：黑棋",
  "fontSize": "20",
  "color": "#fff",
  "x": 230,
  "y": 26
});
module.exports.changedSideText = function (turn) {
  if (turn == 0) {
    this.turnUI.setText("当前回合：黑棋");
  }
  if (turn == 1) {
    this.turnUI.setText("当前回合：白棋");
  }
};

},{}],5:[function(require,module,exports){
"use strict";

/*
 * 游戏核心逻辑
 */

// 权重临时数组
var weight_list = [];
var _tempCount = 0;

// 需要计算权重的数组
window.needComputePlace = [];

// 直接可以杀死比赛的点  已经三连两气  或者已经4连一气
window.killPosition = [];
window.weightNumber = 0;
module.exports = {
  // 放棋子
  "shotPiece": function shotPiece(side, position) {
    if (side == 0) {
      var blackPiece = Hamster.Sprite({
        "name": "blackPiece",
        "imageName": "black",
        "x": position.x,
        "y": position.y
      });
      return blackPiece;
    } else if (side == 1) {
      var whitePiece = Hamster.Sprite({
        "name": "whitePiece",
        "imageName": "white",
        "x": position.x,
        "y": position.y
      });
      return whitePiece;
    }
  },
  // 设置棋子的位置
  "setPieceInGameList": function setPieceInGameList(gameTurn, gameList, position) {
    if (gameList[position.x][position.y] != 0) {
      return false;
    }
    if (gameTurn == 0) {
      gameList[position.x][position.y] = 1;
      return true;
    } else if (gameTurn == 1) {
      gameList[position.x][position.y] = 2;
      return true;
    }
  },
  // 获取游戏结果
  "getResult": function getResult(gameList, x, y) {
    for (var x = 0; x < gameList.length; x++) {
      for (var y = 0; y < gameList[x].length; y++) {
        // 横向检测条件
        if (x <= 10 && gameList[x][y] != 0) {
          if (this.checkHorizontal(gameList, x, y) == true) {
            return true;
          }
        }
        // 纵向
        if (y <= 10 && gameList[x][y] != 0) {
          if (this.checkVertica(gameList, x, y) == true) {
            return true;
          }
        }
        // 副对角线
        if (x <= 10 && y <= 10 && gameList[x][y] != 0) {
          if (this.checkViceDiagonal(gameList, x, y) == true) {
            return true;
          }
        }
        // 主对角线
        if (x <= 10 && y >= 4 && gameList[x][y] != 0) {
          if (this.checkMainDiagonal(gameList, x, y) == true) {
            return true;
          }
        }
      }
    }
    return false;
  },
  // 横排检测
  "checkHorizontal": function checkHorizontal(gameList, x, y) {
    if (gameList[x][y] == gameList[x + 1][y] && gameList[x][y] == gameList[x + 2][y] && gameList[x][y] == gameList[x + 3][y] && gameList[x][y] == gameList[x + 4][y]) {
      console.log("横排五连");
      return true;
    } else {
      return false;
    }
  },
  // 竖排检测
  "checkVertica": function checkVertica(gameList, x, y) {
    if (gameList[x][y] == gameList[x][y + 1] && gameList[x][y] == gameList[x][y + 2] && gameList[x][y] == gameList[x][y + 3] && gameList[x][y] == gameList[x][y + 4]) {
      console.log("竖排五连");
      return true;
    } else {
      return false;
    }
  },
  // 副对角线检测
  "checkViceDiagonal": function checkViceDiagonal(gameList, x, y) {
    if (gameList[x][y] == gameList[x + 1][y + 1] && gameList[x][y] == gameList[x + 2][y + 2] && gameList[x][y] == gameList[x + 3][y + 3] && gameList[x][y] == gameList[x + 4][y + 4]) {
      console.log("附对角线五连");
      return true;
    } else {
      return false;
    }
  },
  // 主对角线检测
  "checkMainDiagonal": function checkMainDiagonal(gameList, x, y) {
    if (gameList[x][y] == gameList[x + 1][y - 1] && gameList[x][y] == gameList[x + 2][y - 2] && gameList[x][y] == gameList[x + 3][y - 3] && gameList[x][y] == gameList[x + 4][y - 4]) {
      console.log("主对角线五连");
      return true;
    } else {
      return false;
    }
  },
  // 获取权重点
  "getTheGameWeight": function getTheGameWeight(gameList, x, y, turn) {
    var _temp = [];
    weight_list = [];
    var x = parseInt(x);
    var y = parseInt(y);

    // 获取x轴上面的权重
    var horizontalRightWeight = this.getHorizontalWeightToRight(gameList, x, y, turn);
    var horizontalLeftWeight = this.getHorizontalWeightToLeft(gameList, x, y, turn);
    var verticalTopWeight = this.getHorizontalWeightToTop(gameList, x, y, turn);
    var verticalBottomWeight = this.getHorizontalWeightToBottom(gameList, x, y, turn);
    var leftTopWeight = this.getLeftTopWeight(gameList, x, y, turn);
    var getRightTopWeight = this.getRightTopWeight(gameList, x, y, turn);
    var leftBottomWeight = this.getLeftBottomWeight(gameList, x, y, turn);
    var rightBottomWeight = this.getRightBottomWeight(gameList, x, y, turn);
    return weight_list;
  },
  // 横向右边权重
  "getHorizontalWeightToRight": function getHorizontalWeightToRight(gameList, x, y, turn) {
    var _p = turn;
    if (x <= 10) {
      // 右侧相等 或者为空
      if (_p == gameList[x + 1][y] || gameList[x + 1][y] == 0) {
        var point = {
          x: x,
          y: y
        };
        weight_list.push(point);
        if (gameList[x + 1][y] == 0) {
          if (_tempCount == 3) {
            var _dangerPoint = {
              x: parseInt(x) + 1,
              y: y,
              weight: _tempCount * 10
            };
            console.log("右边很危险");
            window.killPosition.push(_dangerPoint);
          }
          _tempCount = 0;
          return;
        }
        if (gameList[x + 1][y] != 0) {
          if (_tempCount == 3) {
            var _dangerPoint = {
              x: parseInt(x) - 3,
              y: y,
              weight: _tempCount * 10
            };
            console.log("右边很危险");
            window.killPosition.push(_dangerPoint);
          }
        }
        _tempCount++;
        this.getHorizontalWeightToRight(gameList, x + 1, y, turn);
        return;
      }
      _tempCount = 0;
    }
  },
  // 横向左方向检测
  "getHorizontalWeightToLeft": function getHorizontalWeightToLeft(gameList, x, y, turn) {
    var _p = turn;
    if (x > 0) {
      // 右侧相等 或者为空
      if (_p == gameList[x - 1][y] || gameList[x - 1][y] == 0) {
        var point = {
          x: x,
          y: y
        };
        weight_list.push(point);

        // 当左边的棋子为气孔且有三连情况
        if (gameList[x - 1][y] == 0) {
          if (_tempCount == 3) {
            var _dangerPoint = {
              x: parseInt(x) - 1,
              y: y,
              weight: _tempCount * 10
            };
            console.log("左边很危险");
            window.killPosition.push(_dangerPoint);
          }
          _tempCount = 0;
          return;
        }
        if (gameList[x - 1][y] != 0) {
          if (_tempCount == 3) {
            var _dangerPoint = {
              x: parseInt(x) + 3,
              y: y,
              weight: _tempCount * 10
            };
            console.log("左边很危险");
            console.log(_dangerPoint.x, y);
            window.killPosition.push(_dangerPoint);
          }
        }
        _tempCount++;
        this.getHorizontalWeightToLeft(gameList, [x - 1], y, turn);
        return;
      }
      _tempCount = 0;
    }
  },
  // 纵向上方向检测
  "getHorizontalWeightToTop": function getHorizontalWeightToTop(gameList, x, y, turn) {
    var _p = turn;
    if (y > 0) {
      // 右侧相等 或者为空
      if (_p == gameList[x][y - 1] || gameList[x][y - 1] == 0) {
        var point = {
          x: x,
          y: y
        };
        weight_list.push(point);
        if (gameList[x][y - 1] == 0) {
          if (_tempCount == 3) {
            var _dangerPoint = {
              x: x,
              y: y - 1,
              weight: _tempCount * 10
            };
            console.log("纵向上方很危险");
            window.killPosition.push(_dangerPoint);
          }
          _tempCount = 0;
          return;
        }
        if (gameList[x][y - 1] != 0) {
          if (_tempCount == 3) {
            var _dangerPoint = {
              x: x,
              y: y + 3,
              weight: _tempCount * 10
            };
            console.log("纵向上方很危险");
            window.killPosition.push(_dangerPoint);
          }
        }
        _tempCount++;
        this.getHorizontalWeightToTop(gameList, x, y - 1, turn);
        return;
      }
      _tempCount = 0;
    }
  },
  // 纵向下方向检测
  "getHorizontalWeightToBottom": function getHorizontalWeightToBottom(gameList, x, y, turn) {
    var _p = turn;
    if (y < 14) {
      // 右侧相等 或者为空
      if (_p == gameList[x][y + 1] || gameList[x][y + 1] == 0) {
        var point = {
          x: x,
          y: y
        };
        weight_list.push(point);
        if (gameList[x][y + 1] == 0) {
          if (_tempCount == 3) {
            var _dangerPoint = {
              x: x,
              y: y + 1,
              weight: _tempCount * 10
            };
            console.log("纵向下方很危险");
            window.killPosition.push(_dangerPoint);
          }
          _tempCount = 0;
          return;
        }
        if (gameList[x][y + 1] != 0) {
          if (_tempCount == 3) {
            var _dangerPoint = {
              x: x,
              y: y - 3,
              weight: _tempCount * 10
            };
            console.log("纵向下方很危险");
            window.killPosition.push(_dangerPoint);
          }
        }
        _tempCount++;
        this.getHorizontalWeightToBottom(gameList, x, y + 1, turn);
        return;
      }
      _tempCount = 0;
    }
  },
  // 左上方向检测
  "getLeftTopWeight": function getLeftTopWeight(gameList, x, y, turn) {
    var _p = turn;
    if (y > 0 && x > 0) {
      // 右侧相等 或者为空
      if (_p == gameList[x - 1][y - 1] || gameList[x - 1][y - 1] == 0) {
        var point = {
          x: x,
          y: y
        };
        weight_list.push(point);
        if (gameList[x - 1][y - 1] == 0) {
          if (_tempCount == 3) {
            var _dangerPoint = {
              x: x - 1,
              y: y - 1,
              weight: _tempCount * 10
            };
            console.log("左上方很危险");
            window.killPosition.push(_dangerPoint);
          }
          _tempCount = 0;
          return;
        }
        if (gameList[x - 1][y - 1] != 0) {
          if (_tempCount == 3) {
            var _dangerPoint = {
              x: x + 3,
              y: y + 3,
              weight: _tempCount * 10
            };
            console.log("左上方很危险");
            window.killPosition.push(_dangerPoint);
          }
        }
        _tempCount++;
        this.getLeftTopWeight(gameList, x - 1, y - 1, turn);
        return;
      }
      _tempCount = 0;
    }
  },
  // 左下方
  "getLeftBottomWeight": function getLeftBottomWeight(gameList, x, y, turn) {
    var _p = turn;
    if (y < 14 && x > 0) {
      // 右侧相等 或者为空
      if (_p == gameList[x - 1][y + 1]) {
        var point = {
          x: x,
          y: y
        };
        weight_list.push(point);
        this.getLeftBottomWeight(gameList, x - 1, y + 1, turn);
      }
      // else if (_p != gameList[x - 1][y - 1] && gameList[x][y + 1] != 0) {

      // }
    }
  },
  // 右上方检测
  "getRightTopWeight": function getRightTopWeight(gameList, x, y, turn) {
    var _p = turn;
    if (y > 0 && x < 14) {
      // 右侧相等 或者为空
      if (_p == gameList[x + 1][y - 1] || gameList[x + 1][y - 1] == 0) {
        var point = {
          x: x,
          y: y
        };
        weight_list.push(point);
        if (gameList[x + 1][y - 1] == 0) {
          if (_tempCount == 3) {
            var _dangerPoint = {
              x: x + 1,
              y: y - 1,
              weight: _tempCount * 10
            };
            console.log("右上角很危险");
            window.killPosition.push(_dangerPoint);
          }
          _tempCount = 0;
          return;
        }
        if (gameList[x + 1][y - 1] != 0) {
          if (_tempCount == 3) {
            var _dangerPoint = {
              x: x - 3,
              y: y + 3,
              weight: _tempCount * 10
            };
            console.log("右上角很危险");
            window.killPosition.push(_dangerPoint);
          }
        }
        _tempCount++;
        this.getRightTopWeight(gameList, x + 1, y - 1, turn);
      }
      _tempCount = 0;
    }
  },
  // 右下方检测
  "getRightBottomWeight": function getRightBottomWeight(gameList, x, y, turn) {
    var _p = turn;
    if (y < 14 && x < 14) {
      // 右侧相等 或者为空
      if (_p == gameList[x + 1][y + 1]) {
        var point = {
          x: x,
          y: y
        };
        weight_list.push(point);
        this.getRightBottomWeight(gameList, x + 1, y + 1, turn);
      }
      // else if (_p != gameList[x - 1][y - 1] && gameList[x][y + 1] != 0) {

      // }
    }
  },
  // 检测威胁点
  "checkDanger": function checkDanger() {
    window.needComputePlace = [];
    for (var i = 0; i < gameList.length; i++) {
      for (var k = 0; k < gameList[i].length; k++) {
        if (gameList[i][k] == 0) {
          // 
          if (i < 14 && gameList[i + 1][k]) {
            if (gameList[i + 1][k] != 0) {
              (function (a, b) {
                var _t = {};
                _t.x = a;
                _t.y = b;
                window.needComputePlace.push(_t);
              })(i, k);
            }
          }
          if (i > 0 && gameList[i - 1][k]) {
            if (gameList[i - 1][k] != 0) {
              (function (a, b) {
                var _t = {};
                _t.x = a;
                _t.y = b;
                window.needComputePlace.push(_t);
              })(i, k);
            }
          }
          if (k < 14 && gameList[i][k + 1]) {
            if (gameList[i][k + 1] != 0) {
              (function (a, b) {
                var _t = {};
                _t.x = a;
                _t.y = b;
                window.needComputePlace.push(_t);
              })(i, k);
            }
          }
          if (k > 0 && gameList[i][k - 1]) {
            if (gameList[i][k - 1] != 0) {
              (function (a, b) {
                var _t = {};
                _t.x = a;
                _t.y = b;
                window.needComputePlace.push(_t);
              })(i, k);
            }
          }

          //左上威胁
          if (k > 0 && i > 0) {
            if (gameList[i - 1][k - 1] != 0) {
              (function (a, b) {
                var _t = {};
                _t.x = a;
                _t.y = b;
                window.needComputePlace.push(_t);
              })(i, k);
            }
          }

          //左下威胁
          if (k < 14 && i > 0) {
            if (gameList[i - 1][k + 1] != 0) {
              (function (a, b) {
                var _t = {};
                _t.x = a;
                _t.y = b;
                window.needComputePlace.push(_t);
              })(i, k);
            }
          }
          // 右上威胁
          if (i < 14 && k > 0) {
            if (gameList[i + 1][k - 1] != 0) {
              (function (a, b) {
                var _t = {};
                _t.x = a;
                _t.y = b;
                window.needComputePlace.push(_t);
              })(i, k);
            }
          }

          // 右下威胁
          if (i < 14 && k < 14) {
            if (gameList[i + 1][k + 1] != 0) {
              (function (a, b) {
                var _t = {};
                _t.x = a;
                _t.y = b;
                window.needComputePlace.push(_t);
              })(i, k);
            }
          }
        }
      }
    }
  }
};

},{}],6:[function(require,module,exports){
"use strict";

/**
 *  Hamster.js 五子棋游戏
 *  Author: Sangliang
 *  Date:2017.1.17
 *  E-Mail:378305868@qq.com
 */

var _double = require("./DoubliePlayerMode.js"); //双人模式
var single = require("./SingleMode.js");
Hamster.init("main", 600, 600);
var notice = Hamster.UI.Text({
  "name": "notice",
  "fontSize": 20,
  "text": "请输入游戏模式，s为单人模式，d为双人对战模式",
  "x": 10,
  "y": 30,
  "color": "#fff"
});
Hamster.add(notice);
Hamster.addEventListener(null, "keyDown", function (e) {
  if (e.code == "KeyS") {
    Hamster.removeAll();
    single.start();
  } else if (e.code == "KeyD") {
    Hamster.removeAll();
    _double.start();
  }
});

},{"./DoubliePlayerMode.js":2,"./SingleMode.js":3}],7:[function(require,module,exports){
"use strict";

// 一些常用的转换函数

var OFFSET_X = 55; // 棋盘的边框偏移量
var OFFSET_Y = 55;
var OFFSET_PIECE = 35; // 棋子的偏移量

module.exports = {
  /*
   * getBoardPosition :转换坐标为格子位置
   * @param x: x坐标
   * @param y: y坐标
   * @return obj 转换后的格子坐标
   */
  "getBoardPosition": function getBoardPosition(x, y) {
    if ((x - OFFSET_X) % OFFSET_PIECE > OFFSET_PIECE / 2) {
      var resultX = parseInt((x - OFFSET_X) / OFFSET_PIECE) + 1;
    } else {
      var resultX = parseInt((x - OFFSET_X) / OFFSET_PIECE);
    }
    if ((y - OFFSET_Y) % OFFSET_PIECE > OFFSET_PIECE / 2) {
      var resultY = parseInt((y - OFFSET_Y) / OFFSET_PIECE) + 1;
    } else {
      var resultY = parseInt((y - OFFSET_Y) / OFFSET_PIECE);
    }
    var obj = {
      "x": resultX,
      "y": resultY
    };
    return obj;
  },
  // 
  "setPositionByBoardPosition": function setPositionByBoardPosition(x, y) {
    var resultX = x * OFFSET_PIECE + OFFSET_X - OFFSET_PIECE / 2;
    var resultY = y * OFFSET_PIECE + OFFSET_Y - OFFSET_PIECE / 2;
    var obj = {
      "x": resultX,
      "y": resultY
    };
    return obj;
  },
  /* getRandomNumber:取随机数
   * @param Min 最小值
   * @param Max 最大值
   * @return 介于最小最大值之间的随机值
   */
  "getRandomNumber": function getRandomNumber(Min, Max) {
    var Range = Max - Min;
    var Rand = Math.random();
    return Min + Math.round(Rand * Range);
  },
  "AIDelayShot": function AIDelayShot(delayTime, callback, target) {
    if (target != null) {
      setTimeout(function () {
        callback.bind(target)();
      }, delayTime);
    } else {
      setTimeout(function () {
        callback();
      }, delayTime);
    }
  },
  "getMostDangerPlace": function getMostDangerPlace(objlist) {
    var _big = objlist[0];
    for (var i = 0; i < objlist.length; i++) {
      if (objlist[i].weight > _big.weight) {
        _big = objlist[i];
      }
    }
    return _big;
  }
};

},{}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvQUkuanMiLCJwdWJsaWMvanMvRG91YmxpZVBsYXllck1vZGUuanMiLCJwdWJsaWMvanMvU2luZ2xlTW9kZS5qcyIsInB1YmxpYy9qcy9VSS5qcyIsInB1YmxpYy9qcy9nYW1lTG9naWMuanMiLCJwdWJsaWMvanMvbWFpbi5qcyIsInB1YmxpYy9qcy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQTs7QUFFQSxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO0FBQzVCLElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUM7QUFFdEMsU0FBUyxFQUFFLENBQUEsRUFBRztFQUNWLElBQUksSUFBSSxHQUFHLElBQUk7RUFDZixJQUFJLENBQUMsY0FBYyxHQUFHLEVBQUU7RUFDeEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFFO0VBQ3JCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxFQUFFO0VBQzFCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxFQUFFO0VBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNmO0FBRUEsRUFBRSxDQUFDLFNBQVMsR0FBRztFQUVYLE1BQU0sRUFBRSxTQUFSLElBQU0sQ0FBQSxFQUFjO0lBQ2hCO0VBQUEsQ0FDSDtFQUVEO0FBQ0o7QUFDQTtBQUNBOztFQUVJLFdBQVcsRUFBRSxTQUFiLFNBQVcsQ0FBWSxRQUFRLEVBQUUsUUFBUSxFQUFFO0lBRXZDO0lBQ0EsSUFBSSxnQkFBZ0IsR0FBRyxFQUFFO0lBQ3pCO0lBQ0EsSUFBSSxtQkFBbUIsR0FBRyxFQUFFO0lBQzVCO0lBQ0EsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBRXZCLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztJQUVqQixJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO01BRXBDLElBQUks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QzNCLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUM7QUFDL0IsSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDO0FBRXpDLElBQUksUUFBUSxHQUFHLENBQ1gsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUM3QyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDN0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUM3QyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDN0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUM3QyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDN0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUM3QyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDN0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUM3QyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDaEQ7QUFFRCxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNsQixJQUFJLE1BQU0sR0FBRyxLQUFLO0FBRWxCLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLFlBQVk7RUFDL0IsRUFBRSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUM7RUFDNUIsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEdBQUcsSUFBSTtFQUM5QixPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDLEVBQUU7SUFDMUQ7SUFDQSxJQUFJLE1BQU0sRUFBRTtNQUNSO0lBQ0o7SUFFQSxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlDLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDbEUsSUFBSSxVQUFVLEdBQUcsU0FBUyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDO0lBQzNFLElBQUksQ0FBQyxVQUFVLEVBQUU7TUFDYjtJQUNKO0lBQ0E7SUFDQSxJQUFJLEtBQUssR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUM7SUFFL0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFDbEI7SUFDQSxNQUFNLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzlELElBQUksUUFBUSxJQUFJLENBQUMsRUFBRTtNQUNmLFFBQVEsR0FBRyxDQUFDO0lBQ2hCLENBQUMsTUFBTTtNQUNILFFBQVEsR0FBRyxDQUFDO0lBQ2hCO0lBRUEsRUFBRSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUM7RUFDaEMsQ0FBQyxDQUFDO0VBRUYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDO0VBQzFCLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQztBQUMxQixDQUFDOzs7OztBQzVERDtBQUNBLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7QUFDeEIsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQztBQUMvQixJQUFJLFNBQVMsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7QUFDekMsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztBQUV4QixNQUFNLENBQUMsUUFBUSxHQUFHLENBQ2QsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUM3QyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDN0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUM3QyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDN0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUM3QyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDN0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUM3QyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDN0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUM3QyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDaEQ7QUFFRCxNQUFNLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQ3hCLE1BQU0sQ0FBQyxVQUFVLEdBQUcsS0FBSztBQUN6QixNQUFNLENBQUMscUJBQXFCLEdBQUcsSUFBSTtBQUNuQyxNQUFNLENBQUMsTUFBTSxHQUFHLEtBQUs7QUFFckIsTUFBTSxDQUFDLE9BQU8s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O0VBQ0Q7RUFDQSxtQkFBbUIsRUFBRSxTQUFyQixpQkFBbUIsQ0FBWSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtJQUMzQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtNQUM5SyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQztNQUNyQixPQUFPLElBQUk7SUFDZixDQUFDLE1BQU07TUFDSCxPQUFPLEtBQUs7SUFDaEI7RUFDSixDQUFDO0VBQ0Q7RUFDQSxtQkFBbUIsRUFBRSxTQUFyQixpQkFBbUIsQ0FBWSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtJQUMzQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJ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SUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3hCLE9BQVEsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztFQUMxQyxDQUFDO0VBRUQsYUFBYSxFQUFFLFNBQWYsV0FBYSxDQUFZLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFO0lBRWxELElBQUksTUFBTSxJQUFJLElBQUksRUFBRTtNQUNoQixVQUFVLENBQUMsWUFBWTtRQUNuQixRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7TUFDM0IsQ0FBQyxFQUFFLFNBQVMsQ0FBQztJQUNqQixDQUFDLE1BQU07TUFDSCxVQUFVLENBQUMsWUFBWTtRQUNuQixRQUFRLENBQUMsQ0FBQztNQUNkLENBQUMsRUFBRSxTQUFTLENBQUM7SUFDakI7RUFFSixDQUFDO0VBRUQsb0JBQW9CLEVBQUUsU0FBdEIsa0JBQW9CLENBQVksT0FBTyxFQUFFO0lBQ3JDLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDckIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7TUFDckMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUU7UUFDakMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUM7TUFDckI7SUFDSjtJQUNBLE9BQU8sSUFBSTtFQUNmO0FBRUosQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8vIEFJ6YOo5YiGXHJcblxyXG52YXIgdXRpbCA9IHJlcXVpcmUoXCIuL3V0aWxcIik7XHJcbnZhciBnYW1lTG9naWMgPSByZXF1aXJlKFwiLi9nYW1lTG9naWNcIik7XHJcblxyXG5mdW5jdGlvbiBBSSgpIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIHNlbGYuaG9yaXpvbnRhbExpc3QgPSBbXTtcclxuICAgIHNlbGYudmVydGljYUxpc3QgPSBbXTtcclxuICAgIHNlbGYudmljZURpYWdvbmFsTGlzdCA9IFtdO1xyXG4gICAgc2VsZi5tYWluRGlhZ29uYWxMaXN0ID0gW107XHJcbiAgICBzZWxmLmluaXQoKTtcclxufVxyXG5cclxuQUkucHJvdG90eXBlID0ge1xyXG4gICAgXHJcbiAgICBcImluaXRcIjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiQUkgcmVhZHlcIik7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qXHJcbiAgICAgKiBBSeaUvuaji+WtkFxyXG4gICAgICogQHBhcmFtIGdhbWVUdXJuIOa4uOaIj+eahOWFiOWQjuaJi1xyXG4gICAgICovXHJcblxyXG4gICAgXCJzaG90UGllY2VcIjogZnVuY3Rpb24gKGdhbWVUdXJuLCBnYW1lTGlzdCkge1xyXG5cclxuICAgICAgICAvLyDog5zliKnnmoTmnYPph43liJfooahcclxuICAgICAgICB2YXIgX3dpbl93ZWlnaHRfbGlzdCA9IFtdO1xyXG4gICAgICAgIC8vIOWksei0peeahOadg+mHjeWIl+ihqCBcclxuICAgICAgICB2YXIgX2Rhbmdlcl93ZWlnaHRfbGlzdCA9IFtdO1xyXG4gICAgICAgIC8vIOeUn+aIkOmcgOimgeajgOa1i+eahOWogeiDgeiQveWtkOeCuVxyXG4gICAgICAgIGdhbWVMb2dpYy5jaGVja0RhbmdlcigpO1xyXG5cclxuICAgICAgICB2YXIgcG9zaXRpb24gPSB7fTtcclxuXHJcbiAgICAgICAgaWYgKHdpbmRvdy5uZWVkQ29tcHV0ZVBsYWNlLmxlbmd0aCA+IDApIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBfdHVybiA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICBpZiAod2luZG93LmdhbWVUdXJuID09IDApIHtcclxuICAgICAgICAgICAgICAgIF90dXJuID0gMTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh3aW5kb3cuZ2FtZVR1cm4gPT0gMSkge1xyXG4gICAgICAgICAgICAgICAgX3R1cm4gPSAyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgd2luZG93Lm5lZWRDb21wdXRlUGxhY2UubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHZhciB3ZWlnaHQgPSBnYW1lTG9naWMuZ2V0VGhlR2FtZVdlaWdodChnYW1lTGlzdCwgd2luZG93Lm5lZWRDb21wdXRlUGxhY2VbaV0ueCwgd2luZG93Lm5lZWRDb21wdXRlUGxhY2VbaV0ueSwgX3R1cm4pO1xyXG4gICAgICAgICAgICAgICAgdmFyIF9vID0ge307XHJcbiAgICAgICAgICAgICAgICBfby54ID0gd2luZG93Lm5lZWRDb21wdXRlUGxhY2VbaV0ueDtcclxuICAgICAgICAgICAgICAgIF9vLnkgPSB3aW5kb3cubmVlZENvbXB1dGVQbGFjZVtpXS55O1xyXG4gICAgICAgICAgICAgICAgX28ud2VpZ2h0ID0gd2VpZ2h0Lmxlbmd0aDtcclxuICAgICAgICAgICAgICAgIF93aW5fd2VpZ2h0X2xpc3QucHVzaChfbyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh3aW5kb3cuZ2FtZVR1cm4gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgX3R1cm4gPSAyO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHdpbmRvdy5nYW1lVHVybiA9PSAxKSB7XHJcbiAgICAgICAgICAgICAgICBfdHVybiA9IDE7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgd2luZG93Lm5lZWRDb21wdXRlUGxhY2UubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHZhciB3ZWlnaHQgPSBnYW1lTG9naWMuZ2V0VGhlR2FtZVdlaWdodChnYW1lTGlzdCwgd2luZG93Lm5lZWRDb21wdXRlUGxhY2VbaV0ueCwgd2luZG93Lm5lZWRDb21wdXRlUGxhY2VbaV0ueSwgX3R1cm4pO1xyXG4gICAgICAgICAgICAgICAgdmFyIF9vID0ge307XHJcbiAgICAgICAgICAgICAgICBfby54ID0gd2luZG93Lm5lZWRDb21wdXRlUGxhY2VbaV0ueDtcclxuICAgICAgICAgICAgICAgIF9vLnkgPSB3aW5kb3cubmVlZENvbXB1dGVQbGFjZVtpXS55O1xyXG4gICAgICAgICAgICAgICAgX28ud2VpZ2h0ID0gd2VpZ2h0Lmxlbmd0aDtcclxuICAgICAgICAgICAgICAgIF9kYW5nZXJfd2VpZ2h0X2xpc3QucHVzaChfbyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCLov5vmlLtcIik7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKF93aW5fd2VpZ2h0X2xpc3QpO1xyXG5cclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCLpmLLlrohcIik7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKF9kYW5nZXJfd2VpZ2h0X2xpc3QpO1xyXG5cclxuICAgICAgICAgICAgLy/orqHnrpflh7rmnIDlhbfmnInlqIHog4HnmoTngrlcclxuICAgICAgICAgICAgdmFyIF93aW5Qb2ludCA9IHV0aWwuZ2V0TW9zdERhbmdlclBsYWNlKF93aW5fd2VpZ2h0X2xpc3QpO1xyXG4gICAgICAgICAgICB2YXIgX2RhbmdlclBvaW50ID0gdXRpbC5nZXRNb3N0RGFuZ2VyUGxhY2UoX2Rhbmdlcl93ZWlnaHRfbGlzdCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoX3dpblBvaW50LndlaWdodCA+IF9kYW5nZXJQb2ludC53ZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHg6IF93aW5Qb2ludC54LFxyXG4gICAgICAgICAgICAgICAgICAgIHk6IF93aW5Qb2ludC55XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbiA9IHtcclxuICAgICAgICAgICAgICAgICAgICB4OiBfZGFuZ2VyUG9pbnQueCxcclxuICAgICAgICAgICAgICAgICAgICB5OiBfZGFuZ2VyUG9pbnQueVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgeDogNyxcclxuICAgICAgICAgICAgICAgIHk6IDdcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYod2luZG93LmtpbGxQb3NpdGlvbi5sZW5ndGg+MCl7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uID0ge1xyXG4gICAgICAgICAgICAgICAgeDogd2luZG93LmtpbGxQb3NpdGlvblswXS54LFxyXG4gICAgICAgICAgICAgICAgeTogd2luZG93LmtpbGxQb3NpdGlvblswXS55XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHdpbmRvdy5raWxsUG9zaXRpb24gPSBbXTtcclxuXHJcbiAgICAgICAgdmFyIF9wb3MgPSB1dGlsLnNldFBvc2l0aW9uQnlCb2FyZFBvc2l0aW9uKHBvc2l0aW9uLngsIHBvc2l0aW9uLnkpO1xyXG4gICAgICAgIHZhciByaWdodFBsYWNlID0gZ2FtZUxvZ2ljLnNldFBpZWNlSW5HYW1lTGlzdChnYW1lVHVybiwgZ2FtZUxpc3QsIHBvc2l0aW9uKTtcclxuXHJcbiAgICAgICAgaWYgKCFyaWdodFBsYWNlKSByZXR1cm47XHJcbiAgICAgICAgdmFyIHBpZWNlID0gZ2FtZUxvZ2ljLnNob3RQaWVjZShnYW1lVHVybiwgX3Bvcyk7XHJcblxyXG4gICAgICAgIC8vIOWIh+aNouWbnuWQiFxyXG4gICAgICAgIGlmICh3aW5kb3cuZ2FtZVR1cm4gPT0gMCkge1xyXG4gICAgICAgICAgICB3aW5kb3cuZ2FtZVR1cm4gPSAxO1xyXG4gICAgICAgIH0gZWxzZSBpZiAod2luZG93LmdhbWVUdXJuID09IDEpIHtcclxuICAgICAgICAgICAgd2luZG93LmdhbWVUdXJuID0gMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHV0aWwuQUlEZWxheVNob3QoNTAwLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIEhhbXN0ZXIuYWRkKHBpZWNlKTtcclxuICAgICAgICAgICAgLy8gQUnokL3lrZDlkI7liKTmlq3mmK/lkKbmuLjmiI/nu5PmnZ9cclxuICAgICAgICAgICAgd2luZG93LnJlc3VsdCA9IGdhbWVMb2dpYy5nZXRSZXN1bHQoZ2FtZUxpc3QsIHBvc2l0aW9uLngsIHBvc2l0aW9uLnkpO1xyXG4gICAgICAgICAgICB3aW5kb3cuaXNVc2VyVHVybiA9IHRydWU7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQUk7XHJcbiIsIi8qXHJcbiAqIOWPjOS6uuaooeW8j+mAu+i+kVxyXG4gKi8gXHJcbnZhciBVSSA9IHJlcXVpcmUoXCIuL1VJLmpzXCIpO1xyXG52YXIgdXRpbCA9IHJlcXVpcmUoXCIuL3V0aWwuanNcIik7XHJcbnZhciBnYW1lTG9naWMgPSByZXF1aXJlKCcuL2dhbWVMb2dpYy5qcycpO1xyXG5cclxudmFyIGdhbWVMaXN0ID0gW1xyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG5dO1xyXG5cclxudmFyIGdhbWVUdXJuID0gMDsgLy8gMOS7o+ihqOm7keWtkO+8jDHku6Pooajnmb3lrZBcclxudmFyIHJlc3VsdCA9IGZhbHNlO1xyXG5cclxubW9kdWxlLmV4cG9ydHMuc3RhcnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBVSS5jaGFuZ2VkU2lkZVRleHQoZ2FtZVR1cm4pO1xyXG4gICAgVUkuYmFja2dyb3VuZC5pc1RyaWdnZXIgPSB0cnVlO1xyXG4gICAgSGFtc3Rlci5hZGRFdmVudExpc3RlbmVyKFVJLmJhY2tncm91bmQsIFwiY2xpY2tcIiwgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAvLyDliKTmlq3muLjmiI/nmoTnu5PmnpxcclxuICAgICAgICBpZiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBwb3NpdGlvbiA9IHV0aWwuZ2V0Qm9hcmRQb3NpdGlvbihlLngsIGUueSk7XHJcbiAgICAgICAgdmFyIF9wb3MgPSB1dGlsLnNldFBvc2l0aW9uQnlCb2FyZFBvc2l0aW9uKHBvc2l0aW9uLngsIHBvc2l0aW9uLnkpO1xyXG4gICAgICAgIHZhciByaWdodFBsYWNlID0gZ2FtZUxvZ2ljLnNldFBpZWNlSW5HYW1lTGlzdChnYW1lVHVybiwgZ2FtZUxpc3QsIHBvc2l0aW9uKTtcclxuICAgICAgICBpZiAoIXJpZ2h0UGxhY2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvL+eUn+aIkOaji+WtkCBcclxuICAgICAgICB2YXIgcGllY2UgPSBnYW1lTG9naWMuc2hvdFBpZWNlKGdhbWVUdXJuLCBfcG9zKTtcclxuICAgICAgICBcclxuICAgICAgICBIYW1zdGVyLmFkZChwaWVjZSk7XHJcbiAgICAgICAgLy8g6I635Y+W5ri45oiP57uT5p6c5Lul5Y+K5Yik5a6aXHJcbiAgICAgICAgcmVzdWx0ID0gZ2FtZUxvZ2ljLmdldFJlc3VsdChnYW1lTGlzdCwgcG9zaXRpb24ueCwgcG9zaXRpb24ueSk7XHJcbiAgICAgICAgaWYgKGdhbWVUdXJuID09IDApIHtcclxuICAgICAgICAgICAgZ2FtZVR1cm4gPSAxO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGdhbWVUdXJuID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgVUkuY2hhbmdlZFNpZGVUZXh0KGdhbWVUdXJuKTtcclxuICAgIH0pO1xyXG5cclxuICAgIEhhbXN0ZXIuYWRkKFVJLmJhY2tncm91bmQpO1xyXG4gICAgSGFtc3Rlci5hZGQoVUkudHVyblVJKTtcclxufVxyXG4iLCIvLyDljZXkurrmqKHlvI/pgInmi6npgLvovpFcclxudmFyIFVJID0gcmVxdWlyZShcIi4vVUlcIik7XHJcbnZhciB1dGlsID0gcmVxdWlyZShcIi4vdXRpbC5qc1wiKTtcclxudmFyIGdhbWVMb2dpYyA9IHJlcXVpcmUoJy4vZ2FtZUxvZ2ljLmpzJyk7XHJcbnZhciBBSSA9IHJlcXVpcmUoXCIuL0FJXCIpO1xyXG5cclxud2luZG93LmdhbWVMaXN0ID0gW1xyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG4gICAgWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxyXG5dO1xyXG5cclxud2luZG93LmdhbWVUdXJuID0gbnVsbDsgLy8gMOS7o+ihqOm7keWtkO+8jDHku6Pooajnmb3lrZBcclxud2luZG93LmlzVXNlclR1cm4gPSBmYWxzZTtcclxud2luZG93LnVzZXJMYXN0UGllY2VMb2NhdGlvbiA9IG51bGw7XHJcbndpbmRvdy5yZXN1bHQgPSBmYWxzZTtcclxuXHJcbm1vZHVsZS5leHBvcnRzLnN0YXJ0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgSGFtc3Rlci5hZGQoVUkuYmFja2dyb3VuZCk7XHJcbiAgICBIYW1zdGVyLmFkZChVSS50dXJuVUkpO1xyXG5cclxuICAgIHZhciBhaSA9IG5ldyBBSSgpO1xyXG5cclxuICAgIC8vIOiuvue9rueUteiEkeeahOWFiOWQjuaJi1xyXG4gICAgdmFyIHJhbmRvbSA9IHV0aWwuZ2V0UmFuZG9tTnVtYmVyKDAsIDEpO1xyXG5cclxuICAgIHJhbmRvbSA9IDE7XHJcbiAgICBVSS5jaGFuZ2VkU2lkZVRleHQoZ2FtZVR1cm4pO1xyXG4gICAgaWYgKHJhbmRvbSA9PSAwKSB7XHJcbiAgICAgICAgd2luZG93LmdhbWVUdXJuID0gMDtcclxuICAgICAgICAvL+eUteiEkeWFiOaUvuWtkFxyXG4gICAgICAgIGFpLnNob3RQaWVjZShnYW1lVHVybiwgZ2FtZUxpc3QpO1xyXG4gICAgICAgIGlzVXNlclR1cm4gPSBmYWxzZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8g546p5a625YWI5pS+5a2QXHJcbiAgICAgICAgd2luZG93LmdhbWVUdXJuID0gMDtcclxuICAgICAgICB3aW5kb3cuaXNVc2VyVHVybiA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgVUkuYmFja2dyb3VuZC5pc1RyaWdnZXIgPSB0cnVlO1xyXG4gICAgSGFtc3Rlci5hZGRFdmVudExpc3RlbmVyKFVJLmJhY2tncm91bmQsIFwiY2xpY2tcIiwgZnVuY3Rpb24gKGUpIHtcclxuXHJcbiAgICAgICAgLy8g5Yik5pat5ri45oiP55qE57uT5p6cXHJcbiAgICAgICAgaWYgKCF3aW5kb3cuaXNVc2VyVHVybikge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAod2luZG93LnJlc3VsdCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImdhbWUgb3ZlclwiKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcG9zaXRpb24gPSB1dGlsLmdldEJvYXJkUG9zaXRpb24oZS54LCBlLnkpO1xyXG4gICAgICAgIHZhciBfcG9zID0gdXRpbC5zZXRQb3NpdGlvbkJ5Qm9hcmRQb3NpdGlvbihwb3NpdGlvbi54LCBwb3NpdGlvbi55KTtcclxuICAgICAgICB3aW5kb3cudXNlckxhc3RQaWVjZUxvY2F0aW9uID0gcG9zaXRpb247XHJcblxyXG4gICAgICAgIHZhciByaWdodFBsYWNlID0gZ2FtZUxvZ2ljLnNldFBpZWNlSW5HYW1lTGlzdChnYW1lVHVybiwgZ2FtZUxpc3QsIHBvc2l0aW9uKTtcclxuICAgICAgICBpZiAoIXJpZ2h0UGxhY2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy/nlJ/miJDmo4vlrZAgXHJcbiAgICAgICAgdmFyIHBpZWNlID0gZ2FtZUxvZ2ljLnNob3RQaWVjZShnYW1lVHVybiwgX3Bvcyk7XHJcbiAgICAgICAgSGFtc3Rlci5hZGQocGllY2UpO1xyXG5cclxuICAgICAgICAvLyDmo4DmtYvmuLjmiI/nu5PmnpxcclxuICAgICAgICB3aW5kb3cucmVzdWx0ID0gZ2FtZUxvZ2ljLmdldFJlc3VsdChnYW1lTGlzdCwgcG9zaXRpb24ueCwgcG9zaXRpb24ueSk7XHJcblxyXG4gICAgICAgIC8vICDovazmjaLlm57lkIhcclxuICAgICAgICBpZiAod2luZG93LmdhbWVUdXJuID09IDApIHtcclxuICAgICAgICAgICAgd2luZG93LmdhbWVUdXJuID0gMTtcclxuICAgICAgICB9IGVsc2UgaWYgKHdpbmRvdy5nYW1lVHVybiA9PSAxKSB7XHJcbiAgICAgICAgICAgIHdpbmRvdy5nYW1lVHVybiA9IDA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBVSS5jaGFuZ2VkU2lkZVRleHQoZ2FtZVR1cm4pO1xyXG5cclxuICAgICAgICB3aW5kb3cuaXNVc2VyVHVybiA9IGZhbHNlO1xyXG5cclxuICAgICAgICBhaS5zaG90UGllY2UoZ2FtZVR1cm4sIGdhbWVMaXN0KTtcclxuICAgIH0pO1xyXG5cclxufVxyXG4iLCIvLyDog4zmma9cclxuXHJcbm1vZHVsZS5leHBvcnRzLmJhY2tncm91bmQgPSBIYW1zdGVyLlNwcml0ZSh7XHJcblx0XCJuYW1lXCI6IFwiYmFja2dyb3VuZFwiLFxyXG5cdFwiaW1hZ2VOYW1lXCI6IFwiYmFja2dyb3VuZFwiLFxyXG5cdFwieFwiOiAzMyxcclxuXHRcInlcIjogMzVcclxufSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cy50dXJuVUkgPSBIYW1zdGVyLlVJLlRleHQoe1xyXG5cdFwibmFtZVwiOiBcInR1cm5VSVwiLFxyXG5cdFwidGV4dFwiOiBcIuW9k+WJjeWbnuWQiO+8mum7keaji1wiLFxyXG5cdFwiZm9udFNpemVcIjogXCIyMFwiLFxyXG5cdFwiY29sb3JcIjogXCIjZmZmXCIsXHJcblx0XCJ4XCI6IDIzMCxcclxuXHRcInlcIjogMjZcclxufSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cy5jaGFuZ2VkU2lkZVRleHQgPSBmdW5jdGlvbih0dXJuKSB7XHJcblx0aWYgKHR1cm4gPT0gMCkge1xyXG5cdFx0dGhpcy50dXJuVUkuc2V0VGV4dChcIuW9k+WJjeWbnuWQiO+8mum7keaji1wiKTtcclxuXHR9XHJcblxyXG5cdGlmICh0dXJuID09IDEpIHtcclxuXHRcdHRoaXMudHVyblVJLnNldFRleHQoXCLlvZPliY3lm57lkIjvvJrnmb3mo4tcIik7XHJcblx0fVxyXG59IiwiLypcclxuICog5ri45oiP5qC45b+D6YC76L6RXHJcbiAqL1xyXG5cclxuLy8g5p2D6YeN5Li05pe25pWw57uEXHJcbnZhciB3ZWlnaHRfbGlzdCA9IFtdO1xyXG5cclxudmFyIF90ZW1wQ291bnQgPSAwO1xyXG5cclxuLy8g6ZyA6KaB6K6h566X5p2D6YeN55qE5pWw57uEXHJcbndpbmRvdy5uZWVkQ29tcHV0ZVBsYWNlID0gW107XHJcblxyXG4vLyDnm7TmjqXlj6/ku6XmnYDmrbvmr5TotZvnmoTngrkgIOW3sue7j+S4iei/nuS4pOawlCAg5oiW6ICF5bey57uPNOi/nuS4gOawlFxyXG53aW5kb3cua2lsbFBvc2l0aW9uID0gW107XHJcblxyXG53aW5kb3cud2VpZ2h0TnVtYmVyID0gMDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgLy8g5pS+5qOL5a2QXHJcbiAgICBcInNob3RQaWVjZVwiOiBmdW5jdGlvbiAoc2lkZSwgcG9zaXRpb24pIHtcclxuICAgICAgICBpZiAoc2lkZSA9PSAwKSB7XHJcbiAgICAgICAgICAgIHZhciBibGFja1BpZWNlID0gSGFtc3Rlci5TcHJpdGUoe1xyXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiYmxhY2tQaWVjZVwiLFxyXG4gICAgICAgICAgICAgICAgXCJpbWFnZU5hbWVcIjogXCJibGFja1wiLFxyXG4gICAgICAgICAgICAgICAgXCJ4XCI6IHBvc2l0aW9uLngsXHJcbiAgICAgICAgICAgICAgICBcInlcIjogcG9zaXRpb24ueVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIGJsYWNrUGllY2U7XHJcbiAgICAgICAgfSBlbHNlIGlmIChzaWRlID09IDEpIHtcclxuICAgICAgICAgICAgdmFyIHdoaXRlUGllY2UgPSBIYW1zdGVyLlNwcml0ZSh7XHJcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJ3aGl0ZVBpZWNlXCIsXHJcbiAgICAgICAgICAgICAgICBcImltYWdlTmFtZVwiOiBcIndoaXRlXCIsXHJcbiAgICAgICAgICAgICAgICBcInhcIjogcG9zaXRpb24ueCxcclxuICAgICAgICAgICAgICAgIFwieVwiOiBwb3NpdGlvbi55XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4gd2hpdGVQaWVjZTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgLy8g6K6+572u5qOL5a2Q55qE5L2N572uXHJcbiAgICBcInNldFBpZWNlSW5HYW1lTGlzdFwiOiBmdW5jdGlvbiAoZ2FtZVR1cm4sIGdhbWVMaXN0LCBwb3NpdGlvbikge1xyXG4gICAgICAgIGlmIChnYW1lTGlzdFtwb3NpdGlvbi54XVtwb3NpdGlvbi55XSAhPSAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChnYW1lVHVybiA9PSAwKSB7XHJcbiAgICAgICAgICAgIGdhbWVMaXN0W3Bvc2l0aW9uLnhdW3Bvc2l0aW9uLnldID0gMTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSBlbHNlIGlmIChnYW1lVHVybiA9PSAxKSB7XHJcbiAgICAgICAgICAgIGdhbWVMaXN0W3Bvc2l0aW9uLnhdW3Bvc2l0aW9uLnldID0gMjtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvLyDojrflj5bmuLjmiI/nu5PmnpxcclxuICAgIFwiZ2V0UmVzdWx0XCI6IGZ1bmN0aW9uIChnYW1lTGlzdCwgeCwgeSkge1xyXG5cclxuICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IGdhbWVMaXN0Lmxlbmd0aDsgeCsrKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIHkgPSAwOyB5IDwgZ2FtZUxpc3RbeF0ubGVuZ3RoOyB5KyspIHtcclxuICAgICAgICAgICAgICAgIC8vIOaoquWQkeajgOa1i+adoeS7tlxyXG4gICAgICAgICAgICAgICAgaWYgKHggPD0gMTAgJiYgZ2FtZUxpc3RbeF1beV0gIT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNoZWNrSG9yaXpvbnRhbChnYW1lTGlzdCwgeCwgeSkgPT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyDnurXlkJFcclxuICAgICAgICAgICAgICAgIGlmICh5IDw9IDEwICYmIGdhbWVMaXN0W3hdW3ldICE9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jaGVja1ZlcnRpY2EoZ2FtZUxpc3QsIHgsIHkpID09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8g5Ymv5a+56KeS57q/XHJcbiAgICAgICAgICAgICAgICBpZiAoeCA8PSAxMCAmJiB5IDw9IDEwICYmIGdhbWVMaXN0W3hdW3ldICE9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jaGVja1ZpY2VEaWFnb25hbChnYW1lTGlzdCwgeCwgeSkgPT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyDkuLvlr7nop5Lnur9cclxuICAgICAgICAgICAgICAgIGlmICh4IDw9IDEwICYmIHkgPj0gNCAmJiBnYW1lTGlzdFt4XVt5XSAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY2hlY2tNYWluRGlhZ29uYWwoZ2FtZUxpc3QsIHgsIHkpID09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8g5qiq5o6S5qOA5rWLXHJcbiAgICBcImNoZWNrSG9yaXpvbnRhbFwiOiBmdW5jdGlvbiAoZ2FtZUxpc3QsIHgsIHkpIHtcclxuICAgICAgICBpZiAoZ2FtZUxpc3RbeF1beV0gPT0gZ2FtZUxpc3RbeCArIDFdW3ldICYmIGdhbWVMaXN0W3hdW3ldID09IGdhbWVMaXN0W3ggKyAyXVt5XSAmJiBnYW1lTGlzdFt4XVt5XSA9PSBnYW1lTGlzdFt4ICsgM11beV0gJiYgZ2FtZUxpc3RbeF1beV0gPT0gZ2FtZUxpc3RbeCArIDRdW3ldKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwi5qiq5o6S5LqU6L+eXCIpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0sXHJcbiAgICAvLyDnq5bmjpLmo4DmtYtcclxuICAgIFwiY2hlY2tWZXJ0aWNhXCI6IGZ1bmN0aW9uIChnYW1lTGlzdCwgeCwgeSkge1xyXG4gICAgICAgIGlmIChnYW1lTGlzdFt4XVt5XSA9PSBnYW1lTGlzdFt4XVt5ICsgMV0gJiYgZ2FtZUxpc3RbeF1beV0gPT0gZ2FtZUxpc3RbeF1beSArIDJdICYmIGdhbWVMaXN0W3hdW3ldID09IGdhbWVMaXN0W3hdW3kgKyAzXSAmJiBnYW1lTGlzdFt4XVt5XSA9PSBnYW1lTGlzdFt4XVt5ICsgNF0pIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCLnq5bmjpLkupTov55cIik7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgLy8g5Ymv5a+56KeS57q/5qOA5rWLXHJcbiAgICBcImNoZWNrVmljZURpYWdvbmFsXCI6IGZ1bmN0aW9uIChnYW1lTGlzdCwgeCwgeSkge1xyXG4gICAgICAgIGlmIChnYW1lTGlzdFt4XVt5XSA9PSBnYW1lTGlzdFt4ICsgMV1beSArIDFdICYmIGdhbWVMaXN0W3hdW3ldID09IGdhbWVMaXN0W3ggKyAyXVt5ICsgMl0gJiYgZ2FtZUxpc3RbeF1beV0gPT0gZ2FtZUxpc3RbeCArIDNdW3kgKyAzXSAmJiBnYW1lTGlzdFt4XVt5XSA9PSBnYW1lTGlzdFt4ICsgNF1beSArIDRdKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwi6ZmE5a+56KeS57q/5LqU6L+eXCIpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIC8vIOS4u+Wvueinkue6v+ajgOa1i1xyXG4gICAgXCJjaGVja01haW5EaWFnb25hbFwiOiBmdW5jdGlvbiAoZ2FtZUxpc3QsIHgsIHkpIHtcclxuICAgICAgICBpZiAoZ2FtZUxpc3RbeF1beV0gPT0gZ2FtZUxpc3RbeCArIDFdW3kgLSAxXSAmJiBnYW1lTGlzdFt4XVt5XSA9PSBnYW1lTGlzdFt4ICsgMl1beSAtIDJdICYmIGdhbWVMaXN0W3hdW3ldID09IGdhbWVMaXN0W3ggKyAzXVt5IC0gM10gJiYgZ2FtZUxpc3RbeF1beV0gPT0gZ2FtZUxpc3RbeCArIDRdW3kgLSA0XSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIuS4u+Wvueinkue6v+S6lOi/nlwiKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLy8g6I635Y+W5p2D6YeN54K5XHJcbiAgICBcImdldFRoZUdhbWVXZWlnaHRcIjogZnVuY3Rpb24gKGdhbWVMaXN0LCB4LCB5LCB0dXJuKSB7XHJcbiAgICAgICAgdmFyIF90ZW1wID0gW107XHJcbiAgICAgICAgd2VpZ2h0X2xpc3QgPSBbXTtcclxuXHJcbiAgICAgICAgdmFyIHggPSBwYXJzZUludCh4KTtcclxuICAgICAgICB2YXIgeSA9IHBhcnNlSW50KHkpO1xyXG5cclxuICAgICAgICAvLyDojrflj5Z46L205LiK6Z2i55qE5p2D6YeNXHJcbiAgICAgICAgdmFyIGhvcml6b250YWxSaWdodFdlaWdodCA9IHRoaXMuZ2V0SG9yaXpvbnRhbFdlaWdodFRvUmlnaHQoZ2FtZUxpc3QsIHgsIHksIHR1cm4pO1xyXG4gICAgICAgIHZhciBob3Jpem9udGFsTGVmdFdlaWdodCA9IHRoaXMuZ2V0SG9yaXpvbnRhbFdlaWdodFRvTGVmdChnYW1lTGlzdCwgeCwgeSwgdHVybik7XHJcblxyXG4gICAgICAgIHZhciB2ZXJ0aWNhbFRvcFdlaWdodCA9IHRoaXMuZ2V0SG9yaXpvbnRhbFdlaWdodFRvVG9wKGdhbWVMaXN0LCB4LCB5LCB0dXJuKTtcclxuICAgICAgICB2YXIgdmVydGljYWxCb3R0b21XZWlnaHQgPSB0aGlzLmdldEhvcml6b250YWxXZWlnaHRUb0JvdHRvbShnYW1lTGlzdCwgeCwgeSwgdHVybik7XHJcblxyXG4gICAgICAgIHZhciBsZWZ0VG9wV2VpZ2h0ID0gdGhpcy5nZXRMZWZ0VG9wV2VpZ2h0KGdhbWVMaXN0LCB4LCB5LCB0dXJuKTtcclxuICAgICAgICB2YXIgZ2V0UmlnaHRUb3BXZWlnaHQgPSB0aGlzLmdldFJpZ2h0VG9wV2VpZ2h0KGdhbWVMaXN0LCB4LCB5LCB0dXJuKTtcclxuXHJcbiAgICAgICAgdmFyIGxlZnRCb3R0b21XZWlnaHQgPSB0aGlzLmdldExlZnRCb3R0b21XZWlnaHQoZ2FtZUxpc3QsIHgsIHksIHR1cm4pO1xyXG4gICAgICAgIHZhciByaWdodEJvdHRvbVdlaWdodCA9IHRoaXMuZ2V0UmlnaHRCb3R0b21XZWlnaHQoZ2FtZUxpc3QsIHgsIHksIHR1cm4pO1xyXG5cclxuICAgICAgICByZXR1cm4gd2VpZ2h0X2xpc3Q7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIOaoquWQkeWPs+i+ueadg+mHjVxyXG4gICAgXCJnZXRIb3Jpem9udGFsV2VpZ2h0VG9SaWdodFwiOiBmdW5jdGlvbiAoZ2FtZUxpc3QsIHgsIHksIHR1cm4pIHtcclxuICAgICAgICB2YXIgX3AgPSB0dXJuO1xyXG5cclxuICAgICAgICBpZiAoeCA8PSAxMCkge1xyXG5cclxuICAgICAgICAgICAgLy8g5Y+z5L6n55u4562JIOaIluiAheS4uuepulxyXG4gICAgICAgICAgICBpZiAoX3AgPT0gZ2FtZUxpc3RbeCArIDFdW3ldIHx8IGdhbWVMaXN0W3grMV1beV0gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHBvaW50ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHg6IHgsXHJcbiAgICAgICAgICAgICAgICAgICAgeTogeVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgd2VpZ2h0X2xpc3QucHVzaChwb2ludCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoZ2FtZUxpc3RbeCsxXVt5XSA9PSAwKXtcclxuICAgICAgICAgICAgICAgICAgICBpZihfdGVtcENvdW50ID09IDMpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgX2RhbmdlclBvaW50ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDpwYXJzZUludCh4KSsxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTp5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2VpZ2h0Ol90ZW1wQ291bnQqMTBcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIuWPs+i+ueW+iOWNsemZqVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmtpbGxQb3NpdGlvbi5wdXNoKF9kYW5nZXJQb2ludCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBfdGVtcENvdW50ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoZ2FtZUxpc3RbeCsxXVt5XSE9MCl7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmKF90ZW1wQ291bnQgPT0gMyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBfZGFuZ2VyUG9pbnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OnBhcnNlSW50KHgpLTMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3ZWlnaHQ6X3RlbXBDb3VudCoxMFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwi5Y+z6L655b6I5Y2x6ZmpXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cua2lsbFBvc2l0aW9uLnB1c2goX2RhbmdlclBvaW50KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgX3RlbXBDb3VudCArKyA7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdldEhvcml6b250YWxXZWlnaHRUb1JpZ2h0KGdhbWVMaXN0LCB4ICsgMSwgeSwgdHVybik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH0gXHJcbiAgICAgICAgICAgIF90ZW1wQ291bnQgPSAwO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLy8g5qiq5ZCR5bem5pa55ZCR5qOA5rWLXHJcbiAgICBcImdldEhvcml6b250YWxXZWlnaHRUb0xlZnRcIjogZnVuY3Rpb24gKGdhbWVMaXN0LCB4LCB5LCB0dXJuKSB7XHJcbiAgICAgICAgdmFyIF9wID0gdHVybjtcclxuICAgICAgICBpZiAoeCA+IDApIHtcclxuICAgICAgICAgICAgLy8g5Y+z5L6n55u4562JIOaIluiAheS4uuepulxyXG4gICAgICAgICAgICBpZiAoX3AgPT0gZ2FtZUxpc3RbeCAtIDFdW3ldIHx8IGdhbWVMaXN0W3gtMV1beV0gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHBvaW50ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHg6IHgsXHJcbiAgICAgICAgICAgICAgICAgICAgeTogeVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgd2VpZ2h0X2xpc3QucHVzaChwb2ludCk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOW9k+W3pui+ueeahOaji+WtkOS4uuawlOWtlOS4lOacieS4iei/nuaDheWGtVxyXG4gICAgICAgICAgICAgICAgaWYoZ2FtZUxpc3RbeC0xXVt5XSA9PSAwKXtcclxuICAgICAgICAgICAgICAgICAgICBpZihfdGVtcENvdW50ID09IDMpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIF9kYW5nZXJQb2ludCA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6cGFyc2VJbnQoeCktMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6eSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdlaWdodDpfdGVtcENvdW50KjEwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCLlt6bovrnlvojljbHpmalcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5raWxsUG9zaXRpb24ucHVzaChfZGFuZ2VyUG9pbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgX3RlbXBDb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmKGdhbWVMaXN0W3gtMV1beV0hPTApe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKF90ZW1wQ291bnQgPT0gMyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBfZGFuZ2VyUG9pbnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OnBhcnNlSW50KHgpKzMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3ZWlnaHQ6X3RlbXBDb3VudCoxMFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIuW3pui+ueW+iOWNsemZqVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coX2RhbmdlclBvaW50LngseSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5raWxsUG9zaXRpb24ucHVzaChfZGFuZ2VyUG9pbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBfdGVtcENvdW50ICsrIDtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0SG9yaXpvbnRhbFdlaWdodFRvTGVmdChnYW1lTGlzdCxbeC0xXSx5LHR1cm4pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9IFxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgX3RlbXBDb3VudCA9IDA7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLy8g57q15ZCR5LiK5pa55ZCR5qOA5rWLXHJcbiAgICBcImdldEhvcml6b250YWxXZWlnaHRUb1RvcFwiOiBmdW5jdGlvbiAoZ2FtZUxpc3QsIHgsIHksIHR1cm4pIHtcclxuICAgICAgICB2YXIgX3AgPSB0dXJuO1xyXG5cclxuICAgICAgICBpZiAoeSA+IDApIHtcclxuICAgICAgICAgICAgLy8g5Y+z5L6n55u4562JIOaIluiAheS4uuepulxyXG4gICAgICAgICAgICBpZiAoX3AgPT0gZ2FtZUxpc3RbeF1beSAtIDFdIHx8IGdhbWVMaXN0W3hdW3ktMV0gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHBvaW50ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHg6IHgsXHJcbiAgICAgICAgICAgICAgICAgICAgeTogeVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgd2VpZ2h0X2xpc3QucHVzaChwb2ludCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoZ2FtZUxpc3RbeF1beS0xXSA9PSAwKXtcclxuICAgICAgICAgICAgICAgICAgICBpZihfdGVtcENvdW50ID09IDMpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgX2RhbmdlclBvaW50ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDp4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTp5LTEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3ZWlnaHQ6X3RlbXBDb3VudCoxMFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwi57q15ZCR5LiK5pa55b6I5Y2x6ZmpXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cua2lsbFBvc2l0aW9uLnB1c2goX2RhbmdlclBvaW50KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIF90ZW1wQ291bnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYoZ2FtZUxpc3RbeF1beS0xXSE9MCl7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmKF90ZW1wQ291bnQgPT0gMyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBfZGFuZ2VyUG9pbnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OngsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OnkrMyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdlaWdodDpfdGVtcENvdW50KjEwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCLnurXlkJHkuIrmlrnlvojljbHpmalcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5raWxsUG9zaXRpb24ucHVzaChfZGFuZ2VyUG9pbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBfdGVtcENvdW50ICsrIDtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0SG9yaXpvbnRhbFdlaWdodFRvVG9wKGdhbWVMaXN0LCB4LCB5IC0gMSwgdHVybik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgICAgICB9IFxyXG5cclxuICAgICAgICAgICAgX3RlbXBDb3VudCA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvLyDnurXlkJHkuIvmlrnlkJHmo4DmtYtcclxuICAgIFwiZ2V0SG9yaXpvbnRhbFdlaWdodFRvQm90dG9tXCI6IGZ1bmN0aW9uIChnYW1lTGlzdCwgeCwgeSwgdHVybikge1xyXG4gICAgICAgIHZhciBfcCA9IHR1cm47XHJcbiAgICAgICAgaWYgKHkgPCAxNCkge1xyXG4gICAgICAgICAgICAvLyDlj7Pkvqfnm7jnrYkg5oiW6ICF5Li656m6XHJcbiAgICAgICAgICAgIGlmIChfcCA9PSBnYW1lTGlzdFt4XVt5ICsgMV0gfHwgZ2FtZUxpc3RbeF1beSsxXSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcG9pbnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgeDogeCxcclxuICAgICAgICAgICAgICAgICAgICB5OiB5XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB3ZWlnaHRfbGlzdC5wdXNoKHBvaW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihnYW1lTGlzdFt4XVt5KzFdID09IDApe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKF90ZW1wQ291bnQgPT0gMyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBfZGFuZ2VyUG9pbnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OngsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OnkrMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdlaWdodDpfdGVtcENvdW50KjEwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCLnurXlkJHkuIvmlrnlvojljbHpmalcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5raWxsUG9zaXRpb24ucHVzaChfZGFuZ2VyUG9pbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgX3RlbXBDb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmKGdhbWVMaXN0W3hdW3krMV0hPTApe1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZihfdGVtcENvdW50ID09IDMpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgX2RhbmdlclBvaW50ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDp4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTp5LTMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3ZWlnaHQ6X3RlbXBDb3VudCoxMFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwi57q15ZCR5LiL5pa55b6I5Y2x6ZmpXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cua2lsbFBvc2l0aW9uLnB1c2goX2RhbmdlclBvaW50KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIF90ZW1wQ291bnQgKysgO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRIb3Jpem9udGFsV2VpZ2h0VG9Cb3R0b20oZ2FtZUxpc3QsIHgsIHkgKyAxLCB0dXJuKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfSBcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIF90ZW1wQ291bnQgPSAwO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLy8g5bem5LiK5pa55ZCR5qOA5rWLXHJcbiAgICBcImdldExlZnRUb3BXZWlnaHRcIjogZnVuY3Rpb24gKGdhbWVMaXN0LCB4LCB5LCB0dXJuKSB7XHJcbiAgICAgICAgdmFyIF9wID0gdHVybjtcclxuICAgICAgICBpZiAoeSA+IDAgJiYgeCA+IDApIHtcclxuICAgICAgICAgICAgLy8g5Y+z5L6n55u4562JIOaIluiAheS4uuepulxyXG4gICAgICAgICAgICBpZiAoX3AgPT0gZ2FtZUxpc3RbeCAtIDFdW3kgLSAxXSB8fCBnYW1lTGlzdFt4LTFdW3ktMV0gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHBvaW50ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHg6IHgsXHJcbiAgICAgICAgICAgICAgICAgICAgeTogeVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgd2VpZ2h0X2xpc3QucHVzaChwb2ludCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoZ2FtZUxpc3RbeC0xXVt5LTFdID09IDApe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKF90ZW1wQ291bnQgPT0gMyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBfZGFuZ2VyUG9pbnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OngtMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6eS0xLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2VpZ2h0Ol90ZW1wQ291bnQqMTBcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIuW3puS4iuaWueW+iOWNsemZqVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmtpbGxQb3NpdGlvbi5wdXNoKF9kYW5nZXJQb2ludCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBfdGVtcENvdW50ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmKGdhbWVMaXN0W3gtMV1beS0xXSE9MCl7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmKF90ZW1wQ291bnQgPT0gMyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBfZGFuZ2VyUG9pbnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OngrMyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6eSszLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2VpZ2h0Ol90ZW1wQ291bnQqMTBcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIuW3puS4iuaWueW+iOWNsemZqVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmtpbGxQb3NpdGlvbi5wdXNoKF9kYW5nZXJQb2ludCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIF90ZW1wQ291bnQgKysgO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRMZWZ0VG9wV2VpZ2h0KGdhbWVMaXN0LCB4IC0gMSwgeSAtIDEsIHR1cm4pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF90ZW1wQ291bnQgPSAwO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLy8g5bem5LiL5pa5XHJcbiAgICBcImdldExlZnRCb3R0b21XZWlnaHRcIjogZnVuY3Rpb24gKGdhbWVMaXN0LCB4LCB5LCB0dXJuKSB7XHJcbiAgICAgICAgdmFyIF9wID0gdHVybjtcclxuICAgICAgICBpZiAoeSA8IDE0ICYmIHggPiAwKSB7XHJcbiAgICAgICAgICAgIC8vIOWPs+S+p+ebuOetiSDmiJbogIXkuLrnqbpcclxuICAgICAgICAgICAgaWYgKF9wID09IGdhbWVMaXN0W3ggLSAxXVt5ICsgMV0pIHtcclxuICAgICAgICAgICAgICAgIHZhciBwb2ludCA9IHtcclxuICAgICAgICAgICAgICAgICAgICB4OiB4LFxyXG4gICAgICAgICAgICAgICAgICAgIHk6IHlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHdlaWdodF9saXN0LnB1c2gocG9pbnQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRMZWZ0Qm90dG9tV2VpZ2h0KGdhbWVMaXN0LCB4IC0gMSwgeSArIDEsIHR1cm4pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIGVsc2UgaWYgKF9wICE9IGdhbWVMaXN0W3ggLSAxXVt5IC0gMV0gJiYgZ2FtZUxpc3RbeF1beSArIDFdICE9IDApIHtcclxuXHJcbiAgICAgICAgICAgIC8vIH1cclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIOWPs+S4iuaWueajgOa1i1xyXG4gICAgXCJnZXRSaWdodFRvcFdlaWdodFwiOiBmdW5jdGlvbiAoZ2FtZUxpc3QsIHgsIHksIHR1cm4pIHtcclxuICAgICAgICB2YXIgX3AgPSB0dXJuO1xyXG4gICAgICAgIGlmICh5ID4gMCAmJiB4IDwgMTQpIHtcclxuICAgICAgICAgICAgLy8g5Y+z5L6n55u4562JIOaIluiAheS4uuepulxyXG4gICAgICAgICAgICBpZiAoX3AgPT0gZ2FtZUxpc3RbeCArIDFdW3kgLSAxXSB8fCBnYW1lTGlzdFt4KzFdW3ktMV09PTApIHtcclxuICAgICAgICAgICAgICAgIHZhciBwb2ludCA9IHtcclxuICAgICAgICAgICAgICAgICAgICB4OiB4LFxyXG4gICAgICAgICAgICAgICAgICAgIHk6IHlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHdlaWdodF9saXN0LnB1c2gocG9pbnQpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKGdhbWVMaXN0W3grMV1beS0xXSA9PSAwKXtcclxuICAgICAgICAgICAgICAgICAgICBpZihfdGVtcENvdW50ID09IDMpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgX2RhbmdlclBvaW50ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDp4KzEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OnktMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdlaWdodDpfdGVtcENvdW50KjEwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCLlj7PkuIrop5LlvojljbHpmalcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5raWxsUG9zaXRpb24ucHVzaChfZGFuZ2VyUG9pbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgX3RlbXBDb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmKGdhbWVMaXN0W3grMV1beS0xXSE9MCl7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmKF90ZW1wQ291bnQgPT0gMyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBfZGFuZ2VyUG9pbnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OngtMyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6eSszLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2VpZ2h0Ol90ZW1wQ291bnQqMTBcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIuWPs+S4iuinkuW+iOWNsemZqVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmtpbGxQb3NpdGlvbi5wdXNoKF9kYW5nZXJQb2ludCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIF90ZW1wQ291bnQgKysgO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRSaWdodFRvcFdlaWdodChnYW1lTGlzdCwgeCArIDEsIHkgLSAxLCB0dXJuKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgX3RlbXBDb3VudCA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvLyDlj7PkuIvmlrnmo4DmtYtcclxuICAgIFwiZ2V0UmlnaHRCb3R0b21XZWlnaHRcIjogZnVuY3Rpb24gKGdhbWVMaXN0LCB4LCB5LCB0dXJuKSB7XHJcbiAgICAgICAgdmFyIF9wID0gdHVybjtcclxuICAgICAgICBpZiAoeSA8IDE0ICYmIHggPCAxNCkge1xyXG4gICAgICAgICAgICAvLyDlj7Pkvqfnm7jnrYkg5oiW6ICF5Li656m6XHJcbiAgICAgICAgICAgIGlmIChfcCA9PSBnYW1lTGlzdFt4ICsgMV1beSArIDFdKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcG9pbnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgeDogeCxcclxuICAgICAgICAgICAgICAgICAgICB5OiB5XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB3ZWlnaHRfbGlzdC5wdXNoKHBvaW50KTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0UmlnaHRCb3R0b21XZWlnaHQoZ2FtZUxpc3QsIHggKyAxLCB5ICsgMSwgdHVybik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gZWxzZSBpZiAoX3AgIT0gZ2FtZUxpc3RbeCAtIDFdW3kgLSAxXSAmJiBnYW1lTGlzdFt4XVt5ICsgMV0gIT0gMCkge1xyXG5cclxuICAgICAgICAgICAgLy8gfVxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgLy8g5qOA5rWL5aiB6IOB54K5XHJcbiAgICBcImNoZWNrRGFuZ2VyXCI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB3aW5kb3cubmVlZENvbXB1dGVQbGFjZSA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2FtZUxpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBnYW1lTGlzdFtpXS5sZW5ndGg7IGsrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGdhbWVMaXN0W2ldW2tdID09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaSA8IDE0ICYmIGdhbWVMaXN0W2kgKyAxXVtrXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ2FtZUxpc3RbaSArIDFdW2tdICE9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBfdCA9IHt9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90LnggPSBhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90LnkgPSBiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5uZWVkQ29tcHV0ZVBsYWNlLnB1c2goX3QpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkoaSwgaylcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPiAwICYmIGdhbWVMaXN0W2kgLSAxXVtrXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ2FtZUxpc3RbaSAtIDFdW2tdICE9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBfdCA9IHt9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90LnggPSBhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90LnkgPSBiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5uZWVkQ29tcHV0ZVBsYWNlLnB1c2goX3QpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkoaSwgaylcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGsgPCAxNCAmJiBnYW1lTGlzdFtpXVtrICsgMV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdhbWVMaXN0W2ldW2sgKyAxXSAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgX3QgPSB7fTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdC54ID0gYTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdC55ID0gYjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubmVlZENvbXB1dGVQbGFjZS5wdXNoKF90KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKGksIGspXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChrID4gMCAmJiBnYW1lTGlzdFtpXVtrIC0gMV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdhbWVMaXN0W2ldW2sgLSAxXSAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgX3QgPSB7fTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdC54ID0gYTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdC55ID0gYjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubmVlZENvbXB1dGVQbGFjZS5wdXNoKF90KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKGksIGspXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8v5bem5LiK5aiB6IOBXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGsgPiAwICYmIGkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChnYW1lTGlzdFtpIC0gMV1bayAtIDFdICE9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBfdCA9IHt9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90LnggPSBhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90LnkgPSBiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5uZWVkQ29tcHV0ZVBsYWNlLnB1c2goX3QpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkoaSwgaylcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy/lt6bkuIvlqIHog4FcclxuICAgICAgICAgICAgICAgICAgICBpZiAoayA8IDE0ICYmIGkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChnYW1lTGlzdFtpIC0gMV1bayArIDFdICE9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBfdCA9IHt9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90LnggPSBhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90LnkgPSBiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5uZWVkQ29tcHV0ZVBsYWNlLnB1c2goX3QpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkoaSwgaylcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvLyDlj7PkuIrlqIHog4FcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaSA8IDE0ICYmIGsgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChnYW1lTGlzdFtpICsgMV1bayAtIDFdICE9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBfdCA9IHt9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90LnggPSBhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90LnkgPSBiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5uZWVkQ29tcHV0ZVBsYWNlLnB1c2goX3QpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkoaSwgaylcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5Y+z5LiL5aiB6IOBXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPCAxNCAmJiBrIDwgMTQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdhbWVMaXN0W2kgKyAxXVtrICsgMV0gIT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIF90ID0ge307XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX3QueCA9IGE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX3QueSA9IGI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93Lm5lZWRDb21wdXRlUGxhY2UucHVzaChfdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KShpLCBrKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbiIsIi8qKlxyXG4gKiAgSGFtc3Rlci5qcyDkupTlrZDmo4vmuLjmiI9cclxuICogIEF1dGhvcjogU2FuZ2xpYW5nXHJcbiAqICBEYXRlOjIwMTcuMS4xN1xyXG4gKiAgRS1NYWlsOjM3ODMwNTg2OEBxcS5jb21cclxuICovXHJcblxyXG52YXIgZG91YmxlID0gcmVxdWlyZShcIi4vRG91YmxpZVBsYXllck1vZGUuanNcIik7ICAvL+WPjOS6uuaooeW8j1xyXG52YXIgc2luZ2xlID0gcmVxdWlyZShcIi4vU2luZ2xlTW9kZS5qc1wiKTtcclxuXHJcbkhhbXN0ZXIuaW5pdChcIm1haW5cIiwgNjAwLCA2MDApO1xyXG5cclxudmFyIG5vdGljZSA9IEhhbXN0ZXIuVUkuVGV4dCh7XHJcbiAgICBcIm5hbWVcIjogXCJub3RpY2VcIixcclxuICAgIFwiZm9udFNpemVcIjogMjAsXHJcbiAgICBcInRleHRcIjogXCLor7fovpPlhaXmuLjmiI/mqKHlvI/vvIxz5Li65Y2V5Lq65qih5byP77yMZOS4uuWPjOS6uuWvueaImOaooeW8j1wiLFxyXG4gICAgXCJ4XCI6IDEwLFxyXG4gICAgXCJ5XCI6IDMwLFxyXG4gICAgXCJjb2xvclwiOiBcIiNmZmZcIlxyXG59KTtcclxuXHJcbkhhbXN0ZXIuYWRkKG5vdGljZSk7XHJcblxyXG5IYW1zdGVyLmFkZEV2ZW50TGlzdGVuZXIobnVsbCxcImtleURvd25cIixmdW5jdGlvbihlKXtcclxuICAgIGlmKGUuY29kZSA9PSBcIktleVNcIiApe1xyXG4gICAgICAgIEhhbXN0ZXIucmVtb3ZlQWxsKCk7XHJcbiAgICAgICAgc2luZ2xlLnN0YXJ0KCk7XHJcbiAgICB9ZWxzZSBpZihlLmNvZGUgPT0gXCJLZXlEXCIpe1xyXG4gICAgICAgIEhhbXN0ZXIucmVtb3ZlQWxsKCk7XHJcbiAgICAgICAgZG91YmxlLnN0YXJ0KCk7XHJcbiAgICB9XHJcbn0pO1xyXG4iLCIvLyDkuIDkupvluLjnlKjnmoTovazmjaLlh73mlbBcclxuXHJcbnZhciBPRkZTRVRfWCA9IDU1OyAvLyDmo4vnm5jnmoTovrnmoYblgY/np7vph49cclxudmFyIE9GRlNFVF9ZID0gNTU7XHJcbnZhciBPRkZTRVRfUElFQ0UgPSAzNTsgLy8g5qOL5a2Q55qE5YGP56e76YePXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIC8qXHJcbiAgICAgKiBnZXRCb2FyZFBvc2l0aW9uIDrovazmjaLlnZDmoIfkuLrmoLzlrZDkvY3nva5cclxuICAgICAqIEBwYXJhbSB4OiB45Z2Q5qCHXHJcbiAgICAgKiBAcGFyYW0geTogeeWdkOagh1xyXG4gICAgICogQHJldHVybiBvYmog6L2s5o2i5ZCO55qE5qC85a2Q5Z2Q5qCHXHJcbiAgICAgKi9cclxuICAgIFwiZ2V0Qm9hcmRQb3NpdGlvblwiOiBmdW5jdGlvbiAoeCwgeSkge1xyXG4gICAgICAgIGlmICgoeCAtIE9GRlNFVF9YKSAlIE9GRlNFVF9QSUVDRSA+IChPRkZTRVRfUElFQ0UgLyAyKSkge1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0WCA9IHBhcnNlSW50KCh4IC0gT0ZGU0VUX1gpIC8gT0ZGU0VUX1BJRUNFKSArIDE7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdFggPSBwYXJzZUludCgoeCAtIE9GRlNFVF9YKSAvIE9GRlNFVF9QSUVDRSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoKHkgLSBPRkZTRVRfWSkgJSBPRkZTRVRfUElFQ0UgPiAoT0ZGU0VUX1BJRUNFIC8gMikpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdFkgPSBwYXJzZUludCgoeSAtIE9GRlNFVF9ZKSAvIE9GRlNFVF9QSUVDRSkgKyAxO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHRZID0gcGFyc2VJbnQoKHkgLSBPRkZTRVRfWSkgLyBPRkZTRVRfUElFQ0UpO1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIG9iaiA9IHtcclxuICAgICAgICAgICAgXCJ4XCI6IHJlc3VsdFgsXHJcbiAgICAgICAgICAgIFwieVwiOiByZXN1bHRZXHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4gb2JqO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBcclxuICAgIFwic2V0UG9zaXRpb25CeUJvYXJkUG9zaXRpb25cIjogZnVuY3Rpb24gKHgsIHkpIHtcclxuICAgICAgICB2YXIgcmVzdWx0WCA9IHggKiBPRkZTRVRfUElFQ0UgKyBPRkZTRVRfWCAtIE9GRlNFVF9QSUVDRSAvIDI7XHJcbiAgICAgICAgdmFyIHJlc3VsdFkgPSB5ICogT0ZGU0VUX1BJRUNFICsgT0ZGU0VUX1kgLSBPRkZTRVRfUElFQ0UgLyAyO1xyXG4gICAgICAgIHZhciBvYmogPSB7XHJcbiAgICAgICAgICAgIFwieFwiOiByZXN1bHRYLFxyXG4gICAgICAgICAgICBcInlcIjogcmVzdWx0WVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIG9iajtcclxuICAgIH0sXHJcblxyXG4gICAgLyogZ2V0UmFuZG9tTnVtYmVyOuWPlumaj+acuuaVsFxyXG4gICAgICogQHBhcmFtIE1pbiDmnIDlsI/lgLxcclxuICAgICAqIEBwYXJhbSBNYXgg5pyA5aSn5YC8XHJcbiAgICAgKiBAcmV0dXJuIOS7i+S6juacgOWwj+acgOWkp+WAvOS5i+mXtOeahOmaj+acuuWAvFxyXG4gICAgICovXHJcbiAgICBcImdldFJhbmRvbU51bWJlclwiOiBmdW5jdGlvbiAoTWluLCBNYXgpIHtcclxuICAgICAgICB2YXIgUmFuZ2UgPSBNYXggLSBNaW47XHJcbiAgICAgICAgdmFyIFJhbmQgPSBNYXRoLnJhbmRvbSgpO1xyXG4gICAgICAgIHJldHVybiAoTWluICsgTWF0aC5yb3VuZChSYW5kICogUmFuZ2UpKTtcclxuICAgIH0sXHJcblxyXG4gICAgXCJBSURlbGF5U2hvdFwiOiBmdW5jdGlvbiAoZGVsYXlUaW1lLCBjYWxsYmFjaywgdGFyZ2V0KSB7XHJcblxyXG4gICAgICAgIGlmICh0YXJnZXQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmJpbmQodGFyZ2V0KSgpO1xyXG4gICAgICAgICAgICB9LCBkZWxheVRpbWUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcclxuICAgICAgICAgICAgfSwgZGVsYXlUaW1lKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfSxcclxuICAgIFxyXG4gICAgXCJnZXRNb3N0RGFuZ2VyUGxhY2VcIjogZnVuY3Rpb24gKG9iamxpc3QpIHtcclxuICAgICAgICB2YXIgX2JpZyA9IG9iamxpc3RbMF07XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmpsaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChvYmpsaXN0W2ldLndlaWdodCA+IF9iaWcud2VpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICBfYmlnID0gb2JqbGlzdFtpXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gX2JpZztcclxuICAgIH1cclxuXHJcbn0iXX0=
