/**
 * UIController.js
 * ユーザーインターフェースの管理とイベントハンドリング
 */

import { Config } from '../../config.js';
import { DOMUtils } from '../../utils/DOMUtils.js';

export class UIController {
  /**
   * コンストラクタ
   * @param {EventEmitter} eventEmitter イベントエミッタ
   */
  constructor(eventEmitter) {
    this.eventEmitter = eventEmitter;
    this.elements = {};
    this.isControlPanelVisible = Config.ui.controlPanelVisible;
    this.isFullscreen = false;
    this.isCameraActive = false;
    
    // ハンドトラッキングの状態
    this.handTrackingStatus = {
      isInitialized: false,
      isRunning: false,
      handsDetected: false,
      lastUpdate: 0
    };
    
    // 粒子システムの状態
    this.particleSystemStatus = {
      activeParticles: 0,
      maxParticles: Config.particles.count,
      fps: 0
    };
    
    // ストレージの状態
    this.storageStatus = {
      mcpAvailable: false,
      localStorageAvailable: false,
      captures: []
    };
  }

  /**
   * UIを初期化
   */
  init() {
    // DOM要素の参照を取得
    this.elements = {
      video: document.getElementById('video'),
      handCanvas: document.getElementById('hand-canvas'),
      container: document.getElementById('container'),
      controlPanel: document.getElementById('control-panel'),
      statusBar: document.getElementById('status-bar'),
      startCameraBtn: document.getElementById('start-camera'),
      captureBtn: document.getElementById('capture-button'),
      settingsBtn: document.getElementById('settings-button'),
      resetBtn: document.getElementById('reset-button'),
      fullscreenBtn: document.getElementById('fullscreen-button'),
      capturesList: document.getElementById('captures-list'),
      settingsPanel: document.getElementById('settings-panel'),
      statusText: document.getElementById('status-text'),
      fpsCounter: document.getElementById('fps-counter')
    };
    
    // コントロールパネルの表示/非表示を設定
    this.updateControlPanelVisibility();
    
    // イベントリスナーを設定
    this.setupEventListeners();
    
    // イベントエミッタのイベントを購読
    this.subscribeToEvents();
    
    console.log('UI Controller initialized');
    return this;
  }

  /**
   * コントロールパネルの表示/非表示を切り替え
   */
  toggleControlPanel() {
    this.isControlPanelVisible = !this.isControlPanelVisible;
    this.updateControlPanelVisibility();
    this.eventEmitter.emit('ui:controlPanelToggled', this.isControlPanelVisible);
  }

  /**
   * コントロールパネルの表示状態を更新
   */
  updateControlPanelVisibility() {
    if (this.elements.controlPanel) {
      this.elements.controlPanel.style.display = this.isControlPanelVisible ? 'block' : 'none';
    }
  }

  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    // カメラ開始ボタン
    if (this.elements.startCameraBtn) {
      DOMUtils.addEvent(this.elements.startCameraBtn, 'click', () => {
        if (!this.isCameraActive) {
          this.eventEmitter.emit('ui:startCamera');
          this.elements.startCameraBtn.textContent = 'カメラ停止';
        } else {
          this.eventEmitter.emit('ui:stopCamera');
          this.elements.startCameraBtn.textContent = 'カメラ開始';
        }
        this.isCameraActive = !this.isCameraActive;
      });
    }
    
    // キャプチャボタン
    if (this.elements.captureBtn) {
      DOMUtils.addEvent(this.elements.captureBtn, 'click', () => {
        this.eventEmitter.emit('ui:captureRequested');
      });
    }
    
    // 設定ボタン
    if (this.elements.settingsBtn) {
      DOMUtils.addEvent(this.elements.settingsBtn, 'click', () => {
        if (this.elements.settingsPanel) {
          const isVisible = this.elements.settingsPanel.style.display !== 'none';
          this.elements.settingsPanel.style.display = isVisible ? 'none' : 'block';
        }
      });
    }
    
    // リセットボタン
    if (this.elements.resetBtn) {
      DOMUtils.addEvent(this.elements.resetBtn, 'click', () => {
        this.eventEmitter.emit('ui:resetRequested');
      });
    }
    
