'use client'

import React, { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className = '',
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props
  }, ref) => {
    const getVariantClasses = () => {
      switch (variant) {
        case 'primary':
          return 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 focus:ring-indigo-500 shadow-md hover:shadow-lg'
        case 'secondary':
          return 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 shadow-sm hover:shadow-md'
        case 'outline':
          return 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-indigo-500 shadow-sm hover:shadow-md'
        case 'ghost':
          return 'text-gray-700 hover:bg-gray-100 focus:ring-indigo-500'
        case 'destructive':
          return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow-md'
        case 'success':
          return 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm hover:shadow-md'
        case 'warning':
          return 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 shadow-sm hover:shadow-md'
        default:
          return 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 focus:ring-indigo-500 shadow-md hover:shadow-lg'
      }
    }

    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return 'px-3 py-1.5 text-sm'
        case 'md':
          return 'px-4 py-2 text-sm'
        case 'lg':
          return 'px-6 py-3 text-base'
        case 'xl':
          return 'px-8 py-4 text-lg'
        default:
          return 'px-4 py-2 text-sm'
      }
    }

    const baseClasses = `
      inline-flex items-center justify-center font-medium rounded-lg
      border border-transparent
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
      transform hover:-translate-y-0.5 active:translate-y-0
    `

    const variantClasses = getVariantClasses()
    const sizeClasses = getSizeClasses()
    const widthClasses = fullWidth ? 'w-full' : ''

    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses} ${sizeClasses} ${widthClasses} ${className}`}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        )}
        {!loading && leftIcon && (
          <span className="mr-2">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="ml-2">{rightIcon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }

// Additional utility components
export const ButtonGroup: React.FC<{
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
}> = ({ children, className = '', orientation = 'horizontal' }) => {
  const orientationClasses = orientation === 'horizontal' 
    ? 'flex space-x-2' 
    : 'flex flex-col space-y-2'

  return (
    <div className={`${orientationClasses} ${className}`}>
      {children}
    </div>
  )
}

export const IconButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={`p-2 ${className}`}
        {...props}
      >
        {children}
      </Button>
    )
  }
)

IconButton.displayName = 'IconButton'

// Preset button variations for common use cases
export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="primary" {...props} />
)

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="secondary" {...props} />
)

export const OutlineButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="outline" {...props} />
)

export const DestructiveButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="destructive" {...props} />
)

export const SuccessButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="success" {...props} />
)