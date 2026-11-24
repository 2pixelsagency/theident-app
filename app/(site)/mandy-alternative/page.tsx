import ComparePage from '@/components/site/ComparePage'

export const metadata = {
  title: 'Mandy alternative for actors, dancers and singers | The Ident',
  description: 'Looking for a Mandy alternative? See pay up front, apply in a tap and track every audition on The Ident — built for UK performers. 7 days free.',
  alternates: { canonical: '/mandy-alternative' },
}

export default function Page() {
  return <ComparePage name="Mandy" slug="mandy-alternative" keyword="Mandy alternative"
    intro="The Ident brings castings, auditions and side hustles together for actors, dancers and singers — with pay shown up front, applications in a tap and every recall tracked." />
}
