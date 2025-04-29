// src/api/api.ts

import axios from 'axios'
import type { AxiosResponse } from 'axios'

// 定义请求参数的类型
interface Params {
  [key: string]: any
}

// 定义请求数据的类型
interface Data {
  [key: string]: any
}

// 定义 Axios 配置类型
interface AxiosConfig {
  headers?: { [key: string]: string }
  params?: Params
}

// 创建 Axios 实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BASE_API,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 定义泛型类型的 API 响应
type ApiResponse<T> = Promise<AxiosResponse<T>>

/**
 * 发送 GET 请求
 * @param url - 请求的 URL
 * @param params - 查询参数
 * @param config - 可选的自定义配置
 * @returns 服务器响应的 Promise 对象
 */
export const get = <T>(
  url: string,
  params?: Params,
  config?: AxiosConfig,
): ApiResponse<T> => {
  return apiClient.get<T>(url, { params, ...config })
}

/**
 * 发送 POST 请求
 * @param url - 请求的 URL
 * @param data - 请求体数据
 * @param config - 可选的自定义配置
 * @returns 服务器响应的 Promise 对象
 */
export const post = <T>(
  url: string,
  data: Data,
  config?: AxiosConfig,
): ApiResponse<T> => {
  return apiClient.post<T>(url, data, config)
}

/**
 * 发送 PUT 请求
 * @param url - 请求的 URL
 * @param data - 请求体数据
 * @param config - 可选的自定义配置
 * @returns 服务器响应的 Promise 对象
 */
export const put = <T>(
  url: string,
  data: Data,
  config?: AxiosConfig,
): ApiResponse<T> => {
  return apiClient.put<T>(url, data, config)
}

/**
 * 发送 DELETE 请求
 * @param url - 请求的 URL
 * @param params - 查询参数
 * @param config - 可选的自定义配置
 * @returns 服务器响应的 Promise 对象
 */
export const del = <T>(
  url: string,
  params?: Params,
  config?: AxiosConfig,
): ApiResponse<T> => {
  return apiClient.delete<T>(url, { params, ...config })
}

/**
 * 异步获取公钥。如果获取失败，将返回 null。
 *
 * @returns {Promise<string | null>} 返回公钥的 Promise。如果请求成功，返回公钥字符串；如果失败，返回 null。
 *
 * @example
 * const publicKey = await getPublicKey();
 * if (publicKey !== null) {
 *     console.log('Received public key:', publicKey);
 *     // 后续操作
 * } else {
 *     console.error('Failed to fetch public key');
 * }
 */
export const getPublicKey = async (): Promise<string | null> => {
  try {
    const keyResponse: any = await get('/auth/login')
    const publicKey = keyResponse.data.data.public_key
    return publicKey
  } catch (err) {
    return null
  }
}
