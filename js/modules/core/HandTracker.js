/**
 * HandTracker.js
 * MediaPipe Handsを使用して手の検出と追跡を行うモジュール
 */

import { Config } from '../../config.js';

export class HandTracker {
  /**
   * コンストラクタ
   * @param {Object} options 設定オプション
   * @param {EventEmitter} eventEmitter イベントエミッタ
   */
  constructor(options = {}, eventEmitter) {
    this.options = { ...Config.handTracking, ...options };
    this.eventEmitter = eventEmitter;
    this.hands = null;
    this.camera = null;
    this.videoElement = null;
    this.isRunning = false;
    this.lastResults = null;
    this.handPositions = [];
    this.handHistory = [];
    this.frameCount = 0;
  }

  /**
   * 初期化処理
   * @param {HTMLVideoElement} videoElement カメラ映像のビデオ要素
   * @returns {Promise<void>}
   */
  async init(videoElement) {
    this.videoElement = videoElement;
    
    try {
      // MediaPipe Handsの初期化
      this.hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });
      
      // オプションの設定
      await this.hands.setOptions({
        maxNumHands: this.options.maxHands,
        modelComplexity: 1,
        minDetectionConfidence: this.options.confidenceThreshold,
        minTrackingConfidence: this.options.confidenceThreshold
      });
      
      // 結果処理のコールバック設定
      this.hands.onResults((results) => this.processResults(results));
      
