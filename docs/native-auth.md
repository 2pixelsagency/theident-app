# Native app (Capacitor) — auth deep links

The web app handles every emailed link and OAuth return at **`/auth/callback`** (PKCE). The native shell
(`capacitor.config.ts`, app id `me.theident.app`, loads `https://app.theident.me`) uses the custom scheme
**`theident://auth/callback`** instead, so a password-reset email opens the app, not the browser.

What's already in code:
- `lib/rc/authRedirect.ts` — inside the native app, `redirectTo` becomes `theident://auth/callback?next=…`.
- `components/NativeAuthBridge.tsx` — `@capacitor/app` `appUrlOpen` listener: catches the link, calls
  `supabase.auth.exchangeCodeForSession(code)`, then routes to `next` (e.g. `/reset-password`). Inert on the web.

## When the native projects are added (`npx cap add ios` / `npx cap add android`)

### iOS — `ios/App/App/Info.plist`
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key><string>me.theident.app</string>
    <key>CFBundleURLSchemes</key><array><string>theident</string></array>
  </dict>
</array>
```

### Android — `android/app/src/main/AndroidManifest.xml` (inside the main `<activity>`)
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="theident" android:host="auth" android:pathPrefix="/callback" />
</intent-filter>
```

### Optional: Universal Links / App Links (https instead of a custom scheme)
Serve `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` from `app.theident.me`
for `/auth/callback`, add the Associated Domains capability (`applinks:app.theident.me`) on iOS and an
`autoVerify` https intent-filter on Android. The bridge already accepts `https://app.theident.me/auth/callback`.

### Supabase redirect allow-list
Add `theident://auth/callback` (and `theident://**` if you prefer a wildcard) alongside the web URLs.

### Google / Apple sign-in inside the app
Google blocks sign-in inside embedded web views. Before shipping native, switch OAuth to
`signInWithOAuth({ options: { redirectTo, skipBrowserRedirect: true } })` + `@capacitor/browser` to open
the provider in the system browser; the same `theident://auth/callback` link brings the user back.
