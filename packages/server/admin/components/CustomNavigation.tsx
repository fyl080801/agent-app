import '../global.css'
import {
  NavItem,
  ListNavItems,
  NavigationContainer,
} from '@keystone-6/core/admin-ui/components'
import type { NavigationProps } from '@keystone-6/core/admin-ui/components'

export const CustomNavigation = ({
  lists,
  authenticatedItem,
}: NavigationProps) => {
  return (
    <NavigationContainer authenticatedItem={authenticatedItem}>
      <NavItem href="/">首页</NavItem>
      <NavItem href="/mcp-manage">ComfyMCP管理</NavItem>
      <NavItem href="/profile">系统配置</NavItem>
      <NavItem href="/about">关于</NavItem>
      {/* <ListNavItems lists={lists}></ListNavItems> */}
    </NavigationContainer>
  )
}
