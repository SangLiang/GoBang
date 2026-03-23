/*
 * 游戏核心逻辑
 */

// 需要计算权重的数组
window.needComputePlace = [];

// 直接可以杀死比赛的点（保留全局，当前由棋形评分覆盖，不再在此处写入）
window.killPosition = [];

window.weightNumber = 0;

/* ---------- 棋形评分：假设在 (mx,my) 为 player 落子，沿一线分析 ---------- */

function virtualCell(gameList, cx, cy, mx, my, player) {
	if (cx === mx && cy === my) {
		return player;
	}
	if (cx < 0 || cy < 0 || cx > 14 || cy > 14) {
		return -1;
	}
	return gameList[cx][cy];
}

// 沿 (dx,dy) 方向统计与落子点相连的同色子数，并得到左右外侧第一格是否为空
function scanConnectedLine(gameList, mx, my, dx, dy, player) {
	var left = 0;
	var cx = mx - dx;
	var cy = my - dy;
	while (cx >= 0 && cy >= 0 && cx <= 14 && cy <= 14) {
		if (virtualCell(gameList, cx, cy, mx, my, player) !== player) {
			break;
		}
		left++;
		cx -= dx;
		cy -= dy;
	}
	var lx = cx;
	var ly = cy;

	var right = 0;
	cx = mx + dx;
	cy = my + dy;
	while (cx >= 0 && cy >= 0 && cx <= 14 && cy <= 14) {
		if (virtualCell(gameList, cx, cy, mx, my, player) !== player) {
			break;
		}
		right++;
		cx += dx;
		cy += dy;
	}
	var rx = cx;
	var ry = cy;

	var total = 1 + left + right;
	var leftOpen = (lx >= 0 && ly >= 0 && lx <= 14 && ly <= 14 && gameList[lx][ly] === 0);
	var rightOpen = (rx >= 0 && ry >= 0 && rx <= 14 && ry <= 14 && gameList[rx][ry] === 0);

	return {
		"total": total,
		"leftOpen": leftOpen,
		"rightOpen": rightOpen
	};
}

// 单线棋形 → 分数与类型（用于组合加成）
function linePatternScore(total, leftOpen, rightOpen) {
	// 成五 / 长连
	if (total >= 5) {
		return { "score": 1000000, "kind": "FIVE" };
	}
	if (total === 4) {
		if (leftOpen && rightOpen) {
			return { "score": 120000, "kind": "OPEN4" };
		}
		if (leftOpen || rightOpen) {
			return { "score": 15000, "kind": "RUSH4" };
		}
		return { "score": 220, "kind": "DEAD4" };
	}
	if (total === 3) {
		if (leftOpen && rightOpen) {
			return { "score": 2800, "kind": "OPEN3" };
		}
		if (leftOpen || rightOpen) {
			return { "score": 650, "kind": "SLEEP3" };
		}
		return { "score": 120, "kind": "DEAD3" };
	}
	if (total === 2) {
		if (leftOpen && rightOpen) {
			return { "score": 180, "kind": "OPEN2" };
		}
		if (leftOpen || rightOpen) {
			return { "score": 55, "kind": "SLEEP2" };
		}
		return { "score": 15, "kind": "DEAD2" };
	}
	if (leftOpen && rightOpen) {
		return { "score": 35, "kind": "OPEN1" };
	}
	if (leftOpen || rightOpen) {
		return { "score": 10, "kind": "SLEEP1" };
	}
	return { "score": 3, "kind": "LOW" };
}

// 四方向（横、竖、两斜）累计 + 双活三 / 双冲四 加成
function computePatternScoreAt(gameList, mx, my, player) {
	if (gameList[mx][my] !== 0) {
		return 0;
	}
	var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
	var sum = 0;
	var open3Count = 0;
	var rush4Count = 0;
	var i;
	var d;
	var scan;
	var r;

	for (i = 0; i < dirs.length; i++) {
		d = dirs[i];
		scan = scanConnectedLine(gameList, mx, my, d[0], d[1], player);
		r = linePatternScore(scan.total, scan.leftOpen, scan.rightOpen);
		sum += r.score;
		if (r.kind === "OPEN3") {
			open3Count++;
		}
		if (r.kind === "RUSH4") {
			rush4Count++;
		}
	}
	if (open3Count >= 2) {
		sum += 12000;
	}
	if (rush4Count >= 2) {
		sum += 80000;
	}
	return sum;
}

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

    // 棋形评分：假设 turn(1黑/2白) 落在空位 (x,y)，四向连成段 + 活三/冲四组合加成
    "getTheGameWeight": function (gameList, x, y, turn) {
        return computePatternScoreAt(gameList, parseInt(x, 10), parseInt(y, 10), turn);
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
