/**
 * SettingsPanel.js
 * 設定パネルの管理と設定値の変更を処理する
 */

import { Config } from '../../config.js';
import { DOMUtils } from '../../utils/DOMUtils.js';

export class SettingsPanel {
  /**
   * コンストラクタ
   * @param {EventEmitter} eventEmitter イベントエミッタ
   */
  constructor(eventEmitter) {
    this.eventEmitter = eventEmitter;
    this.settingsPanel = null;
    this.settingsForm = null;
    this.isVisible = false;
    this.currentSettings = { ...Config.particles };
  }

  /**
   * 設定パネルを初期化
   * @param {HTMLElement} container 親コンテナ
   */
  init(container) {
    // 設定パネルの作成
    this.settingsPanel = this.createSettingsPanel();
    container.appendChild(this.settingsPanel);
    
    // イベントリスナーを設定
    this.setupEventListeners();
    
    // イベントエミッタのイベントを購読
    this.subscribeToEvents();
    
    console.log('Settings panel initialized');
    return this;
  }

  /**
   * 設定パネルのHTML要素を作成
   * @returns {HTMLElement} 設定パネル要素
   */
  createSettingsPanel() {
    const panel = DOMUtils.createElement('div', {
      id: 'settings-panel',
      className: 'settings-panel'
    });
    
    // タイトル
    const title = DOMUtils.createElement('div', {
      className: 'settings-title'
    }, '設定');
    
    // 閉じるボタン
    const closeButton = DOMUtils.createElement('button', {
      className: 'settings-close',
      type: 'button'
    }, '×');
    
    // ヘッダー部分
    const header = DOMUtils.createElement('div', {
      className: 'settings-header'
    });
    header.appendChild(title);
    header.appendChild(closeButton);
    
    // 設定フォーム
    this.settingsForm = DOMUtils.createElement('form', {
      className: 'settings-form'
    });
    
    // 粒子数の設定
    const countGroup = this.createSliderGroup(
      'particle-count',
      '粒子数',
      Config.particles.count,
      100,
      5000,
      100,
      'particles'
    );
    
    // 粒子サイズの設定
    const sizeGroup = this.createSliderGroup(
      'particle-size',
      '粒子サイズ',
      Config.particles.size,
      0.1,
      3.0,
      0.1,
      ''
    );
    
    // 重力の設定
    const gravityGroup = this.createSliderGroup(
      'gravity',
      '重力',
      Config.particles.gravity,
      -0.1,
      0.1,
      0.01,
      ''
    );
    
    // 摩擦の設定
    const frictionGroup = this.createSliderGroup(
      'friction',
      '摩擦',
      Config.particles.friction,
      0.9,
      1.0,
      0.01,
      ''
    );
    
    // 寿命の設定
    const lifetimeGroup = this.createSliderGroup(
      'lifetime',
      '寿命',
      Config.particles.lifetime,
      100,
      3000,
      100,
      'frames'
    );
    
    // 放出レートの設定
    const emissionGroup = this.createSliderGroup(
      'emission-rate',
      '放出レート',
      Config.particles.emissionRate,
      1,
      20,
      1,
      '/frame'
    );
    
    // チェックボックス：手のスケルトン表示
    const skeletonGroup = this.createCheckboxGroup(
      'show-skeleton',
      '手のスケルトンを表示',
      Config.ui.showHandSkeleton
    );
    
    // カラーパレット
    const colorGroup = this.createColorGroup(
      'particle-colors',
      '粒子の色',
      Config.particles.colors
    );
    
    // ボタングループ
    const buttonGroup = DOMUtils.createElement('div', {
      className: 'settings-group settings-buttons'
    });
    
    // 設定リセットボタン
    const resetButton = DOMUtils.createElement('button', {
      className: 'settings-reset',
      type: 'button'
    }, '設定をリセット');
    
    // 設定保存ボタン
    const saveButton = DOMUtils.createElement('button', {
      className: 'settings-save',
      type: 'button'
    }, '設定を保存');
    
    buttonGroup.appendChild(resetButton);
    buttonGroup.appendChild(saveButton);
    
    // フォームに要素を追加
    this.settingsForm.appendChild(countGroup);
    this.settingsForm.appendChild(sizeGroup);
    this.settingsForm.appendChild(gravityGroup);
    this.settingsForm.appendChild(frictionGroup);
    this.settingsForm.appendChild(lifetimeGroup);
    this.settingsForm.appendChild(emissionGroup);
    this.settingsForm.appendChild(skeletonGroup);
    this.settingsForm.appendChild(colorGroup);
    this.settingsForm.appendChild(buttonGroup);
    
    // パネルに要素を追加
    panel.appendChild(header);
    panel.appendChild(this.settingsForm);
    
    // 初期状態は非表示
    panel.style.display = 'none';
    
    return panel;
  }

