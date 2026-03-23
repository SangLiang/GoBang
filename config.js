/**
 * Res is a resource manager ,you can define images,fonts ,sound's name and path
 * When game init , the resource which define in Res will load first
 */

/** 神经辅助：默认关闭；开启且 λ≠0 时才会调用 NN（见 public/js/AI.js） */
var NN_ASSIST_ENABLED = true;
var NN_LAMBDA = 0.08;

var Res = {
    "images": [
        //---UI
        { "src": "./resource/background.png", "name": "background" },
        { "src": "./resource/black.png", "name": "black" },
        { "src": "./resource/white.png", "name": "white" },
        { "src": "./resource/black_bg.png", "name": "black_bg" },
    ],
    "fonts": [],
    "sound": []
};
