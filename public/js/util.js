// 一些常用的转换函数

var OFFSET_X = 55; // 棋盘的边框偏移量
var OFFSET_Y = 55;
var OFFSET_PIECE = 35; // 棋子的偏移量

module.exports = {
    // 获取矩阵位置
    "getBoardPosition": function(x, y) {
        if ((x - OFFSET_X) % OFFSET_PIECE > (OFFSET_PIECE / 2)) {
            var resultX = parseInt((x - OFFSET_X) / OFFSET_PIECE) + 1;
        } else {
            var resultX = parseInt((x - OFFSET_X) / OFFSET_PIECE);
        }

        if ((y - OFFSET_Y) % OFFSET_PIECE > (OFFSET_PIECE / 2)) {
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
    "setPositionByBoardPosition": function(x, y) {
        var resultX = x * OFFSET_PIECE + OFFSET_X - OFFSET_PIECE / 2;
        var resultY = y * OFFSET_PIECE + OFFSET_Y - OFFSET_PIECE / 2;
        var obj = {
            "x": resultX,
            "y": resultY
        };
        return obj;
    }

}