      // カメラの初期化
      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          if (this.isRunning && this.frameCount % this.options.updateInterval === 0) {
            await this.hands.send({ image: this.videoElement });
          }
          this.frameCount++;
        },
        width: 640,
        height: 480
      });
      
      console.log('HandTracker initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing HandTracker:', error);
      this.eventEmitter.emit('handTracker:error', error);
      return false;
    }
  }

  /**
   * 手のトラッキングを開始する
   */
  async start() {
    if (!this.hands || !this.camera) {
      console.error('HandTracker not initialized');
      return false;
    }
    
    try {
      this.isRunning = true;
      await this.camera.start();
      this.eventEmitter.emit('handTracker:started');
      console.log('HandTracker started');
      return true;
    } catch (error) {
      console.error('Error starting HandTracker:', error);
      this.eventEmitter.emit('handTracker:error', error);
      return false;
    }
  }

  /**
   * 手のトラッキングを停止する
   */
  stop() {
    this.isRunning = false;
    if (this.camera) {
      this.camera.stop();
    }
    this.eventEmitter.emit('handTracker:stopped');
    console.log('HandTracker stopped');
  }

  /**
   * MediaPipeの結果を処理する
   * @param {Object} results MediaPipeから得られた結果
   */
  processResults(results) {
    this.lastResults = results;
    
    // 手の検出結果を処理
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      // 新しい手の位置データ
      const handPositions = results.multiHandLandmarks.map((landmarks, handIndex) => {
        // 指先のインデックス（MediaPipeの指標に基づく）
        const fingerTips = [4, 8, 12, 16, 20]; // 親指、人差し指、中指、薬指、小指の指先
        
        // 指先の位置を抽出
        const tips = fingerTips.map(index => {
          // 座標を正規化（MediaPipeは0-1の範囲、反転して-50～50くらいの範囲に）
          const x = (0.5 - landmarks[index].x) * 100; 
          const y = (landmarks[index].y - 0.5) * 100;
          const z = landmarks[index].z * 100;
          
          return { x, y, z };
        });
        
        // 手首の位置（座標変換）
        const wrist = {
          x: (0.5 - landmarks[0].x) * 100,
          y: (landmarks[0].y - 0.5) * 100,
          z: landmarks[0].z * 100
        };
        
        // 手のひらの中心を計算（5つの関節点の平均）
        const palmPoints = [0, 1, 5, 9, 13, 17]; // 手首と第1関節
        const palm = {
          x: palmPoints.reduce((sum, i) => sum + (0.5 - landmarks[i].x) * 100, 0) / palmPoints.length,
          y: palmPoints.reduce((sum, i) => sum + (landmarks[i].y - 0.5) * 100, 0) / palmPoints.length,
          z: palmPoints.reduce((sum, i) => sum + landmarks[i].z * 100, 0) / palmPoints.length
        };
        
        // 指の開き具合を計算
        const fingerExtension = fingerTips.map((tipIndex, i) => {
          const baseIndex = tipIndex === 4 ? 2 : tipIndex - 3; // 親指は特殊
          const baseLandmark = landmarks[baseIndex];
          const tipLandmark = landmarks[tipIndex];
          
          // 指の長さと基準位置からの距離の比率で開き具合を判定
          const distance = Math.sqrt(
            Math.pow((baseLandmark.x - tipLandmark.x), 2) + 
            Math.pow((baseLandmark.y - tipLandmark.y), 2)
          );
          
          return distance > 0.05; // 閾値を超えると指が開いていると判定
        });
        
        // 全ての関節点をフォーマット
        const joints = landmarks.map((landmark, index) => ({
          x: (0.5 - landmark.x) * 100,
          y: (landmark.y - 0.5) * 100,
          z: landmark.z * 100,
          index: index
        }));
        
        return {
          handIndex,
          tips,
          wrist,
          palm,
          fingerExtension,
          joints,
          handedness: results.multiHandedness[handIndex].label
        };
      });
      
      // 手の軌跡を更新（最大10フレーム分の履歴を保持）
      this.handHistory.push(handPositions);
      if (this.handHistory.length > 10) {
        this.handHistory.shift();
      }
      
      this.handPositions = handPositions;
      
      // 手の位置が更新されたイベントを発行
      this.eventEmitter.emit('handTracker:update', {
        hands: handPositions,
        history: this.handHistory,
        rawResults: results
      });
    } else {
      // 手が検出されない場合は空の配列をセット
      this.handPositions = [];
      this.eventEmitter.emit('handTracker:noHands');
    }
  }

  /**
   * 最新の手の位置を取得
   * @returns {Array} 手の位置情報
   */
  getHandPositions() {
    return this.handPositions;
  }
  
  /**
   * 手のトラッキング結果を描画する（デバッグ用）
   * @param {CanvasRenderingContext2D} ctx キャンバスコンテキスト
   */
  drawHands(ctx) {
    if (!this.lastResults || !this.lastResults.multiHandLandmarks) return;
    
    const { width, height } = ctx.canvas;
    
    // キャンバスをクリア
    ctx.clearRect(0, 0, width, height);
    
    // 手が検出されている場合に描画
    if (this.handPositions.length > 0) {
      this.handPositions.forEach((hand) => {
        // 全ての関節を描画
        hand.joints.forEach((joint) => {
          // 座標を再変換
          const x = width - ((joint.x + 50) * width / 100);
          const y = (joint.y + 50) * height / 100;
          
          // 関節点を描画
          ctx.beginPath();
          ctx.arc(x, y, Config.ui.jointRadius, 0, 2 * Math.PI);
          ctx.fillStyle = Config.ui.skeletonColor;
          ctx.fill();
        });
        
        // 指のつながりを描画
        if (Config.ui.showHandSkeleton) {
          ctx.strokeStyle = Config.ui.skeletonColor;
          ctx.lineWidth = 2;
          
          // 手の骨格を構成する接続（MediaPipeの21点のインデックスに基づく）
          const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],           // 親指
            [0, 5], [5, 6], [6, 7], [7, 8],           // 人差し指
            [0, 9], [9, 10], [10, 11], [11, 12],      // 中指
            [0, 13], [13, 14], [14, 15], [15, 16],    // 薬指
            [0, 17], [17, 18], [18, 19], [19, 20],    // 小指
            [0, 5], [5, 9], [9, 13], [13, 17]         // 手のひら
          ];
          
          // 各接続を描画
          connections.forEach(([i, j]) => {
            const start = hand.joints[i];
            const end = hand.joints[j];
            
            // 座標を再変換
            const x1 = width - ((start.x + 50) * width / 100);
            const y1 = (start.y + 50) * height / 100;
            const x2 = width - ((end.x + 50) * width / 100);
            const y2 = (end.y + 50) * height / 100;
            
            // 線を描画
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          });
        }
      });
    }
  }
}
