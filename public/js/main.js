/**
 *  Hamster.js 五子棋游戏
 *  Author: Sangliang
 *  Date:2017.1.17
 *  E-Mail:378305868@qq.com
 */

var double = require("./DoubliePlayerMode.js");  //双人模式
var single = require("./SingleMode.js");

console.log(double);
Hamster.init("main", 600, 600);

double.start();
