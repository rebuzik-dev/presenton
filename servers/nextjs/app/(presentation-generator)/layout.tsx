import React from 'react'
import { ConfigurationInitializer } from '../ConfigurationInitializer'
import AuthGuard from './components/AuthGuard'
import { LayoutProvider } from './context/LayoutContext'
const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <AuthGuard>
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
