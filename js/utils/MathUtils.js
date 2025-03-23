/**
 * MathUtils.js
 * 数学計算のユーティリティ関数
 */

export const MathUtils = {
  /**
   * 指定範囲内のランダムな数値を生成
   * @param {number} min 最小値
   * @param {number} max 最大値
   * @return {number} ランダムな数値
   */
  random: (min, max) => Math.random() * (max - min) + min,
  
  /**
   * 指定範囲内のランダムな整数を生成
   * @param {number} min 最小値
   * @param {number} max 最大値
   * @return {number} ランダムな整数
   */
  randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  
  /**
   * 2点間の距離を計算
   * @param {number} x1 点1のX座標
   * @param {number} y1 点1のY座標
   * @param {number} x2 点2のX座標
   * @param {number} y2 点2のY座標
   * @return {number} 距離
   */
  distance: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
  
  /**
   * 値を別の範囲にマッピング
   * @param {number} value 元の値
   * @param {number} inMin 入力範囲の最小値
   * @param {number} inMax 入力範囲の最大値
   * @param {number} outMin 出力範囲の最小値
   * @param {number} outMax 出力範囲の最大値
   * @return {number} マッピングされた値
   */
  map: (value, inMin, inMax, outMin, outMax) => 
    ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin,
  
  /**
   * 角度をラジアンに変換
   * @param {number} degrees 角度
   * @return {number} ラジアン
   */
  toRadians: (degrees) => degrees * (Math.PI / 180),
  
  /**
   * ラジアンを角度に変換
   * @param {number} radians ラジアン
   * @return {number} 角度
   */
  toDegrees: (radians) => radians * (180 / Math.PI),
  
  /**
   * 値を指定範囲内に制限
   * @param {number} value 制限する値
   * @param {number} min 最小値
   * @param {number} max 最大値
   * @return {number} 制限された値
   */
  clamp: (value, min, max) => Math.min(Math.max(value, min), max),
  
  /**
   * 線形補間
   * @param {number} start 開始値
   * @param {number} end 終了値
   * @param {number} t 補間係数（0～1）
   * @return {number} 補間値
   */
  lerp: (start, end, t) => start * (1 - t) + end * t,
};
