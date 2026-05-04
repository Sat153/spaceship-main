'use client'

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'

interface SWRProviderProps {
    children: ReactNode
}

export default function SWRProvider({ children }: SWRProviderProps) {
    return (
        <SWRConfig
            value={{
                // Never revalidate just because the window got focus
                revalidateOnFocus: false,

                // Reconnect revalidation is fine (network came back)
                revalidateOnReconnect: true,

                // 30-second global dedup — individual hooks can override higher
                dedupingInterval: 30000,

                // Keep previous data while revalidating
                keepPreviousData: true,

                // Retry failed requests up to 3 times
                errorRetryCount: 3,
                errorRetryInterval: 5000,

                onError: (error, key) => {
                    console.error(`SWR Error [${key}]:`, error)
                },
            }}
        >
            {children}
        </SWRConfig>
    )
}
