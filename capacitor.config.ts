import type { CapacitorConfig } from '@capacitor/cli'

// Native shell for the App Store / Play builds (the iOS and Android projects are added later with
// `npx cap add ios` / `npx cap add android`). The app loads the live site; deep links for auth use the
// custom scheme theident:// — see docs/native-auth.md for the Info.plist / AndroidManifest entries.
const config: CapacitorConfig = {
  appId: 'me.theident.app',
  appName: 'The Ident',
  webDir: 'public',
  server: {
    url: 'https://app.theident.me',
    cleartext: false,
  },
}

export default config
