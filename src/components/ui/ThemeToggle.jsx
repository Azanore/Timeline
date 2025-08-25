import { Moon, Sun } from 'lucide-react'
import Button from './Button'
import { useTheme } from '@/providers/ThemeProvider'

export default function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useTheme()
  const resolved = theme

  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="md"
        aria-label="Toggle theme"
        onClick={toggleTheme}
        className="relative w-9 p-0"
        title={resolved === 'dark' ? 'Switch to light' : 'Switch to dark'}
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  )
}
