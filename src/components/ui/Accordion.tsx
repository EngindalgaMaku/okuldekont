'use client'

import { ReactNode, useState } from 'react'
import { ChevronRight } from 'lucide-react'

interface AccordionProps {
  title: string
  children: ReactNode
  icon?: ReactNode
  defaultOpen?: boolean
  className?: string
  headerClassName?: string
  contentClassName?: string
  count?: number
}

interface AccordionItemProps extends AccordionProps {
  isOpen: boolean
  onToggle: () => void
}

// Tek bir accordion item
export function AccordionItem({ 
  title, 
  children, 
  icon, 
  isOpen, 
  onToggle, 
  className = '',
  headerClassName = '',
  contentClassName = '',
  count
}: AccordionItemProps) {
  return (
    <div className={`border border-gray-200 rounded-lg ${className}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg ${headerClassName}`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-lg font-semibold text-gray-900">
            {title} {count !== undefined && `(${count})`}
          </h4>
        </div>
        <ChevronRight className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${
          isOpen ? 'rotate-90' : ''
        }`} />
      </button>
      
      <div className={`border-t border-gray-200 transition-all duration-300 ease-in-out overflow-hidden ${
        isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
      } ${contentClassName}`}>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

// Standalone accordion (tek başına kullanılabilir)
export function Accordion(props: AccordionProps) {
  const [isOpen, setIsOpen] = useState(props.defaultOpen || false)
  
  return (
    <AccordionItem
      {...props}
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
    />
  )
}

// Accordion grubu (birden fazla accordion, birini açınca diğerleri kapanır)
interface AccordionGroupProps {
  children: ReactNode
  allowMultiple?: boolean
  className?: string
}

interface AccordionGroupItemProps extends AccordionProps {
  id: string
}

export function AccordionGroup({ children, allowMultiple = false, className = '' }: AccordionGroupProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())
  
  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setOpenItems(prev => {
        const newSet = new Set(prev)
        if (newSet.has(id)) {
          newSet.delete(id)
        } else {
          newSet.add(id)
        }
        return newSet
      })
    } else {
      setOpenItems(prev => {
        const newSet = new Set<string>()
        if (!prev.has(id)) {
          newSet.add(id)
        }
        return newSet
      })
    }
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  )
}

// AccordionGroup içinde kullanılacak item
export function AccordionGroupItem({ id, ...props }: AccordionGroupItemProps) {
  // Bu component AccordionGroup context'i içinde kullanılmalı
  // Şimdilik basit bir implementation
  const [isOpen, setIsOpen] = useState(props.defaultOpen || false)
  
  return (
    <AccordionItem
      {...props}
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
    />
  )
}

export default Accordion