import type { Metadata } from 'next'
import { DesignSystemShowcase } from './showcase'

export const metadata: Metadata = {
  title: 'Design system',
  description:
    'Token, componenti, varianti e stati di Work-Hub. La pagina è la fonte di verità visiva del prodotto.',
}

/**
 * Living design system.
 *
 * Renders the real components from `src/components/ui`, not screenshots, so a
 * regression in a token or a variant is visible here first. Reachable without
 * signing in — it contains no tenant data.
 */
export default function DesignSystemPage() {
  return <DesignSystemShowcase />
}
