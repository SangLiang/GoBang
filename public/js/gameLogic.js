// 游戏逻辑
module.exports = {
    // 放棋子
    "shotPiece": function(side, position) {
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
    "setPieceInGameList": function(gameTurn, gameList, position) {
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

    "getResult": function(gameList, x, y) {
        // if (x < 10) {
        //     console.log(x, y);
        //     this.checkVertica(gameList, x, y);
        // }

        for (var x = 0; x < gameList.length; x++) {
            for (var y = 0; y < gameList[x].length; y++) {
                // 横向检测条件
                if (x <= 10 && gameList[x][y] != 0) {
                    this.checkHorizontal(gameList, x, y);
                }

                if (y <= 10 && gameList[x][y] != 0) {
                    this.checkVertica(gameList, x, y);
                }
            }
        }
    },

    // 横排检测
    "checkHorizontal": function(gameList, x, y) {
        if (gameList[x][y] == gameList[x + 1][y] && gameList[x][y] == gameList[x + 2][y] && gameList[x][y] == gameList[x + 3][y] && gameList[x][y] == gameList[x + 4][y]) {
            console.log("五连");
            return;
        }

    },
    // 竖排检测
    "checkVertica": function(gameList, x, y) {
        if (gameList[x][y] == gameList[x][y + 1] && gameList[x][y] == gameList[x][y + 2] && gameList[x][y] == gameList[x][y + 3] && gameList[x][y] == gameList[x][y + 4]) {
            console.log("五连");
            return;
        }
    },
    // 副对角线检测
    "checkViceDiagonal": function() {

    },
    // 主对角线检测
    "checkMainDiagonal": function() {

    }
}