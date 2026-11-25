import GuidePage, { guideMetadata } from '@/components/site/GuidePage'
import { guideBySlug } from '@/lib/site/guides'

const guide = guideBySlug('casting-websites-uk')!
export const metadata = guideMetadata(guide)
export default function Page() { return <GuidePage guide={guide} /> }
