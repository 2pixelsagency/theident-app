import { redirect } from 'next/navigation'

// Tax & expenses now lives in Money (Tax tab).
export default function TaxRedirect() {
  redirect('/money?tab=tax')
}
