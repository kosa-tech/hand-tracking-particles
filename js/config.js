/**
 * config.js
 * アプリケーション全体の設定パラメータを集約したファイル
 * 調整したいパラメータはすべてここで変更できます
 */

export const Config = {
  // 手のトラッキング設定
  handTracking: {
    confidenceThreshold: 0.7,
    maxHands: 2,
    updateInterval: 10,
  },
  
  // 粒子システム設定
  particles: {
    count: 1000,           // 粒子の最大数
    size: 0.5,             // 粒子の基本サイズ
    maxSpeed: 2.0,         // 粒子の最大速度
    lifetime: 1500,        // 粒子の寿命（フレーム数）
    colors: [              // 粒子の色バリエーション
      '#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff'
    ],
    emissionRate: 5,       // 指先からの放出レート（フレームあたり）
    gravity: 0.03,         // 重力の強さ
    friction: 0.98,        // 摩擦係数（減衰）
    bounceStrength: 0.85,  // 反発係数
    interactionRadius: 10, // 指との相互作用半径
  },
  
  // レンダリング設定
  renderer: {
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
    showFPS: true,
  },
  
  // UI設定
  ui: {
    showHandSkeleton: true,
    controlPanelVisible: true,
    skeletonColor: '#3498db',
    jointRadius: 5,
  },
  
  // ストレージ設定
  storage: {
    captureFolder: 'particle-captures',
    useLocalStorage: true,
    useMCP: true,
  }
};
