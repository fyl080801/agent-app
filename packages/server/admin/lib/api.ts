import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

// API 响应基础接口
export interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
  success: boolean
}

// API 配置接口
export interface ApiConfig {
  baseURL?: string
  timeout?: number
  headers?: Record<string, string>
}

// 创建 axios 实例
class ApiClient {
  private instance: AxiosInstance

  constructor(config: ApiConfig = {}) {
    this.instance = axios.create({
      baseURL: config.baseURL || '/api',
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    })

    this.setupInterceptors()
  }

  // 设置请求拦截器
  private setupInterceptors() {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // 可以在这里添加认证token等
        // const token = localStorage.getItem('token')
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`
        // }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // 统一处理响应数据
        if (response.data && typeof response.data === 'object') {
          return response.data
        }
        return response
      },
      (error) => {
        // 统一错误处理
        if (error.response) {
          // 服务器返回错误状态码
          const { status, data } = error.response
          const errorMessage = data?.message || error.message || '请求失败'
          
          return Promise.reject({
            code: status,
            message: errorMessage,
            data: data,
          })
        } else if (error.request) {
          // 请求已发出但没有收到响应
          return Promise.reject({
            code: -1,
            message: '网络错误，请检查网络连接',
            data: null,
          })
        } else {
          // 其他错误
          return Promise.reject({
            code: -2,
            message: error.message || '未知错误',
            data: null,
          })
        }
      }
    )
  }

  // GET 请求
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.instance.get(url, config)
  }

  // POST 请求
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.instance.post(url, data, config)
  }

  // PUT 请求
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.instance.put(url, data, config)
  }

  // DELETE 请求
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.instance.delete(url, config)
  }

  // PATCH 请求
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.instance.patch(url, data, config)
  }

  // 获取原始 axios 实例（用于特殊需求）
  getInstance(): AxiosInstance {
    return this.instance
  }
}

// 创建默认实例
const defaultApiClient = new ApiClient()

// 导出默认实例和方法
export const api = defaultApiClient

// 导出类以便可以创建多个实例
export { ApiClient }

// 快捷方法
export const get = defaultApiClient.get.bind(defaultApiClient)
export const post = defaultApiClient.post.bind(defaultApiClient)
export const put = defaultApiClient.put.bind(defaultApiClient)
export const del = defaultApiClient.delete.bind(defaultApiClient)
export const patch = defaultApiClient.patch.bind(defaultApiClient)
