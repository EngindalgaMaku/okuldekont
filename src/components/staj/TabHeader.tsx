'use client'

import { memo } from 'react'
import { Users, Building, UserCheck } from 'lucide-react'

interface TabHeaderProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  stajlarCount: number
  bastOgrencilerCount: number
  bostOgrencilerCount: number
}

const TabHeader = memo(function TabHeader({
  activeTab,
  setActiveTab,
  stajlarCount,
  bastOgrencilerCount,
  bostOgrencilerCount
}: TabHeaderProps) {
  const tabs = [
    {
      id: 'stajlar',
      name: 'Stajlar',
      icon: Building,
      count: stajlarCount,
      color: 'indigo'
    },
    {
      id: 'bast',
      name: 'Staja Başlayan Öğrenciler',
      icon: UserCheck,
      count: bastOgrencilerCount,
      color: 'green'
    },
    {
      id: 'bost',
      name: 'Staja Başlamayan Öğrenciler',
      icon: Users,
      count: bostOgrencilerCount,
      color: 'red'
    }
  ]

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex space-x-8 px-6">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${isActive 
                  ? `border-${tab.color}-500 text-${tab.color}-600`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.name}</span>
              <span 
                className={`
                  inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${isActive 
                    ? `bg-${tab.color}-100 text-${tab.color}-800`
                    : 'bg-gray-100 text-gray-600'
                  }
                `}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
})

export default TabHeader