  /**
   * スライダーグループを作成
   * @param {string} id 要素ID
   * @param {string} label ラベル
   * @param {number} value 初期値
   * @param {number} min 最小値
   * @param {number} max 最大値
   * @param {number} step ステップ値
   * @param {string} unit 単位
   * @returns {HTMLElement} スライダーグループ要素
   */
  createSliderGroup(id, label, value, min, max, step, unit) {
    const group = DOMUtils.createElement('div', {
      className: 'settings-group'
    });
    
    // ラベルとバリュー表示
    const labelContainer = DOMUtils.createElement('div', {
      className: 'settings-label-container'
    });
    
    const labelElement = DOMUtils.createElement('label', {
      for: id,
      className: 'settings-label'
    }, label);
    
    const valueElement = DOMUtils.createElement('span', {
      id: `${id}-value`,
      className: 'settings-value'
    }, `${value}${unit ? ' ' + unit : ''}`);
    
    labelContainer.appendChild(labelElement);
    labelContainer.appendChild(valueElement);
    
    // スライダー
    const slider = DOMUtils.createElement('input', {
      id,
      type: 'range',
      className: 'settings-slider',
      min,
      max,
      step,
      value
    });
    
    group.appendChild(labelContainer);
    group.appendChild(slider);
    
    return group;
  }

  /**
   * チェックボックスグループを作成
   * @param {string} id 要素ID
   * @param {string} label ラベル
   * @param {boolean} checked チェック状態
   * @returns {HTMLElement} チェックボックスグループ要素
   */
  createCheckboxGroup(id, label, checked) {
    const group = DOMUtils.createElement('div', {
      className: 'settings-group checkbox-group'
    });
    
    const checkboxContainer = DOMUtils.createElement('div', {
      className: 'checkbox-container'
    });
    
    const checkbox = DOMUtils.createElement('input', {
      id,
      type: 'checkbox',
      className: 'settings-checkbox',
      checked
    });
    
    const labelElement = DOMUtils.createElement('label', {
      for: id,
      className: 'checkbox-label'
    }, label);
    
    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(labelElement);
    group.appendChild(checkboxContainer);
    
    return group;
  }

  /**
   * カラーグループを作成
   * @param {string} id 要素ID
   * @param {string} label ラベル
   * @param {string[]} colors 色の配列
   * @returns {HTMLElement} カラーグループ要素
   */
  createColorGroup(id, label, colors) {
    const group = DOMUtils.createElement('div', {
      className: 'settings-group'
    });
    
    const labelElement = DOMUtils.createElement('label', {
      className: 'settings-label'
    }, label);
    
    const colorContainer = DOMUtils.createElement('div', {
      className: 'color-container',
      id: `${id}-container`
    });
    
    // 各色のカラーピッカー
    colors.forEach((color, index) => {
      const colorPicker = DOMUtils.createElement('input', {
        type: 'color',
        className: 'color-picker',
        id: `${id}-${index}`,
        value: color
      });
      
      colorContainer.appendChild(colorPicker);
    });
    
    // 色追加ボタン
    const addColorButton = DOMUtils.createElement('button', {
      type: 'button',
      className: 'add-color-button'
    }, '+');
    
    colorContainer.appendChild(addColorButton);
    
    group.appendChild(labelElement);
    group.appendChild(colorContainer);
    
    return group;
  }

  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    // 閉じるボタン
    const closeButton = this.settingsPanel.querySelector('.settings-close');
    if (closeButton) {
      DOMUtils.addEvent(closeButton, 'click', () => {
        this.hide();
      });
    }
    
