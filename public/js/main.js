/**
 *  Hamster.js 五子棋游戏
 *  Author: Sangliang
 *  Date:2017.1.17
 *  E-Mail:378305868@qq.com
 */

var double = require("./DoubliePlayerMode.js");  //双人模式
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

Hamster.addEventListener(null,"keyDown",function(e){
    if(e.code == "KeyS" ){
        Hamster.removeAll();
        single.start();
    }else if(e.code == "KeyD"){
        Hamster.removeAll();
        double.start();
    }
});
