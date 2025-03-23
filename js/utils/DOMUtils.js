/**
 * DOMUtils.js
 * DOM操作に関するユーティリティ関数
 */

export const DOMUtils = {
  /**
   * 要素を作成
   * @param {string} tag タグ名
   * @param {Object} attributes 属性
   * @param {string|Node} content 内容
   * @return {HTMLElement} 作成された要素
   */
  createElement: (tag, attributes = {}, content = '') => {
    const element = document.createElement(tag);
    
    // 属性を設定
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else {
        element.setAttribute(key, value);
      }
    });
    
    // コンテンツを設定
    if (content) {
      if (typeof content === 'string') {
        element.innerHTML = content;
      } else {
        element.appendChild(content);
      }
    }
    
    return element;
  },
  
  /**
   * 要素に複数の子要素を追加
   * @param {HTMLElement} parent 親要素
   * @param {HTMLElement[]} children 子要素の配列
   * @return {HTMLElement} 親要素
   */
  appendChildren: (parent, children) => {
    children.forEach(child => parent.appendChild(child));
    return parent;
  },
  
  /**
   * クエリセレクタで要素を取得
   * @param {string} selector セレクタ
   * @param {HTMLElement} [parent=document] 親要素
   * @return {HTMLElement} 見つかった要素またはnull
   */
  qs: (selector, parent = document) => parent.querySelector(selector),
  
  /**
   * クエリセレクタオールで複数の要素を取得
   * @param {string} selector セレクタ
   * @param {HTMLElement} [parent=document] 親要素
   * @return {NodeList} 見つかった要素のリスト
   */
  qsa: (selector, parent = document) => parent.querySelectorAll(selector),
  
  /**
   * イベントリスナーを追加
   * @param {HTMLElement} element 要素
   * @param {string} eventType イベントタイプ
   * @param {Function} callback コールバック関数
   * @param {Object} options オプション
   */
  addEvent: (element, eventType, callback, options) => {
    element.addEventListener(eventType, callback, options);
  },
  
  /**
   * イベントリスナーを削除
   * @param {HTMLElement} element 要素
   * @param {string} eventType イベントタイプ
   * @param {Function} callback コールバック関数
   */
  removeEvent: (element, eventType, callback) => {
    element.removeEventListener(eventType, callback);
  },
  
  /**
   * スタイルを設定
   * @param {HTMLElement} element 要素
   * @param {Object} styles スタイルのオブジェクト
   */
  setStyles: (element, styles) => {
    Object.entries(styles).forEach(([property, value]) => {
      element.style[property] = value;
    });
  }
};
