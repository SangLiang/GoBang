/*
 * 游戏核心逻辑
 */

// 权重临时数组
var weight_list = [];

// 需要计算权重的数组
window.needComputePlace = [];

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
    "getTheGameWeight":function(gameList,x,y){
        // if(){

        // }

        // 获取x轴上面的权重
        weight_list = [];
        var verticaWeight  = this.getHorizontalWeightToRight(gameList,x,y);
        // console.log(weight_list);

        return weight_list.length;
    },

    // 纵向权重
    "getVerticaWeight":function(gameList,x,y){
        var _p = gameList[x][y];

    },
    // 横向右边权重
    "getHorizontalWeightToRight":function(gameList,x,y){
        var _p = gameList[x][y];

        if(x<=10){
            // 右侧相等 或者为空
            if(_p == gameList[x+1][y]){
                var point = {
                    x:x,
                    y:y
                }
                weight_list.push(point);
                this.getHorizontalWeightToRight(gameList,x+1,y);
            }else if(_p !=gameList[x+1][y] && gameList[x+1][y]!=0){
                var point = {
                    x :x,
                    y:y
                }
                weight_list.push(point);
                return;
            }
        }
    },

    "getHorizontalWeightToRight":function(){
        
    },

    // 检测威胁点
    "checkDanger":function(){
        needComputePlace = [];
        
        for(var i = 0; i<gameList.length; i++){
            for(var k =0; k <gameList[i].length; k++){
                if(gameList[i][k] == 0){

                    if(i<14 && gameList[i+1][k] ){
                        if(gameList[i+1][k]!=0){
                            (function(a,b){
                                var _t = {};
                                _t.x = a;
                                _t.y = b;
                                needComputePlace.push(_t);
                            })(i,k)
                        }
                    }

                    if (i>0 && gameList[i-1][k]){
                        if(gameList[i-1][k]!=0){
                            (function(a,b){
                                var _t = {};
                                _t.x = a;
                                _t.y = b;
                                needComputePlace.push(_t);
                            })(i,k)
                        }
                    }

                    if(k<14 && gameList[i][k+1]){
                        if(gameList[i][k+1]!=0){
                           (function(a,b){
                                var _t = {};
                                _t.x = a;
                                _t.y = b;
                                needComputePlace.push(_t);
                            })(i,k)
                        }
                    }

                    if(k>0 && gameList[i][k-1]){
                        if(gameList[i][k-1]!=0){
                            (function(a,b){
                                var _t = {};
                                _t.x = a;
                                _t.y = b;
                                needComputePlace.push(_t);
                            })(i,k)
                        }
                    }
                }
            }
        }
    }


}