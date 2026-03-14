import { cn } from '~/lib/utils'

interface MainProps extends React.HTMLAttributes<HTMLElement> {
  fixed?: boolean
}

export function Main({ fixed, className, ...props }: MainProps) {
  return (
    <main
      className={cn(
        'flex-1 px-4 py-6',
        fixed && 'flex flex-col',
        className
      )}
      {...props}
    />
  )
}
