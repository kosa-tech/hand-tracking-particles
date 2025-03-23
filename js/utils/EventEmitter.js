/**
 * EventEmitter.js
 * モジュール間の疎結合な通信を実現するためのイベントシステム
 */

export class EventEmitter {
  constructor() {
    this.events = {};
  }

  /**
   * イベントリスナーを登録する
   * @param {string} eventName イベント名
   * @param {Function} listener コールバック関数
   */
  on(eventName, listener) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(listener);
    
    // リスナー削除用の関数を返す
    return () => {
      this.off(eventName, listener);
    };
  }

  /**
   * イベントリスナーを一度だけ実行して削除する
   * @param {string} eventName イベント名
   * @param {Function} listener コールバック関数
   */
  once(eventName, listener) {
    const onceWrapper = (...args) => {
      listener(...args);
      this.off(eventName, onceWrapper);
    };
    return this.on(eventName, onceWrapper);
  }

  /**
   * イベントリスナーを削除する
   * @param {string} eventName イベント名
   * @param {Function} listenerToRemove 削除するリスナー
   */
  off(eventName, listenerToRemove) {
    if (!this.events[eventName]) {
      return;
    }

    const filteredListeners = this.events[eventName].filter(
      listener => listener !== listenerToRemove
    );

    if (filteredListeners.length) {
      this.events[eventName] = filteredListeners;
    } else {
      delete this.events[eventName];
    }
  }

  /**
   * イベントを発火する
   * @param {string} eventName イベント名
   * @param {...any} args リスナーに渡す引数
   */
  emit(eventName, ...args) {
    if (!this.events[eventName]) {
      return;
    }

    this.events[eventName].forEach(listener => {
      listener(...args);
    });
  }
}
