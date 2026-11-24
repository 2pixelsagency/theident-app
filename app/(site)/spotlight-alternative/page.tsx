import ComparePage from '@/components/site/ComparePage'

export const metadata = {
  title: 'Spotlight alternative for performers | The Ident',
  description: 'Looking for a Spotlight alternative? Find castings, auditions and paid work, apply with your reel and track every recall on The Ident. 7 days free.',
  alternates: { canonical: '/spotlight-alternative' },
}

export default function Page() {
  return <ComparePage name="Spotlight" slug="spotlight-alternative" keyword="Spotlight alternative"
    intro="The Ident is a casting app for UK performers: castings and paid work with the pay up front, one-tap applications with your reel, and every self-tape, recall and booking tracked in one place." />
}
