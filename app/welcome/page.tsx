import type { Metadata } from 'next'
import EntryScreen from './EntryScreen'

export const metadata: Metadata = {
  title: 'Welcome · RoleCall',
}

// Perform / Cast entry — one screen, toggle state lives in the page
export default function WelcomePage() {
  return <EntryScreen />
}
