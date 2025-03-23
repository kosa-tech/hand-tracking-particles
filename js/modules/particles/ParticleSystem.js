/**
 * ParticleSystem.js
 * 粒子の生成、管理、更新を行うモジュール
 */

import { Config } from '../../config.js';
import { MathUtils } from '../../utils/MathUtils.js';

export class ParticleSystem {
  /**
   * コンストラクタ
   * @param {Object} options 設定オプション
   * @param {EventEmitter} eventEmitter イベントエミッタ
   */
  constructor(options = {}, eventEmitter) {
    this.options = { ...Config.particles, ...options };
    this.eventEmitter = eventEmitter;
    
    // Three.jsの粒子システムオブジェクト
    this.particleSystem = null;
    this.particles = null;
    
    // 粒子の追加データ（Three.jsでは直接扱えないデータ）
    this.velocities = [];
    this.lifetimes = [];
    this.colors = [];
    this.active = [];
    
    // 現在のアクティブな粒子数
    this.particleCount = 0;
    this.maxParticles = this.options.count;
    
    // 指の位置データ
    this.fingerPositions = [];
  }

  /**
   * 粒子システムを初期化
   * @param {THREE.Scene} scene Three.jsのシーン
   * @returns {ParticleSystem} this（メソッドチェーン用）
   */
  init(scene) {
    // ジオメトリの作成
    const geometry = new THREE.BufferGeometry();
    
    // 頂点データの初期化
    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    
    // すべての粒子を画面外に配置
    for (let i = 0; i < this.maxParticles; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = -1000; // 画面外
      
      // 色はランダムに初期化
      const color = new THREE.Color(this.getRandomColor());
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      // 追加データの初期化
      this.velocities.push({ x: 0, y: 0, z: 0 });
      this.lifetimes.push(0);
      this.active.push(false);
      this.colors.push(color);
    }
    
    // ジオメトリに頂点データを設定
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // マテリアルの作成
    const material = new THREE.PointsMaterial({
      size: this.options.size,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });
    
    // 粒子システムの作成とシーンへの追加
    this.particleSystem = new THREE.Points(geometry, material);
    scene.add(this.particleSystem);
    
    // 粒子位置と色の参照を取得
    this.particles = this.particleSystem.geometry.attributes.position.array;
    this.particleColors = this.particleSystem.geometry.attributes.color.array;
    
    console.log(`Particle system initialized with ${this.maxParticles} particles`);
    return this;
  }
  
  /**
   * 粒子の更新（毎フレーム呼び出される）
   * @param {number} deltaTime フレーム間の経過時間（秒）
   * @param {number} frameCount 現在のフレーム数
   */
  update(deltaTime, frameCount) {
    // 全粒子の更新
    let activeCount = 0;
    
    for (let i = 0; i < this.maxParticles; i++) {
      if (!this.active[i]) continue;
      
      activeCount++;
      
      // 粒子の寿命を減らす
      this.lifetimes[i]--;
      
      if (this.lifetimes[i] <= 0) {
        // 寿命が尽きた粒子を非アクティブ化
        this.active[i] = false;
        this.particles[i * 3 + 2] = -1000; // Z座標を画面外に
        continue;
      }
      
      // 重力の適用
      this.velocities[i].y += this.options.gravity;
      
      // 摩擦/空気抵抗の適用
      this.velocities[i].x *= this.options.friction;
      this.velocities[i].y *= this.options.friction;
      this.velocities[i].z *= this.options.friction;
      
      // 位置の更新
      this.particles[i * 3] += this.velocities[i].x;
      this.particles[i * 3 + 1] += this.velocities[i].y;
      this.particles[i * 3 + 2] += this.velocities[i].z;
      
      // 透明度の設定（寿命に応じて）
      const opacity = Math.min(1.0, this.lifetimes[i] / 30); // 消える直前に徐々に透明に
      
      // 粒子と指との相互作用
      this.handleFingerInteraction(i);
    }
    
    // 指から新しい粒子を放出
    if (frameCount % 2 === 0) { // 2フレームに1回
      this.emitParticlesFromFingers();
    }
    
    // 頂点データが更新されたことをThree.jsに通知
    this.particleSystem.geometry.attributes.position.needsUpdate = true;
    this.particleSystem.geometry.attributes.color.needsUpdate = true;
    
    // アクティブな粒子数をステータスとして発行
    if (frameCount % 30 === 0) { // 30フレームに1回
      this.particleCount = activeCount;
      this.eventEmitter.emit('particleSystem:status', {
        activeParticles: activeCount,
        maxParticles: this.maxParticles,
        usagePercentage: (activeCount / this.maxParticles) * 100
      });
    }
  }
  
