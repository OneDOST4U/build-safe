import { APP_LOGO_PATH, APP_LOGO_ALT } from '@/lib/constants'

interface BrandLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function BrandLogo({ className = '', size = 'md' }: BrandLogoProps) {
  const sizeMap = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
  }

  return (
    <img
      src={APP_LOGO_PATH}
      alt={APP_LOGO_ALT}
      className={`shrink-0 object-contain drop-shadow-sm select-none ${sizeMap[size]} ${className}`}
      draggable={false}
    />
  )
}
