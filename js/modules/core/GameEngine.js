/**
 * GameEngine.js
 * ゲームループと状態管理を行う基本エンジン
 * 粒子シミュレーションだけでなく、他のゲームにも使える再利用可能なモジュール
 */

import { Config } from '../../config.js';

export class GameEngine {
  /**
   * コンストラクタ
   * @param {Object} options 設定オプション
   * @param {EventEmitter} eventEmitter イベントエミッタ
   */
  constructor(options = {}, eventEmitter) {
    this.eventEmitter = eventEmitter;
    this.isRunning = false;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.fps = 0;
    this.gameObjects = [];
    this.gameState = {
      score: 0,
      level: 1,
      paused: false,
      gameOver: false
    };
    
    // タイマーIDを保持（停止用）
    this.animationFrameId = null;
  }

  /**
   * ゲームオブジェクトを追加
   * @param {Object} gameObject ゲームオブジェクト（update/drawメソッドを持つ）
   */
  addGameObject(gameObject) {
    this.gameObjects.push(gameObject);
    return this;
  }

  /**
   * ゲームオブジェクトを削除
   * @param {Object} gameObject 削除するゲームオブジェクト
   */
  removeGameObject(gameObject) {
    const index = this.gameObjects.indexOf(gameObject);
    if (index !== -1) {
      this.gameObjects.splice(index, 1);
    }
    return this;
  }

  /**
   * ゲームステートを更新
   * @param {Object} newState 新しい状態
   */
  updateGameState(newState) {
    this.gameState = { ...this.gameState, ...newState };
    this.eventEmitter.emit('gameEngine:stateChanged', this.gameState);
    return this;
  }

  /**
   * ゲームを開始
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    this.eventEmitter.emit('gameEngine:started');
    
    console.log('Game engine started');
    return this;
  }

  /**
   * ゲームを一時停止
   */
  pause() {
    this.updateGameState({ paused: true });
    this.eventEmitter.emit('gameEngine:paused');
    return this;
  }

  /**
   * ゲームを再開
   */
  resume() {
    this.updateGameState({ paused: false });
    this.eventEmitter.emit('gameEngine:resumed');
    return this;
  }

  /**
   * ゲームを停止
   */
  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.eventEmitter.emit('gameEngine:stopped');
    
    console.log('Game engine stopped');
    return this;
  }

  /**
   * ゲームオーバー処理
   */
  gameOver() {
    this.updateGameState({ gameOver: true });
    this.eventEmitter.emit('gameEngine:gameOver', this.gameState.score);
    this.stop();
    return this;
  }

  /**
   * FPSを計算する
   * @param {number} currentTime 現在時刻
   */
  calculateFPS(currentTime) {
    const deltaTime = currentTime - this.lastFrameTime;
    this.fps = Math.round(1000 / deltaTime);
    
    // 200ms毎にFPS情報をイベントとして発行
    if (this.frameCount % 10 === 0) {
      this.eventEmitter.emit('gameEngine:fpsUpdate', this.fps);
    }
  }

  /**
   * メインゲームループ
   * @param {number} currentTime 現在時刻
   */
  gameLoop(currentTime) {
    if (!this.isRunning) return;
    
    // FPS計算
    this.calculateFPS(currentTime);
    this.lastFrameTime = currentTime;
    this.frameCount++;
    
    // 一時停止中は更新しない
    if (!this.gameState.paused) {
      // デルタタイム（前フレームからの経過時間、秒単位）
      const deltaTime = 1.0 / this.fps;
      
      // すべてのゲームオブジェクトを更新
      for (const obj of this.gameObjects) {
        if (obj.update) {
          obj.update(deltaTime, this.frameCount);
        }
      }
      
      // 衝突検出（必要に応じて）
      this.detectCollisions();
      
      // すべてのゲームオブジェクトを描画
      for (const obj of this.gameObjects) {
        if (obj.draw) {
          obj.draw();
        }
      }
      
      // フレーム終了後のイベント発行
      this.eventEmitter.emit('gameEngine:frameEnd', {
        frameCount: this.frameCount,
        deltaTime,
        gameState: this.gameState
      });
    }
    
    // 次のフレームをリクエスト
    this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  /**
   * 衝突検出（必要に応じてオーバーライド）
   */
  detectCollisions() {
    // 基本実装は何もしない（サブクラスで実装）
  }

  /**
   * デバッグ情報を描画
   * @param {CanvasRenderingContext2D} ctx キャンバスコンテキスト
   */
  drawDebugInfo(ctx) {
    if (!ctx) return;
    
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    
    // FPS
    if (Config.renderer.showFPS) {
      ctx.fillText(`FPS: ${this.fps}`, 10, 20);
    }
    
    // スコア
    if (this.gameState.score > 0) {
      ctx.fillText(`Score: ${this.gameState.score}`, 10, 40);
    }
    
    // レベル
    if (this.gameState.level > 1) {
      ctx.fillText(`Level: ${this.gameState.level}`, 10, 60);
    }
    
    // 一時停止/ゲームオーバー表示
    if (this.gameState.paused) {
      ctx.font = '32px Arial';
      ctx.fillText('PAUSED', ctx.canvas.width / 2 - 60, ctx.canvas.height / 2);
    } else if (this.gameState.gameOver) {
      ctx.font = '32px Arial';
      ctx.fillText('GAME OVER', ctx.canvas.width / 2 - 100, ctx.canvas.height / 2);
      ctx.font = '24px Arial';
      ctx.fillText(`Final Score: ${this.gameState.score}`, ctx.canvas.width / 2 - 80, ctx.canvas.height / 2 + 40);
    }
    
    ctx.restore();
  }
  
  /**
   * 現在のゲーム状態を取得
   * @returns {Object} ゲーム状態
   */
  getGameState() {
    return { ...this.gameState };
  }
}