    // スライダーの変更イベント
    const sliders = this.settingsPanel.querySelectorAll('.settings-slider');
    sliders.forEach(slider => {
      // 入力中の表示更新
      DOMUtils.addEvent(slider, 'input', (e) => {
        const value = e.target.value;
        const valueElement = document.getElementById(`${e.target.id}-value`);
        
        if (valueElement) {
          let displayValue = value;
          
          // 単位を追加
          switch (e.target.id) {
            case 'particle-count':
              displayValue += ' particles';
              break;
            case 'lifetime':
              displayValue += ' frames';
              break;
            case 'emission-rate':
              displayValue += '/frame';
              break;
          }
          
          valueElement.textContent = displayValue;
        }
      });
      
      // 変更確定時にイベント発行
      DOMUtils.addEvent(slider, 'change', (e) => {
        const setting = e.target.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        const value = parseFloat(e.target.value);
        
        this.eventEmitter.emit('ui:settingChanged', {
          setting,
          value
        });
      });
    });
    
    // チェックボックスの変更イベント
    const checkboxes = this.settingsPanel.querySelectorAll('.settings-checkbox');
    checkboxes.forEach(checkbox => {
      DOMUtils.addEvent(checkbox, 'change', (e) => {
        const setting = e.target.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        const value = e.target.checked;
        
        this.eventEmitter.emit('ui:settingChanged', {
          setting,
          value
        });
      });
    });
    
    // 色の変更イベント
    const colorPickers = this.settingsPanel.querySelectorAll('.color-picker');
    colorPickers.forEach(colorPicker => {
      DOMUtils.addEvent(colorPicker, 'change', (e) => {
        const colorIndex = parseInt(e.target.id.split('-').pop(), 10);
        const newColors = [...this.currentSettings.colors];
        newColors[colorIndex] = e.target.value;
        
        this.eventEmitter.emit('ui:settingChanged', {
          setting: 'colors',
          value: newColors
        });
      });
    });
    
    // 色追加ボタン
    const addColorButton = this.settingsPanel.querySelector('.add-color-button');
    if (addColorButton) {
      DOMUtils.addEvent(addColorButton, 'click', () => {
        const newColors = [...this.currentSettings.colors];
        const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
        newColors.push(randomColor);
        
        // 新しい色を追加するUIを更新
        this.updateColorPickers(newColors);
        
        this.eventEmitter.emit('ui:settingChanged', {
          setting: 'colors',
          value: newColors
        });
      });
    }
    
    // 設定リセットボタン
    const resetButton = this.settingsPanel.querySelector('.settings-reset');
    if (resetButton) {
      DOMUtils.addEvent(resetButton, 'click', () => {
        if (confirm('設定をデフォルトに戻しますか？')) {
          this.eventEmitter.emit('ui:resetSettings');
        }
      });
    }
    
