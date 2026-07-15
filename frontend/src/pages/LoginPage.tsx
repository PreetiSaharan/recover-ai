import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { HowItWorksDialog } from '@/components/how-it-works-dialog'
import { apiFetch } from '@/lib/api'
import { Loader2, ShieldCheck, AlertCircle, HelpCircle } from 'lucide-react'

const DEMO_ACCOUNTS = [
  { label: 'Manager', email: 'manager@demofin.com', password: 'Demo@1234' },
  { label: 'Telecaller', email: 'telecaller@demofin.com', password: 'Demo@1234' },
  { label: 'Field Agent', email: 'agent@demofin.com', password: 'Demo@1234' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const navigate = useNavigate()

  function fillDemoAccount(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail)
    setPassword(demoPassword)
    setError(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(false)

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      localStorage.setItem('access_token', data.access_token)

      const me = await apiFetch('/auth/me').catch(() => null)
      if (me?.role === 'telecaller') navigate('/my-calls')
      else if (me?.role === 'field_agent') navigate('/my-cases')
      else navigate('/dashboard')
    } catch {
      setError(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center bg-background text-foreground"
      style={{
        backgroundImage:
          'radial-gradient(circle at 20% 15%, color-mix(in oklch, var(--primary) 7%, transparent), transparent 45%), radial-gradient(circle at 85% 90%, color-mix(in oklch, var(--primary) 5%, transparent), transparent 40%)',
      }}
    >
      <div className="absolute top-5.5 right-6 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="How it works"
          onClick={() => setHelpOpen(true)}
        >
          <HelpCircle className="size-4" />
        </Button>
        <ThemeToggle />
      </div>

      <HowItWorksDialog open={helpOpen} onOpenChange={setHelpOpen} />

      <div className="flex w-[392px] max-w-[calc(100vw-40px)] flex-col items-center">
        <div className="mb-7 flex items-center gap-2.5">
          <div className="flex size-9.5 shrink-0 items-center justify-center rounded-[10px] bg-primary">
            <div className="size-3.5 rotate-[-45deg] rounded-[5px] border-3 border-r-transparent border-primary-foreground" />
          </div>
          <div>
            <div className="text-xl leading-none font-bold tracking-tight">RecoverAI</div>
            <div className="mt-1 text-[11.5px] text-muted-foreground">AI-powered collections for NBFCs</div>
          </div>
        </div>

        <Card className="w-full py-0">
          <CardContent className="p-6.5">
            <div className="text-base font-bold">Sign in</div>
            <div className="mt-0.5 mb-5 text-xs text-muted-foreground">
              Accounts are provisioned by your admin.
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@nbfc.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-status-npa/30 bg-status-npa/10 px-3 py-2.5 text-xs font-medium text-status-npa">
                  <AlertCircle className="size-4 shrink-0" />
                  Invalid credentials. Please try again.
                </div>
              )}

              <Button type="submit" className="mt-1 w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : 'Log in'}
              </Button>
            </form>

            <div className="mt-5 border-t pt-4">
              <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Demo access
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {DEMO_ACCOUNTS.map((account) => (
                  <Button
                    key={account.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fillDemoAccount(account.email, account.password)}
                  >
                    {account.label}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-[10.5px] text-muted-foreground">
                Pre-filled for demo purposes only.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-5.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          Secured session · data encrypted in transit
        </div>
      </div>
    </div>
  )
}
