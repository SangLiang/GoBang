/**
 * Res is a resource manager ,you can define images,fonts ,sound's name and path
 * When game init , the resource which define in Res will load first
 */

/**
 * 神经辅助（单人 AI，见 public/js/AI.js、nnAssist.js）
 *
 * NN_ASSIST_ENABLED — 总开关。为 false 时不走 NN 分支，与纯规则 AI 一致。
 *
 * NN_LAMBDA — 混合系数 λ（标量），不是神经网络的突触权重。
 *   选点公式：总分 = pattern 分（getTheGameWeight）+ λ × assist（NN 输出）。
 *   λ=0 时不调用 computeAssist；常用试值约 0.02～0.15。
 *
 * 真正的网络权重：由 nnAssist 内随机初始化，或训练服务 data/ai-training.json 根级的
 * nnAssistWeights + nnAssistSchemaVersion（GET /api/training 加载，见 server/README.md）。
 */
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
