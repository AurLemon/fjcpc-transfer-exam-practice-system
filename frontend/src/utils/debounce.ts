// src/utils/debounce

/**
 * 创建一个防抖函数，当调用该函数时，它会在指定的时间间隔内等待，
 * 如果在此期间再次调用，它将重新计时，只有在不调用超过指定时间后，回调函数才会执行。
 *
 * @param {Function} callback - 要在防抖结束后执行的回调函数。
 * @param {number} delay - 等待的时间（以毫秒为单位），在此时间内不再调用时触发回调函数。
 * @returns {Function} 返回一个包裹了防抖逻辑的函数。
 *
 * @example
 * const debouncedFunc = debounce(() => {
 *     console.log('Executed after 500ms of no calls');
 * }, 500);
 *
 * window.addEventListener('resize', debouncedFunc);
 */
export function debounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      callback.apply(this, args)
    }, delay)
  }
}
