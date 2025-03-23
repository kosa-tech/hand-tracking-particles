/**
 * main.js
 * アプリケーションのエントリーポイント
 * すべてのモジュールを統合して実行する
 */

import { Config } from './config.js';
import { EventEmitter } from './utils/EventEmitter.js';
import { HandTracker } from './modules/core/HandTracker.js';
import { GameEngine } from './modules/core/GameEngine.js';
import { ParticleSystem } from './modules/particles/ParticleSystem.js';
import { ParticleEffects } from './modules/particles/ParticleEffects.js';
import { UIController } from './modules/ui/UIController.js';
import { SettingsPanel } from './modules/ui/SettingsPanel.js';
import { StorageManager } from './modules/storage/StorageManager.js';

/**
 * アプリケーションのメインクラス
 */
class HandParticlesApp {
  /**
   * コンストラクタ
   */
  constructor() {
    // イベントエミッタ（モジュール間の通信用）
    this.eventEmitter = new EventEmitter();
    
    // モジュールの初期化
    this.initModules();
    
    // リサイズハンドラの設定
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * モジュールの初期化
   */
  async initModules() {
    // UIコントローラの初期化
    this.uiController = new UIController(this.eventEmitter);
    
    // ストレージマネージャの初期化
    this.storageManager = new StorageManager(this.eventEmitter);
    
    // Three.jsの初期化
    this.initThreeJS();
    
    // ハンドトラッカーの初期化
    this.handTracker = new HandTracker(Config.handTracking, this.eventEmitter);
    
    // 粒子システムの初期化
    this.particleSystem = new ParticleSystem(Config.particles, this.eventEmitter);
    this.particleSystem.init(this.scene);
    
    // 粒子エフェクトの初期化
    this.particleEffects = new ParticleEffects(this.particleSystem);
    
    // ゲームエンジンの初期化
    this.gameEngine = new GameEngine({}, this.eventEmitter);
    this.gameEngine.addGameObject(this.particleSystem);
    
    // 設定パネルの初期化
    this.settingsPanel = new SettingsPanel(this.eventEmitter);
    this.settingsPanel.init(document.body);
    
    // UIの初期化（DOMがロードされた後）
    this.initUI();
    
    // イベントのバインド
    this.bindEvents();
  }

  /**
   * Three.jsの初期化
   */
  initThreeJS() {
    // シーンの作成
    this.scene = new THREE.Scene();
    
    // カメラの作成
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 50;
    
    // レンダラーの作成
    this.renderer = new THREE.WebGLRenderer({ alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(Config.renderer.backgroundColor, 0.1);
    
    // DOMに追加
    document.getElementById('container').appendChild(this.renderer.domElement);
    
    // アニメーションループ開始
    this.animate();
  }

  /**
   * UIの初期化
   */
  initUI() {
    document.addEventListener('DOMContentLoaded', () => {
      this.uiController.init();
      
      // 設定がローカルストレージに保存されていれば読み込む
      const savedSettings = this.storageManager.loadSettings();
      if (savedSettings) {
        this.eventEmitter.emit('settings:loaded', savedSettings);
      }
    });
  }

  /**
   * イベントのバインド
   */
  bindEvents() {
    // ハンドトラッキングのイベント
    this.eventEmitter.on('handTracker:update', (data) => {
      this.particleSystem.updateFromHandData(data);
    });
    
    // UIからのイベント
    this.eventEmitter.on('ui:startCamera', async () => {
      const video = document.getElementById('video');
      if (!video) return;
      
      const success = await this.handTracker.init(video);
      if (success) {
        this.handTracker.start();
      }
    });
    
    this.eventEmitter.on('ui:stopCamera', () => {
      this.handTracker.stop();
    });
    
    this.eventEmitter.on('ui:captureRequested', () => {
      this.captureParticleSystem();
    });
    
    this.eventEmitter.on('ui:settingChanged', ({ setting, value }) => {
      // 粒子システムの設定を更新
      const updatedSettings = { [setting]: value };
      this.particleSystem.updateProperties(updatedSettings);
    });
    
    this.eventEmitter.on('ui:resetRequested', () => {
      this.particleSystem.reset();
    });
    
    this.eventEmitter.on('ui:windowResized', (dimensions) => {
      this.handleResize();
    });
    
    // ストレージ関連
    this.eventEmitter.on('ui:loadCapturesRequested', async (callback) => {
      const captures = await this.storageManager.getCaptures();
      if (callback) callback(captures);
    });
    
    this.eventEmitter.on('ui:loadCaptureRequested', async (id, storage, callback) => {
      const captureData = await this.storageManager.loadCapture(id, storage);
      if (callback) callback(captureData);
    });
    
    this.eventEmitter.on('ui:deleteCaptureRequested', async (id, storage, callback) => {
      const success = await this.storageManager.deleteCapture(id, storage);
      if (callback) callback(success);
    });
    
    this.eventEmitter.on('ui:applyCaptureSettings', (metadata) => {
      if (metadata.particleSettings) {
        this.particleSystem.updateProperties(metadata.particleSettings);
        this.eventEmitter.emit('settings:loaded', metadata.particleSettings);
      }
    });
    
    this.eventEmitter.on('ui:saveSettings', (settings) => {
      this.storageManager.saveSettings(settings);
    });
  }

  /**
   * 粒子システムのキャプチャを行う
   */
  async captureParticleSystem() {
    // レンダラーから画像を取得
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    
    // メタデータを作成
    const metadata = {
      particleSettings: this.particleSystem.getProperties(),
      activeParticles: this.particleSystem.particleCount,
      timestamp: new Date().toISOString(),
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
    
    // ストレージに保存
    await this.storageManager.saveCapture(dataUrl, metadata);
  }

  /**
   * ウィンドウリサイズ時の処理
   */
  handleResize() {
    if (!this.renderer || !this.camera) return;
    
    // レンダラーとカメラのサイズを更新
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  /**
   * アニメーションループ
   */
  animate() {
    // ハンドトラッキングの描画
    if (this.handTracker && Config.ui.showHandSkeleton) {
      const canvas = document.getElementById('hand-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.handTracker.drawHands(ctx);
      }
    }
    
    // Three.jsのレンダリング
    this.renderer.render(this.scene, this.camera);
    
    // 次のフレームをリクエスト
    requestAnimationFrame(this.animate.bind(this));
  }

  /**
   * アプリケーションの起動
   */
  start() {
    this.gameEngine.start();
    console.log('Application started');
  }
}

// アプリケーションのインスタンス作成と起動
const app = new HandParticlesApp();
window.addEventListener('load', () => {
  app.start();
});

// グローバルアクセス用（デバッグ用）
window.app = app;