  /**
   * 指から粒子を放出
   */
  emitParticlesFromFingers() {
    if (!this.fingerPositions || this.fingerPositions.length === 0) return;
    
    // 各指先から粒子を放出
    this.fingerPositions.forEach(hand => {
      hand.tips.forEach((tip, fingerIndex) => {
        // 指が開いているかチェック（開いている場合のみ粒子を放出）
        if (hand.fingerExtension[fingerIndex]) {
          const emitCount = MathUtils.randomInt(1, this.options.emissionRate);
          
          for (let i = 0; i < emitCount; i++) {
            this.emitParticle(tip.x, tip.y, 0);
          }
        }
      });
    });
  }
  
  /**
   * 指と粒子の相互作用
   * @param {number} index 粒子のインデックス
   */
  handleFingerInteraction(index) {
    if (!this.fingerPositions || this.fingerPositions.length === 0) return;
    
    const px = this.particles[index * 3];
    const py = this.particles[index * 3 + 1];
    const pz = this.particles[index * 3 + 2];
    
    // 各指との相互作用をチェック
    this.fingerPositions.forEach(hand => {
      hand.tips.forEach((tip, fingerIndex) => {
        // 指先と粒子の距離を計算
        const dx = tip.x - px;
        const dy = tip.y - py;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 相互作用半径内の場合
        if (distance < this.options.interactionRadius) {
          // 指の動きに応じて粒子を押す
          const pushStrength = 0.5 * (1 - distance / this.options.interactionRadius);
          
          // 指の速度を推定（指の履歴から）
          let vx = 0, vy = 0;
          
          // 指の履歴があれば速度を計算
          if (hand.velocity) {
            vx = hand.velocity.x * 0.1;
            vy = hand.velocity.y * 0.1;
          }
          
          // 粒子に速度を加える
          this.velocities[index].x += (dx / distance) * pushStrength + vx;
          this.velocities[index].y += (dy / distance) * pushStrength + vy;
          
          // 色を少し変化させる（インタラクション効果）
          const colorChange = 0.05;
          this.particleColors[index * 3] = Math.min(1, this.particleColors[index * 3] + colorChange);
          
          // 寿命を少し延長
          this.lifetimes[index] += 5;
        }
      });
    });
  }
  
  /**
   * 新しい粒子を放出
   * @param {number} x X座標
   * @param {number} y Y座標
   * @param {number} z Z座標
   */
  emitParticle(x, y, z) {
    // 非アクティブな粒子を探す
    let particleIndex = -1;
    for (let i = 0; i < this.maxParticles; i++) {
      if (!this.active[i]) {
        particleIndex = i;
        break;
      }
    }
    
    // 非アクティブな粒子がない場合はランダムで上書き
    if (particleIndex === -1) {
      particleIndex = Math.floor(Math.random() * this.maxParticles);
    }
    
    // 粒子を初期化
    this.active[particleIndex] = true;
    
    // 位置の設定
    this.particles[particleIndex * 3] = x;
    this.particles[particleIndex * 3 + 1] = y;
    this.particles[particleIndex * 3 + 2] = z;
    
    // ランダムな初期速度
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * this.options.maxSpeed;
    this.velocities[particleIndex] = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
      z: (Math.random() - 0.5) * 0.2
    };
    
    // 寿命の設定
    this.lifetimes[particleIndex] = this.options.lifetime;
    
    // 色の設定
    const color = new THREE.Color(this.getRandomColor());
    this.particleColors[particleIndex * 3] = color.r;
    this.particleColors[particleIndex * 3 + 1] = color.g;
    this.particleColors[particleIndex * 3 + 2] = color.b;
  }
  
  /**
   * ランダムな色を取得
   * @returns {string} カラーコード
   */
  getRandomColor() {
    const colorIndex = Math.floor(Math.random() * this.options.colors.length);
    return this.options.colors[colorIndex];
  }
  
  /**
   * 手のデータを更新（HandTrackerからのイベント受信）
   * @param {Object} handData 手の位置データ
   */
  updateFromHandData(handData) {
    this.fingerPositions = handData.hands;
  }
  
  /**
   * 粒子システムのリセット
   */
  reset() {
    // すべての粒子を非アクティブ化
    for (let i = 0; i < this.maxParticles; i++) {
      this.active[i] = false;
      this.particles[i * 3 + 2] = -1000; // Z座標を画面外に
    }
    
    this.particleSystem.geometry.attributes.position.needsUpdate = true;
    console.log('Particle system reset');
  }
  
  /**
   * 粒子システムのプロパティを取得
   * @returns {Object} 現在の粒子システムのプロパティ
   */
  getProperties() {
    return {
      particleCount: this.particleCount,
      maxParticles: this.maxParticles,
      size: this.options.size,
      lifetime: this.options.lifetime,
      gravity: this.options.gravity,
      friction: this.options.friction
    };
  }
  
  /**
   * 粒子システムのプロパティを更新
   * @param {Object} properties 更新するプロパティ
   */
  updateProperties(properties) {
    this.options = { ...this.options, ...properties };
    
    // マテリアルのサイズを更新
    if (properties.size !== undefined) {
      this.particleSystem.material.size = properties.size;
    }
    
    console.log('Particle system properties updated:', properties);
    this.eventEmitter.emit('particleSystem:propertiesUpdated', this.options);
  }
}
