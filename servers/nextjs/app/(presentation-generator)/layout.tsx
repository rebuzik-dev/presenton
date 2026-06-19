import React from 'react'
import { ConfigurationInitializer } from '../ConfigurationInitializer'
import AuthGuard from './components/AuthGuard'
import { LayoutProvider } from './context/LayoutContext'
import { isAuthDisabled } from '@/utils/auth'
const layout = ({ children }: { children: React.ReactNode }) => {
  const authDisabled = isAuthDisabled()

  return (
    <div>
      <AuthGuard authDisabled={authDisabled}>
        <LayoutProvider>
          <ConfigurationInitializer>
            {children}
          </ConfigurationInitializer>
        </LayoutProvider>
      </AuthGuard>
    </div>
  )
}

export default layout
