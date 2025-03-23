/**
 * ParticleEffects.js
 * 特殊な粒子エフェクトのコレクション
 */

import { Config } from '../../config.js';
import { MathUtils } from '../../utils/MathUtils.js';

export class ParticleEffects {
  /**
   * コンストラクタ
   * @param {ParticleSystem} particleSystem 粒子システム
   */
  constructor(particleSystem) {
    this.particleSystem = particleSystem;
  }

  /**
   * 爆発エフェクト
   * @param {number} x 爆発の中心X座標
   * @param {number} y 爆発の中心Y座標
   * @param {number} z 爆発の中心Z座標
   * @param {number} [particleCount=50] 生成する粒子数
   * @param {number} [radius=10] 爆発の半径
   * @param {string} [color=null] 粒子の色（nullの場合はランダム）
   */
  createExplosion(x, y, z, particleCount = 50, radius = 10, color = null) {
    for (let i = 0; i < particleCount; i++) {
      // ランダムな角度と距離で粒子を配置
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance;
      
      // 粒子を放出し、中心から外側に向かって動くようにする
      const particle = this.particleSystem.emitParticle(px, py, z);
      
      // 色を指定
      if (color && particle !== undefined) {
        const c = new THREE.Color(color);
        const index = particle * 3;
        this.particleSystem.particleColors[index] = c.r;
        this.particleSystem.particleColors[index + 1] = c.g;
        this.particleSystem.particleColors[index + 2] = c.b;
      }
    }
  }

  /**
   * 噴水エフェクト
   * @param {number} x 噴水の位置X座標
   * @param {number} y 噴水の位置Y座標
   * @param {number} particlesPerFrame フレームあたりの粒子数
   * @param {number} [duration=60] 持続フレーム数
   */
  createFountain(x, y, particlesPerFrame = 5, duration = 60) {
    let frameCount = 0;
    
    const interval = setInterval(() => {
      for (let i = 0; i < particlesPerFrame; i++) {
        // 上向きに粒子を放出
        const angle = MathUtils.random(-Math.PI / 4, Math.PI / 4) - Math.PI / 2;
        const speed = MathUtils.random(3, 6);
        
        const px = x + MathUtils.random(-2, 2);
        const py = y;
        
        const particle = this.particleSystem.emitParticle(px, py, 0);
        
        // 粒子に上向きの初速度を設定
        if (particle !== undefined) {
          const index = particle;
          this.particleSystem.velocities[index].x = Math.cos(angle) * speed;
          this.particleSystem.velocities[index].y = Math.sin(angle) * speed;
        }
      }
      
      frameCount++;
      if (frameCount >= duration) {
        clearInterval(interval);
      }
    }, 16); // 約60fpsでの実行
  }

  /**
   * 渦巻きエフェクト
   * @param {number} x 渦の中心X座標
   * @param {number} y 渦の中心Y座標
   * @param {number} [particleCount=100] 生成する粒子数
   * @param {number} [radius=30] 渦の半径
   * @param {number} [rotationSpeed=0.1] 回転速度
   */
  createVortex(x, y, particleCount = 100, radius = 30, rotationSpeed = 0.1) {
    let angle = 0;
    let currentParticles = 0;
    
    const interval = setInterval(() => {
      const r = MathUtils.random(0, radius);
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      
      const particle = this.particleSystem.emitParticle(px, py, 0);
      
      // 粒子に渦を巻くような速度を設定
      if (particle !== undefined) {
        const index = particle;
        const distance = Math.sqrt(Math.pow(px - x, 2) + Math.pow(py - y, 2));
        const tangentialSpeed = rotationSpeed * (radius - distance) / radius;
        
        const vx = -Math.sin(angle) * tangentialSpeed;
        const vy = Math.cos(angle) * tangentialSpeed;
        
        this.particleSystem.velocities[index].x = vx;
        this.particleSystem.velocities[index].y = vy;
      }
      
      angle += 0.1;
      currentParticles++;
      
      if (currentParticles >= particleCount) {
        clearInterval(interval);
      }
    }, 16); // 約60fpsでの実行
  }

  /**
   * 軌道エフェクト（指先の軌跡を強調）
   * @param {Object} handData 手のデータ
   * @param {string} [color=null] 粒子の色（nullの場合はランダム）
   */
  createTrailEffect(handData, color = null) {
    if (!handData || !handData.hands || handData.hands.length === 0) return;
    
    // 各指先の位置に沿って粒子を配置
    handData.hands.forEach(hand => {
      hand.tips.forEach((tip, fingerIndex) => {
        // 指が動いている場合のみ軌跡を作成
        if (hand.fingerExtension[fingerIndex]) {
          // 小さい粒子を放出
          const particle = this.particleSystem.emitParticle(tip.x, tip.y, 0);
          
          // 粒子のサイズを小さく、寿命を短くする
          if (particle !== undefined) {
            const index = particle;
            // 寿命を短く設定して軌跡っぽく
            this.particleSystem.lifetimes[index] = 30;
            
            // 指の動きの速度に応じて粒子に速度を与える
            if (hand.velocity) {
              this.particleSystem.velocities[index].x = hand.velocity.x * 0.1;
              this.particleSystem.velocities[index].y = hand.velocity.y * 0.1;
            }
            
            // 色を設定
            if (color) {
              const c = new THREE.Color(color);
              const colorIndex = index * 3;
              this.particleSystem.particleColors[colorIndex] = c.r;
              this.particleSystem.particleColors[colorIndex + 1] = c.g;
              this.particleSystem.particleColors[colorIndex + 2] = c.b;
            }
          }
        }
      });
    });
  }

  /**
   * 大量の粒子を一点から放射状に放出
   * @param {number} x 放出位置X座標
   * @param {number} y 放出位置Y座標
   * @param {number} [particleCount=200] 粒子数
   */
  createBurst(x, y, particleCount = 200) {
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = MathUtils.random(1, 5);
      
      const particle = this.particleSystem.emitParticle(x, y, 0);
      
      if (particle !== undefined) {
        const index = particle;
        this.particleSystem.velocities[index].x = Math.cos(angle) * speed;
        this.particleSystem.velocities[index].y = Math.sin(angle) * speed;
        
        // ランダムな色
        const colors = [
          '#ff0000', '#ff7700', '#ffff00', '#00ff00', 
          '#00ffff', '#0000ff', '#7700ff', '#ff00ff'
        ];
        const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
        
        const colorIndex = index * 3;
        this.particleSystem.particleColors[colorIndex] = color.r;
        this.particleSystem.particleColors[colorIndex + 1] = color.g;
        this.particleSystem.particleColors[colorIndex + 2] = color.b;
      }
    }
  }
}
