import PublicBoard from '@/components/rc/PublicBoard'

export const metadata = { title: 'Browse roles · The Ident', description: 'Live castings, auditions and paid work for performers — theatre, screen, commercials and dance.' }

// The public job board at a stable URL (theident.me/jobs and app.theident.me/jobs)
export default function JobsPage() {
  return <PublicBoard />
}
