'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'
import { acceptInvite } from '@/features/members/actions'
import { Button } from '@/components/ui/button'
import { FormAlert } from '@/components/app/auth-form'
import { notify } from '@/components/ui/toast'

export function AcceptInviteButton({
  token,
  organizationName,
}: {
  token: string
  organizationName: string
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const onAccept = async () => {
    setPending(true)
    setError(null)
    const result = await acceptInvite(token)
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    notify.success(`Sei entrato in ${organizationName}`)
    router.replace('/dashboard')
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <FormAlert>{error}</FormAlert> : null}
      <Button
        variant="primary"
        size="block"
        icon={<LogIn />}
        loading={pending}
        onClick={() => void onAccept()}
      >
        Entra in {organizationName}
      </Button>
    </div>
  )
}
