import { getStudentSession } from '@/lib/auth/session'
import { LandingClient } from '@/components/landing/LandingClient'

export default async function LandingPage() {
  const session = await getStudentSession()
  const ctaHref = session ? '/vote' : '/login'
  const votingOpens = process.env.NEXT_PUBLIC_VOTING_OPENS ?? ''
  const year = new Date().getFullYear()

  return <LandingClient ctaHref={ctaHref} votingOpens={votingOpens} year={year} />
}
