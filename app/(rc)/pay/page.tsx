import { redirect } from 'next/navigation'

// Pay & earnings now lives in Money (Income tab). Invoices stay at /pay/invoices.
export default function PayRedirect() {
  redirect('/money')
}
