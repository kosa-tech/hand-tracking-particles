/**
 * StorageManager.js
 * ローカルストレージとMCPファイルシステムを併用した保存機能
 */

import { Config } from '../../config.js';

export class StorageManager {
  /**
   * コンストラクタ
   * @param {EventEmitter} eventEmitter イベントエミッタ
   */
  constructor(eventEmitter) {
    this.eventEmitter = eventEmitter;
    this.mcpAvailable = false;
    this.localStorageAvailable = this.checkLocalStorage();
    
    // MCP機能の利用可否を確認
    this.checkMCPAvailability();
  }

  /**
   * ローカルストレージの利用可否チェック
   * @returns {boolean} 利用可能な場合はtrue
   */
  checkLocalStorage() {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      console.log('Local storage is available');
      return true;
    } catch (e) {
      console.warn('Local storage is not available:', e);
      return false;
    }
  }

  /**
   * MCP File Systemの利用可否チェック
   */
  async checkMCPAvailability() {
    try {
      if (window.fs && typeof window.fs.writeFile === 'function') {
        // ディレクトリ作成を試みる（存在確認）
        await this.createDirectory(Config.storage.captureFolder);
        this.mcpAvailable = true;
        console.log('MCP File System is available');
        this.eventEmitter.emit('storage:mcpAvailable', true);
      } else {
        this.mcpAvailable = false;
        console.warn('MCP File System is not available');
        this.eventEmitter.emit('storage:mcpAvailable', false);
      }
    } catch (error) {
      this.mcpAvailable = false;
      console.error('Error checking MCP availability:', error);
      this.eventEmitter.emit('storage:mcpAvailable', false);
    }
  }

  /**
   * ディレクトリの作成（存在しない場合）
   * @param {string} directoryPath ディレクトリパス
   */
  async createDirectory(directoryPath) {
    if (!this.mcpAvailable) return false;

    try {
      // ディレクトリの存在確認
      try {
        await window.fs.readdir(directoryPath);
        return true; // すでに存在する
      } catch (e) {
        // 存在しない場合は作成
        await window.fs.mkdir(directoryPath, { recursive: true });
        console.log(`Directory created: ${directoryPath}`);
        return true;
      }
    } catch (error) {
      console.error(`Error creating directory ${directoryPath}:`, error);
      return false;
    }
  }

  /**
   * キャプチャを保存する
   * @param {string} dataUrl キャプチャ画像のデータURL
   * @param {Object} metadata メタデータ
   * @returns {Promise<string>} 保存されたファイルのパスまたはID
   */
  async saveCapture(dataUrl, metadata = {}) {
    // タイムスタンプを含むファイル名を生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `capture-${timestamp}`;
    
    // メタデータを保存（設定、粒子数など）
    const captureData = {
      timestamp,
      image: dataUrl,
      metadata: {
        ...metadata,
        captureDate: new Date().toISOString()
      }
    };
    
    // MCP File Systemが利用可能な場合
    if (this.mcpAvailable && Config.storage.useMCP) {
      try {
        // ディレクトリの存在確認/作成
        await this.createDirectory(Config.storage.captureFolder);
        
        // 画像ファイルの保存（Base64部分のみを抽出）
        const imageData = dataUrl.split(',')[1];
        const imageBuffer = this.base64ToArrayBuffer(imageData);
        const imagePath = `${Config.storage.captureFolder}/${filename}.png`;
        await window.fs.writeFile(imagePath, imageBuffer);
        
        // JSONメタデータの保存
        const metadataPath = `${Config.storage.captureFolder}/${filename}.json`;
        await window.fs.writeFile(metadataPath, JSON.stringify(captureData.metadata, null, 2));
        
        console.log(`Capture saved to MCP filesystem: ${imagePath}`);
        this.eventEmitter.emit('storage:captureSaved', { path: imagePath, metadata: captureData.metadata });
        return imagePath;
      } catch (error) {
        console.error('Error saving capture to MCP filesystem:', error);
        
        // MCP保存に失敗した場合はローカルストレージにフォールバック
        if (this.localStorageAvailable && Config.storage.useLocalStorage) {
          return this.saveToLocalStorage(filename, captureData);
        }
      }
    } 
    // ローカルストレージのみ利用する場合
    else if (this.localStorageAvailable && Config.storage.useLocalStorage) {
      return this.saveToLocalStorage(filename, captureData);
    }
    
    // どちらも利用できない場合
    console.error('No storage method available');
    this.eventEmitter.emit('storage:error', { message: 'No storage method available' });
    return null;
  }

  /**
   * ローカルストレージにキャプチャを保存
   * @param {string} key 保存キー
   * @param {Object} data 保存データ
   * @returns {string} 保存キー
   */
  saveToLocalStorage(key, data) {
    try {
      // キャプチャ一覧を取得/更新
      const captureList = JSON.parse(localStorage.getItem('captureList') || '[]');
      captureList.push(key);
      localStorage.setItem('captureList', JSON.stringify(captureList));
      
      // データを保存
      localStorage.setItem(`capture:${key}`, JSON.stringify(data));
      
      console.log(`Capture saved to localStorage: ${key}`);
      this.eventEmitter.emit('storage:captureSaved', { key, metadata: data.metadata });
      return key;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      this.eventEmitter.emit('storage:error', { message: 'Error saving to localStorage', error });
      return null;
    }
  }

  /**
   * 保存されたキャプチャの一覧を取得
   * @returns {Promise<Array>} キャプチャ一覧
   */
  async getCaptures() {
    const captures = [];
    
    // MCP File Systemからキャプチャを取得
    if (this.mcpAvailable && Config.storage.useMCP) {
      try {
        const files = await window.fs.readdir(Config.storage.captureFolder);
        
        // JSON設定ファイルのみを対象
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        // 各JSONファイルからメタデータを読み込む
        for (const jsonFile of jsonFiles) {
          try {
            const metadataPath = `${Config.storage.captureFolder}/${jsonFile}`;
            const metadataContent = await window.fs.readFile(metadataPath, { encoding: 'utf8' });
            const metadata = JSON.parse(metadataContent);
            
            // 画像ファイルのパスを生成
            const imagePath = metadataPath.replace('.json', '.png');
            
            captures.push({
              id: jsonFile.replace('.json', ''),
              path: imagePath,
              metadata,
              storage: 'mcp'
            });
          } catch (error) {
            console.error(`Error loading metadata from ${jsonFile}:`, error);
          }
        }
      } catch (error) {
        console.error('Error listing captures from MCP filesystem:', error);
      }
    }
    
    // ローカルストレージからキャプチャを取得
    if (this.localStorageAvailable && Config.storage.useLocalStorage) {
      try {
        const captureList = JSON.parse(localStorage.getItem('captureList') || '[]');
        
        for (const key of captureList) {
          try {
            const captureData = JSON.parse(localStorage.getItem(`capture:${key}`));
            if (captureData) {
              captures.push({
                id: key,
                image: captureData.image,
                metadata: captureData.metadata,
                storage: 'localStorage'
              });
            }
          } catch (error) {
            console.error(`Error loading capture from localStorage: ${key}`, error);
          }
        }
      } catch (error) {
        console.error('Error listing captures from localStorage:', error);
      }
    }
    
    // 日付の新しい順にソート
    captures.sort((a, b) => {
      const dateA = new Date(a.metadata.captureDate);
      const dateB = new Date(b.metadata.captureDate);
      return dateB - dateA;
    });
    
    return captures;
  }

  /**
   * キャプチャを読み込む
   * @param {string} id キャプチャID
   * @param {string} [storage='mcp'] ストレージタイプ ('mcp'または'localStorage')
   * @returns {Promise<Object>} キャプチャデータ
   */
  async loadCapture(id, storage = 'mcp') {
    if (storage === 'mcp' && this.mcpAvailable) {
      try {
        // メタデータの読み込み
        const metadataPath = `${Config.storage.captureFolder}/${id}.json`;
        const metadataContent = await window.fs.readFile(metadataPath, { encoding: 'utf8' });
        const metadata = JSON.parse(metadataContent);
        
        // 画像の読み込み
        const imagePath = `${Config.storage.captureFolder}/${id}.png`;
        const imageBuffer = await window.fs.readFile(imagePath);
        
        // ArrayBufferをBase64に変換
        const base64Image = this.arrayBufferToBase64(imageBuffer);
        const dataUrl = `data:image/png;base64,${base64Image}`;
        
        return {
          id,
          image: dataUrl,
          metadata,
          storage: 'mcp'
        };
      } catch (error) {
        console.error(`Error loading capture from MCP filesystem: ${id}`, error);
        return null;
      }
    } else if (storage === 'localStorage' && this.localStorageAvailable) {
      try {
        const captureData = JSON.parse(localStorage.getItem(`capture:${id}`));
        if (captureData) {
          return {
            id,
            image: captureData.image,
            metadata: captureData.metadata,
            storage: 'localStorage'
          };
        }
      } catch (error) {
        console.error(`Error loading capture from localStorage: ${id}`, error);
      }
    }
    
    return null;
  }

  /**
   * キャプチャを削除
   * @param {string} id キャプチャID
   * @param {string} [storage='mcp'] ストレージタイプ
   * @returns {Promise<boolean>} 成功した場合はtrue
   */
  async deleteCapture(id, storage = 'mcp') {
    if (storage === 'mcp' && this.mcpAvailable) {
      try {
        // メタデータと画像の両方を削除
        const metadataPath = `${Config.storage.captureFolder}/${id}.json`;
        const imagePath = `${Config.storage.captureFolder}/${id}.png`;
        
        await window.fs.unlink(metadataPath);
        await window.fs.unlink(imagePath);
        
        console.log(`Capture deleted from MCP filesystem: ${id}`);
        this.eventEmitter.emit('storage:captureDeleted', { id, storage });
        return true;
      } catch (error) {
        console.error(`Error deleting capture from MCP filesystem: ${id}`, error);
        return false;
      }
    } else if (storage === 'localStorage' && this.localStorageAvailable) {
      try {
        // キャプチャデータを削除
        localStorage.removeItem(`capture:${id}`);
        
        // キャプチャリストから削除
        const captureList = JSON.parse(localStorage.getItem('captureList') || '[]');
        const newList = captureList.filter(key => key !== id);
        localStorage.setItem('captureList', JSON.stringify(newList));
        
        console.log(`Capture deleted from localStorage: ${id}`);
        this.eventEmitter.emit('storage:captureDeleted', { id, storage });
        return true;
      } catch (error) {
        console.error(`Error deleting capture from localStorage: ${id}`, error);
        return false;
      }
    }
    
    return false;
  }

  /**
   * 設定を保存
   * @param {Object} settings 保存する設定
   */
  saveSettings(settings) {
    if (this.localStorageAvailable) {
      try {
        localStorage.setItem('particleSettings', JSON.stringify(settings));
        console.log('Settings saved to localStorage');
        return true;
      } catch (error) {
        console.error('Error saving settings to localStorage:', error);
      }
    }
    return false;
  }

  /**
   * 設定を読み込み
   * @returns {Object|null} 保存された設定または初期値
   */
  loadSettings() {
    if (this.localStorageAvailable) {
      try {
        const settings = localStorage.getItem('particleSettings');
        if (settings) {
          return JSON.parse(settings);
        }
      } catch (error) {
        console.error('Error loading settings from localStorage:', error);
      }
    }
    return null;
  }

  /**
   * Base64文字列をArrayBufferに変換
   * @param {string} base64 Base64文字列
   * @returns {ArrayBuffer} 変換されたArrayBuffer
   */
  base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const length = binaryString.length;
    const bytes = new Uint8Array(length);
    
    for (let i = 0; i < length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
  }

  /**
   * ArrayBufferをBase64文字列に変換
   * @param {ArrayBuffer} buffer ArrayBuffer
   * @returns {string} Base64文字列
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return window.btoa(binary);
  }
}