    // 設定保存ボタン
    const saveButton = this.settingsPanel.querySelector('.settings-save');
    if (saveButton) {
      DOMUtils.addEvent(saveButton, 'click', () => {
        this.eventEmitter.emit('ui:saveSettings', this.currentSettings);
      });
    }
  }

  /**
   * カラーピッカーのUI更新
   * @param {string[]} colors 色の配列
   */
  updateColorPickers(colors) {
    const container = this.settingsPanel.querySelector('#particle-colors-container');
    if (!container) return;
    
    // 既存のカラーピッカーを削除（追加ボタンを除く）
    const existingPickers = container.querySelectorAll('.color-picker');
    existingPickers.forEach(picker => {
      container.removeChild(picker);
    });
    
    // 追加ボタンを取得
    const addButton = container.querySelector('.add-color-button');
    
    // 新しいカラーピッカーを追加
    colors.forEach((color, index) => {
      const colorPicker = DOMUtils.createElement('input', {
        type: 'color',
        className: 'color-picker',
        id: `particle-colors-${index}`,
        value: color
      });
      
      // 色の変更イベント
      DOMUtils.addEvent(colorPicker, 'change', (e) => {
        const colorIndex = parseInt(e.target.id.split('-').pop(), 10);
        const newColors = [...this.currentSettings.colors];
        newColors[colorIndex] = e.target.value;
        
        this.eventEmitter.emit('ui:settingChanged', {
          setting: 'colors',
          value: newColors
        });
      });
      
      // 追加ボタンの前に挿入
      container.insertBefore(colorPicker, addButton);
    });
  }

  /**
   * イベントエミッタのイベントを購読
   */
  subscribeToEvents() {
    // 設定変更イベント
    this.eventEmitter.on('ui:settingChanged', (data) => {
      this.updateCurrentSettings(data.setting, data.value);
    });
    
    // 設定リセットイベント
    this.eventEmitter.on('ui:resetSettings', () => {
      this.resetSettings();
    });
    
    // 設定読み込みイベント
    this.eventEmitter.on('settings:loaded', (settings) => {
      this.updateAllSettings(settings);
    });
  }

  /**
   * 現在の設定を更新
   * @param {string} setting 設定キー
   * @param {any} value 設定値
   */
  updateCurrentSettings(setting, value) {
    this.currentSettings[setting] = value;
  }

  /**
   * すべての設定を更新
   * @param {Object} settings 設定オブジェクト
   */
  updateAllSettings(settings) {
    this.currentSettings = { ...this.currentSettings, ...settings };
    
    // UIの更新
    Object.entries(settings).forEach(([key, value]) => {
      this.updateSettingUI(key, value);
    });
  }

  /**
   * 設定UIを更新
   * @param {string} setting 設定キー
   * @param {any} value 設定値
   */
  updateSettingUI(setting, value) {
    // キャメルケースをハイフン区切りに変換
    const kebabSetting = setting.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    
    // スライダーの更新
    const slider = document.getElementById(kebabSetting);
    if (slider && slider.type === 'range') {
      slider.value = value;
      
      // 値表示の更新
      const valueElement = document.getElementById(`${kebabSetting}-value`);
      if (valueElement) {
        let displayValue = value;
        
        // 単位を追加
        switch (kebabSetting) {
          case 'particle-count':
            displayValue += ' particles';
            break;
          case 'lifetime':
            displayValue += ' frames';
            break;
          case 'emission-rate':
            displayValue += '/frame';
            break;
        }
        
        valueElement.textContent = displayValue;
      }
    }
    
    // チェックボックスの更新
    const checkbox = document.getElementById(kebabSetting);
    if (checkbox && checkbox.type === 'checkbox') {
      checkbox.checked = value;
    }
    
    // 色の更新
    if (setting === 'colors' && Array.isArray(value)) {
      this.updateColorPickers(value);
    }
  }

  /**
   * 設定をリセット
   */
  resetSettings() {
    // デフォルト設定に戻す
    this.updateAllSettings(Config.particles);
    
    // 変更を通知
    this.eventEmitter.emit('ui:settingsReset', Config.particles);
  }

  /**
   * 設定パネルを表示
   */
  show() {
    if (this.settingsPanel) {
      this.settingsPanel.style.display = 'block';
      this.isVisible = true;
    }
  }

  /**
   * 設定パネルを非表示
   */
  hide() {
    if (this.settingsPanel) {
      this.settingsPanel.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * 設定パネルの表示状態を切り替え
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}