    // フルスクリーンボタン
    if (this.elements.fullscreenBtn) {
      DOMUtils.addEvent(this.elements.fullscreenBtn, 'click', () => {
        this.toggleFullscreen();
      });
    }
    
    // ウィンドウリサイズイベント
    window.addEventListener('resize', () => {
      this.eventEmitter.emit('ui:windowResized', {
        width: window.innerWidth,
        height: window.innerHeight
      });
    });
    
    // 設定パネルの各コントロール
    this.setupSettingsControls();
  }

  /**
   * 設定パネルのコントロールを設定
   */
  setupSettingsControls() {
    // 粒子数スライダー
    const particleCountSlider = document.getElementById('particle-count');
    if (particleCountSlider) {
      particleCountSlider.value = Config.particles.count;
      DOMUtils.addEvent(particleCountSlider, 'input', (e) => {
        const count = parseInt(e.target.value, 10);
        document.getElementById('particle-count-value').textContent = count;
      });
      
      DOMUtils.addEvent(particleCountSlider, 'change', (e) => {
        const count = parseInt(e.target.value, 10);
        this.eventEmitter.emit('ui:settingChanged', { 
          setting: 'count', 
          value: count 
        });
      });
    }
    
    // 粒子サイズスライダー
    const particleSizeSlider = document.getElementById('particle-size');
    if (particleSizeSlider) {
      particleSizeSlider.value = Config.particles.size;
      DOMUtils.addEvent(particleSizeSlider, 'input', (e) => {
        const size = parseFloat(e.target.value);
        document.getElementById('particle-size-value').textContent = size.toFixed(1);
      });
      
      DOMUtils.addEvent(particleSizeSlider, 'change', (e) => {
        const size = parseFloat(e.target.value);
        this.eventEmitter.emit('ui:settingChanged', { 
          setting: 'size', 
          value: size 
        });
      });
    }
    
    // 重力スライダー
    const gravitySlider = document.getElementById('gravity');
    if (gravitySlider) {
      gravitySlider.value = Config.particles.gravity;
      DOMUtils.addEvent(gravitySlider, 'input', (e) => {
        const gravity = parseFloat(e.target.value);
        document.getElementById('gravity-value').textContent = gravity.toFixed(2);
      });
      
      DOMUtils.addEvent(gravitySlider, 'change', (e) => {
        const gravity = parseFloat(e.target.value);
        this.eventEmitter.emit('ui:settingChanged', { 
          setting: 'gravity', 
          value: gravity 
        });
      });
    }
    
    // 摩擦係数スライダー
    const frictionSlider = document.getElementById('friction');
    if (frictionSlider) {
      frictionSlider.value = Config.particles.friction;
      DOMUtils.addEvent(frictionSlider, 'input', (e) => {
        const friction = parseFloat(e.target.value);
        document.getElementById('friction-value').textContent = friction.toFixed(2);
      });
      
      DOMUtils.addEvent(frictionSlider, 'change', (e) => {
        const friction = parseFloat(e.target.value);
        this.eventEmitter.emit('ui:settingChanged', { 
          setting: 'friction', 
          value: friction 
        });
      });
    }
    
    // 寿命スライダー
    const lifetimeSlider = document.getElementById('lifetime');
    if (lifetimeSlider) {
      lifetimeSlider.value = Config.particles.lifetime;
      DOMUtils.addEvent(lifetimeSlider, 'input', (e) => {
        const lifetime = parseInt(e.target.value, 10);
        document.getElementById('lifetime-value').textContent = lifetime;
      });
      
      DOMUtils.addEvent(lifetimeSlider, 'change', (e) => {
        const lifetime = parseInt(e.target.value, 10);
        this.eventEmitter.emit('ui:settingChanged', { 
          setting: 'lifetime', 
          value: lifetime 
        });
      });
    }
    
    // ハンドスケルトン表示スイッチ
    const showSkeletonSwitch = document.getElementById('show-skeleton');
    if (showSkeletonSwitch) {
      showSkeletonSwitch.checked = Config.ui.showHandSkeleton;
      DOMUtils.addEvent(showSkeletonSwitch, 'change', (e) => {
        this.eventEmitter.emit('ui:settingChanged', { 
          setting: 'showHandSkeleton', 
          value: e.target.checked 
        });
      });
    }
  }

  /**
   * イベントエミッタのイベントを購読
   */
  subscribeToEvents() {
    // ハンドトラッキングの状態更新
    this.eventEmitter.on('handTracker:started', () => {
      this.handTrackingStatus.isInitialized = true;
      this.handTrackingStatus.isRunning = true;
      this.updateStatusText();
    });
    
    this.eventEmitter.on('handTracker:stopped', () => {
      this.handTrackingStatus.isRunning = false;
      this.updateStatusText();
    });
    
    this.eventEmitter.on('handTracker:update', (data) => {
      this.handTrackingStatus.handsDetected = data.hands.length > 0;
      this.handTrackingStatus.lastUpdate = Date.now();
      this.updateStatusText();
    });
    
    this.eventEmitter.on('handTracker:noHands', () => {
      this.handTrackingStatus.handsDetected = false;
      this.updateStatusText();
    });
    
    this.eventEmitter.on('handTracker:error', (error) => {
      this.showError('ハンドトラッキングエラー', error.message);
    });
    
    // 粒子システムの状態更新
    this.eventEmitter.on('particleSystem:status', (status) => {
      this.particleSystemStatus.activeParticles = status.activeParticles;
      this.particleSystemStatus.maxParticles = status.maxParticles;
      this.updateStatusText();
    });
    
    // FPS更新
    this.eventEmitter.on('gameEngine:fpsUpdate', (fps) => {
      this.particleSystemStatus.fps = fps;
      if (this.elements.fpsCounter) {
        this.elements.fpsCounter.textContent = `FPS: ${fps}`;
      }
    });
    
    // ストレージの状態更新
    this.eventEmitter.on('storage:mcpAvailable', (available) => {
      this.storageStatus.mcpAvailable = available;
      this.updateStatusText();
    });
    
    this.eventEmitter.on('storage:captureSaved', (data) => {
      this.showNotification('キャプチャを保存しました');
      this.loadCapturesList();
    });
    
    this.eventEmitter.on('storage:error', (error) => {
      this.showError('ストレージエラー', error.message);
    });
  }

  /**
   * キャプチャ一覧を読み込む
   */
  async loadCapturesList() {
    this.eventEmitter.emit('ui:loadCapturesRequested', (captures) => {
      this.storageStatus.captures = captures;
      this.renderCapturesList(captures);
    });
  }

  /**
   * キャプチャ一覧をレンダリング
   * @param {Array} captures キャプチャ一覧
   */
  renderCapturesList(captures) {
    if (!this.elements.capturesList) return;
    
    // リストをクリア
    this.elements.capturesList.innerHTML = '';
    
    if (captures.length === 0) {
      const noCaptures = document.createElement('div');
      noCaptures.className = 'no-captures';
      noCaptures.textContent = 'キャプチャがありません';
      this.elements.capturesList.appendChild(noCaptures);
      return;
    }
    
    // 各キャプチャをリストに追加
    captures.forEach(capture => {
      const captureItem = document.createElement('div');
      captureItem.className = 'capture-item';
      
      // サムネイル
      const thumbnail = document.createElement('div');
      thumbnail.className = 'capture-thumbnail';
      
      // 画像の表示
      if (capture.image) {
        const img = document.createElement('img');
        img.src = capture.image;
        img.alt = 'Capture';
        thumbnail.appendChild(img);
      } else if (capture.path) {
        // MCPから画像を読み込む
        const img = document.createElement('img');
        img.alt = 'Loading...';
        img.dataset.path = capture.path;
        img.dataset.id = capture.id;
        img.dataset.storage = capture.storage;
        
        // 画像をロードする
        this.eventEmitter.emit('ui:loadCaptureRequested', capture.id, capture.storage, (captureData) => {
          if (captureData && captureData.image) {
            img.src = captureData.image;
          } else {
            img.alt = 'Load Failed';
          }
        });
        
        thumbnail.appendChild(img);
      }
      
      // 情報
      const info = document.createElement('div');
      info.className = 'capture-info';
      
      // 日時
      if (capture.metadata && capture.metadata.captureDate) {
        const date = new Date(capture.metadata.captureDate);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        
        const dateTime = document.createElement('div');
        dateTime.className = 'capture-date';
        dateTime.textContent = `${dateStr} ${timeStr}`;
        info.appendChild(dateTime);
      }
      
      // 粒子数
      if (capture.metadata && capture.metadata.activeParticles) {
        const particles = document.createElement('div');
        particles.className = 'capture-particles';
        particles.textContent = `粒子数: ${capture.metadata.activeParticles}`;
        info.appendChild(particles);
      }
      
      // アクション
      const actions = document.createElement('div');
      actions.className = 'capture-actions';
      
      // 読み込みボタン
      const loadButton = document.createElement('button');
      loadButton.className = 'capture-load-button';
      loadButton.textContent = '読み込み';
      loadButton.addEventListener('click', () => {
        this.eventEmitter.emit('ui:loadCaptureRequested', capture.id, capture.storage, (captureData) => {
          if (captureData) {
            this.eventEmitter.emit('ui:applyCaptureSettings', captureData.metadata);
            this.showNotification('キャプチャ設定を適用しました');
          }
        });
      });
      actions.appendChild(loadButton);
      
      // 削除ボタン
      const deleteButton = document.createElement('button');
      deleteButton.className = 'capture-delete-button';
      deleteButton.textContent = '削除';
      deleteButton.addEventListener('click', () => {
        if (confirm('このキャプチャを削除しますか？')) {
          this.eventEmitter.emit('ui:deleteCaptureRequested', capture.id, capture.storage, (success) => {
            if (success) {
              this.loadCapturesList();
              this.showNotification('キャプチャを削除しました');
            }
          });
        }
      });
      actions.appendChild(deleteButton);
      
      // 要素を組み立て
      captureItem.appendChild(thumbnail);
      captureItem.appendChild(info);
      captureItem.appendChild(actions);
      
      this.elements.capturesList.appendChild(captureItem);
    });
  }

  /**
   * フルスクリーン表示を切り替え
   */
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => {
        console.error(`フルスクリーンエラー: ${e.message}`);
      });
      this.isFullscreen = true;
    } else {
      document.exitFullscreen();
      this.isFullscreen = false;
    }
  }

  /**
   * ステータステキストを更新
   */
  updateStatusText() {
    if (!this.elements.statusText) return;
    
    let status = '';
    
    // カメラの状態
    if (this.isCameraActive) {
      status += '📷 カメラ: オン ';
    } else {
      status += '📷 カメラ: オフ ';
    }
    
    // 手の検出状態
    if (this.handTrackingStatus.handsDetected) {
      status += '👋 手: 検出中 ';
    } else if (this.handTrackingStatus.isRunning) {
      status += '👋 手: 検出なし ';
    } else {
      status += '👋 手: 停止中 ';
    }
    
    // 粒子の状態
    status += `✨ 粒子: ${this.particleSystemStatus.activeParticles}/${this.particleSystemStatus.maxParticles} `;
    
    // FPSの状態
    status += `⚡ FPS: ${this.particleSystemStatus.fps} `;
    
    // ストレージの状態
    if (this.storageStatus.mcpAvailable) {
      status += '💾 MCP: 利用可能 ';
    } else {
      status += '💾 MCP: 利用不可 ';
    }
    
    this.elements.statusText.textContent = status;
  }

  /**
   * 通知を表示
   * @param {string} message メッセージ
   */
  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  /**
   * エラーを表示
   * @param {string} title タイトル
   * @param {string} message メッセージ
   */
  showError(title, message) {
    const errorBox = document.createElement('div');
    errorBox.className = 'error-box';
    
    const errorTitle = document.createElement('div');
    errorTitle.className = 'error-title';
    errorTitle.textContent = title;
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'error-close';
    closeButton.textContent = '閉じる';
    closeButton.addEventListener('click', () => {
      document.body.removeChild(errorBox);
    });
    
    errorBox.appendChild(errorTitle);
    errorBox.appendChild(errorMessage);
    errorBox.appendChild(closeButton);
    
    document.body.appendChild(errorBox);
  }
}
