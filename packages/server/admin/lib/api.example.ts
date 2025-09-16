import { api, get, post, ApiResponse, ApiClient } from './api'

// 示例用户接口
interface User {
  id: number
  name: string
  email: string
}

// 示例使用方式
export class ApiExample {
  // 获取用户列表
  static async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      // 使用 api 实例
      const response = await api.get<User[]>('/users')
      console.log('用户列表:', response.data)
      return response
    } catch (error) {
      console.error('获取用户列表失败:', error)
      throw error
    }
  }

  // 获取单个用户
  static async getUserById(id: number): Promise<ApiResponse<User>> {
    try {
      // 使用快捷方法
      const response = await get<User>(`/users/${id}`)
      console.log('用户详情:', response.data)
      return response
    } catch (error) {
      console.error('获取用户失败:', error)
      throw error
    }
  }

  // 创建用户
  static async createUser(
    userData: Omit<User, 'id'>,
  ): Promise<ApiResponse<User>> {
    try {
      // 使用快捷方法
      const response = await post<User>('/users', userData)
      console.log('创建用户成功:', response.data)
      return response
    } catch (error) {
      console.error('创建用户失败:', error)
      throw error
    }
  }

  // 更新用户
  static async updateUser(
    id: number,
    userData: Partial<User>,
  ): Promise<ApiResponse<User>> {
    try {
      const response = await api.put<User>(`/users/${id}`, userData)
      console.log('更新用户成功:', response.data)
      return response
    } catch (error) {
      console.error('更新用户失败:', error)
      throw error
    }
  }

  // 删除用户
  static async deleteUser(id: number): Promise<ApiResponse<void>> {
    try {
      const response = await api.delete<void>(`/users/${id}`)
      console.log('删除用户成功')
      return response
    } catch (error) {
      console.error('删除用户失败:', error)
      throw error
    }
  }

  // 使用自定义配置创建实例
  static createCustomApiClient() {
    // 可以创建多个实例，每个实例可以有独立的配置
    const customApi = new ApiClient({
      baseURL: 'https://api.example.com',
      timeout: 15000,
      headers: {
        'X-Custom-Header': 'custom-value',
      },
    })

    return customApi
  }
}

// 在 React 组件中的使用示例
/*
import { useState } from 'react'
import { ApiExample } from './api.example'

function UserComponent() {
  const [users, setUsers] = useState<User[]>([])

  const loadUsers = async () => {
    try {
      const response = await ApiExample.getUsers()
      setUsers(response.data)
    } catch (error) {
      console.error('加载用户失败:', error)
    }
  }

  return (
    <div>
      <button onClick={loadUsers}>加载用户</button>
      {/* 渲染用户列表 * /}
    </div>
  )
}
*/
