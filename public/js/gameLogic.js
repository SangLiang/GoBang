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
    "shotPiece": function (side, position) {
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
    "setPieceInGameList": function (gameTurn, gameList, position) {
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
    "getResult": function (gameList, x, y) {

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
    "checkHorizontal": function (gameList, x, y) {
        if (gameList[x][y] == gameList[x + 1][y] && gameList[x][y] == gameList[x + 2][y] && gameList[x][y] == gameList[x + 3][y] && gameList[x][y] == gameList[x + 4][y]) {
            console.log("横排五连");
            return true;
        } else {
            return false;
        }

    },
    // 竖排检测
    "checkVertica": function (gameList, x, y) {
        if (gameList[x][y] == gameList[x][y + 1] && gameList[x][y] == gameList[x][y + 2] && gameList[x][y] == gameList[x][y + 3] && gameList[x][y] == gameList[x][y + 4]) {
            console.log("竖排五连");
            return true;
        } else {
            return false;
        }
    },
    // 副对角线检测
    "checkViceDiagonal": function (gameList, x, y) {
        if (gameList[x][y] == gameList[x + 1][y + 1] && gameList[x][y] == gameList[x + 2][y + 2] && gameList[x][y] == gameList[x + 3][y + 3] && gameList[x][y] == gameList[x + 4][y + 4]) {
            console.log("附对角线五连");
            return true;
        } else {
            return false;
        }
    },
    // 主对角线检测
    "checkMainDiagonal": function (gameList, x, y) {
        if (gameList[x][y] == gameList[x + 1][y - 1] && gameList[x][y] == gameList[x + 2][y - 2] && gameList[x][y] == gameList[x + 3][y - 3] && gameList[x][y] == gameList[x + 4][y - 4]) {
            console.log("主对角线五连");
            return true;
        } else {
            return false;
        }
    },

    // 获取权重点
    "getTheGameWeight": function (gameList, x, y, turn) {
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
    "getHorizontalWeightToRight": function (gameList, x, y, turn) {
        var _p = turn;

        if (x <= 10) {

            // 右侧相等 或者为空
            if (_p == gameList[x + 1][y] || gameList[x+1][y] == 0) {
                var point = {
                    x: x,
                    y: y
                }
                weight_list.push(point);

                if(gameList[x+1][y] == 0){
                    if(_tempCount == 3){
                        var _dangerPoint = {
                            x:parseInt(x)+1,
                            y:y,
                            weight:_tempCount*10
                        }
                        console.log("右边很危险");
                        window.killPosition.push(_dangerPoint);
                    }

                    _tempCount = 0;
                    return;
                }

                if(gameList[x+1][y]!=0){

                    if(_tempCount == 3){
                        var _dangerPoint = {
                            x:parseInt(x)-3,
                            y:y,
                            weight:_tempCount*10
                        }
                        console.log("右边很危险");
                        window.killPosition.push(_dangerPoint);
                    }
                }

                _tempCount ++ ;
                this.getHorizontalWeightToRight(gameList, x + 1, y, turn);
                return;
            } 
            _tempCount = 0;
        }
    },

    // 横向左方向检测
    "getHorizontalWeightToLeft": function (gameList, x, y, turn) {
        var _p = turn;
        if (x > 0) {
            // 右侧相等 或者为空
            if (_p == gameList[x - 1][y] || gameList[x-1][y] == 0) {
                var point = {
                    x: x,
                    y: y
                }
                weight_list.push(point);
                
                // 当左边的棋子为气孔且有三连情况
                if(gameList[x-1][y] == 0){
                    if(_tempCount == 3){
                        
                        var _dangerPoint = {
                            x:parseInt(x)-1,
                            y:y,
                            weight:_tempCount*10
                        }
                        console.log("左边很危险");
                        window.killPosition.push(_dangerPoint);
                    }

                    _tempCount = 0;
                    return;
                }

                if(gameList[x-1][y]!=0){
                    if(_tempCount == 3){
                        var _dangerPoint = {
                            x:parseInt(x)+3,
                            y:y,
                            weight:_tempCount*10
                        }

                        console.log("左边很危险");
                        console.log(_dangerPoint.x,y);
                        window.killPosition.push(_dangerPoint);
                    }
                }

                _tempCount ++ ;
                this.getHorizontalWeightToLeft(gameList,[x-1],y,turn);
                return;
            } 
            
            _tempCount = 0;
            
        }
    },

    // 纵向上方向检测
    "getHorizontalWeightToTop": function (gameList, x, y, turn) {
        var _p = turn;

        if (y > 0) {
            // 右侧相等 或者为空
            if (_p == gameList[x][y - 1] || gameList[x][y-1] == 0) {
                var point = {
                    x: x,
                    y: y
                }
                weight_list.push(point);

                if(gameList[x][y-1] == 0){
                    if(_tempCount == 3){
                        var _dangerPoint = {
                            x:x,
                            y:y-1,
                            weight:_tempCount*10
                        }
                        console.log("纵向上方很危险");
                        window.killPosition.push(_dangerPoint);
                    }

                    _tempCount = 0;
                    return;
                }
                
                if(gameList[x][y-1]!=0){

                    if(_tempCount == 3){
                        var _dangerPoint = {
                            x:x,
                            y:y+3,
                            weight:_tempCount*10
                        }
                        console.log("纵向上方很危险");
                        window.killPosition.push(_dangerPoint);
                    }
                }

                _tempCount ++ ;
                this.getHorizontalWeightToTop(gameList, x, y - 1, turn);
                return;

            } 

            _tempCount = 0;
        }
    },

    // 纵向下方向检测
    "getHorizontalWeightToBottom": function (gameList, x, y, turn) {
        var _p = turn;
        if (y < 14) {
            // 右侧相等 或者为空
            if (_p == gameList[x][y + 1] || gameList[x][y+1] == 0) {
                var point = {
                    x: x,
                    y: y
                }
                weight_list.push(point);

                if(gameList[x][y+1] == 0){
                    if(_tempCount == 3){
                        var _dangerPoint = {
                            x:x,
                            y:y+1,
                            weight:_tempCount*10
                        }
                        console.log("纵向下方很危险");
                        window.killPosition.push(_dangerPoint);
                    }

                    _tempCount = 0;
                    return;
                }

                if(gameList[x][y+1]!=0){

                    if(_tempCount == 3){
                        var _dangerPoint = {
                            x:x,
                            y:y-3,
                            weight:_tempCount*10
                        }
                        console.log("纵向下方很危险");
                        window.killPosition.push(_dangerPoint);
                    }
                }
                
                _tempCount ++ ;
                this.getHorizontalWeightToBottom(gameList, x, y + 1, turn);
                return;
            } 
            
            _tempCount = 0;
        }
    },

    // 左上方向检测
    "getLeftTopWeight": function (gameList, x, y, turn) {
        var _p = turn;
        if (y > 0 && x > 0) {
            // 右侧相等 或者为空
            if (_p == gameList[x - 1][y - 1] || gameList[x-1][y-1] == 0) {
                var point = {
                    x: x,
                    y: y
                }
                weight_list.push(point);

                if(gameList[x-1][y-1] == 0){
                    if(_tempCount == 3){
                        var _dangerPoint = {
                            x:x-1,
                            y:y-1,
                            weight:_tempCount*10
                        }
                        console.log("左上方很危险");
                        window.killPosition.push(_dangerPoint);
                    }

                    _tempCount = 0;
                    return;
                }
                
                if(gameList[x-1][y-1]!=0){

                    if(_tempCount == 3){
                        var _dangerPoint = {
                            x:x+3,
                            y:y+3,
                            weight:_tempCount*10
                        }
                        console.log("左上方很危险");
                        window.killPosition.push(_dangerPoint);
                    }
                }

                _tempCount ++ ;
                this.getLeftTopWeight(gameList, x - 1, y - 1, turn);
                return;
            }
            _tempCount = 0;
        }
    },

    // 左下方
    "getLeftBottomWeight": function (gameList, x, y, turn) {
        var _p = turn;
        if (y < 14 && x > 0) {
            // 右侧相等 或者为空
            if (_p == gameList[x - 1][y + 1]) {
                var point = {
                    x: x,
                    y: y
                }
                weight_list.push(point);
                this.getLeftBottomWeight(gameList, x - 1, y + 1, turn);
            }
            // else if (_p != gameList[x - 1][y - 1] && gameList[x][y + 1] != 0) {

            // }
        }
    },

    // 右上方检测
    "getRightTopWeight": function (gameList, x, y, turn) {
        var _p = turn;
        if (y > 0 && x < 14) {
            // 右侧相等 或者为空
            if (_p == gameList[x + 1][y - 1] || gameList[x+1][y-1]==0) {
                var point = {
                    x: x,
                    y: y
                }
                weight_list.push(point);

                if(gameList[x+1][y-1] == 0){
                    if(_tempCount == 3){
                        var _dangerPoint = {
                            x:x+1,
                            y:y-1,
                            weight:_tempCount*10
                        }
                        console.log("右上角很危险");
                        window.killPosition.push(_dangerPoint);
                    }

                    _tempCount = 0;
                    return;
                }

                if(gameList[x+1][y-1]!=0){

                    if(_tempCount == 3){
                        var _dangerPoint = {
                            x:x-3,
                            y:y+3,
                            weight:_tempCount*10
                        }
                        console.log("右上角很危险");
                        window.killPosition.push(_dangerPoint);
                    }
                }

                _tempCount ++ ;
                this.getRightTopWeight(gameList, x + 1, y - 1, turn);
            }
            
            _tempCount = 0;
        }
    },

    // 右下方检测
    "getRightBottomWeight": function (gameList, x, y, turn) {
        var _p = turn;
        if (y < 14 && x < 14) {
            // 右侧相等 或者为空
            if (_p == gameList[x + 1][y + 1]) {
                var point = {
                    x: x,
                    y: y
                }
                weight_list.push(point);
                this.getRightBottomWeight(gameList, x + 1, y + 1, turn);
            }
            // else if (_p != gameList[x - 1][y - 1] && gameList[x][y + 1] != 0) {

            // }
        }
    },

    // 检测威胁点
    "checkDanger": function () {
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
                            })(i, k)
                        }
                    }

                    if (i > 0 && gameList[i - 1][k]) {
                        if (gameList[i - 1][k] != 0) {
                            (function (a, b) {
                                var _t = {};
                                _t.x = a;
                                _t.y = b;
                                window.needComputePlace.push(_t);
                            })(i, k)
                        }
                    }

                    if (k < 14 && gameList[i][k + 1]) {
                        if (gameList[i][k + 1] != 0) {
                            (function (a, b) {
                                var _t = {};
                                _t.x = a;
                                _t.y = b;
                                window.needComputePlace.push(_t);
                            })(i, k)
                        }
                    }

                    if (k > 0 && gameList[i][k - 1]) {
                        if (gameList[i][k - 1] != 0) {
                            (function (a, b) {
                                var _t = {};
                                _t.x = a;
                                _t.y = b;
                                window.needComputePlace.push(_t);
                            })(i, k)
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
                            })(i, k)
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
                            })(i, k)
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
                            })(i, k)
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
                            })(i, k)
                        }
                    }
                }
            }
        }
    }
}
