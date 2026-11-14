# Signing the desktop apps

Atom's website needs none of this. It matters only for the downloads: an unsigned Mac app has to be approved once in System Settings, and an unsigned Windows installer shows a "Windows protected your PC" screen. The release workflow already knows how to sign both. It does so when the secrets below exist in the repository, and builds exactly as it does today when they do not.

Nothing here is automatic, because each step needs an identity only the project's owner can prove.

## Mac: Developer ID and notarization

What you need: membership in the Apple Developer Program (a yearly fee, paid to Apple).

1. In Xcode or at developer.apple.com, create a **Developer ID Application** certificate. Export it from Keychain Access as a `.p12` file with a password.
2. At account.apple.com, create an **app-specific password** for your Apple ID.
3. In the repository, open Settings > Secrets and variables > Actions, and add:

| Secret | What goes in it |
| --- | --- |
| `MACOS_CERT_P12` | the `.p12` file, base64-encoded: `base64 -i DeveloperID.p12 \| pbcopy` |
| `MACOS_CERT_PASSWORD` | the password you exported it with |
| `APPLE_ID` | the Apple ID email of the developer account |
| `APPLE_TEAM_ID` | the 10-character Team ID |
| `APPLE_APP_PASSWORD` | the app-specific password from step 2 |

On the next tagged release the Mac job imports the certificate into a temporary keychain, signs the app with the hardened runtime, sends it to Apple for notarization, staples the ticket, and the release notes say so. To try it on your own Mac first, the comments at the top of `mac/build-mac-app.sh` give the two environment variables.

## Windows: a code-signing certificate

What you need: a code-signing certificate from a certificate authority, issued to you or to an organization you can prove you control.

1. Buy an OV or EV code-signing certificate. Since 2023 the authorities issue these on a hardware token or in a cloud vault, not as a file. If yours can be exported as a `.pfx` file with a password, use the secrets below. If it cannot, see the note that follows.
2. Add two secrets:

| Secret | What goes in it |
| --- | --- |
| `WINDOWS_CERT_PFX` | the `.pfx` file, base64-encoded |
| `WINDOWS_CERT_PASSWORD` | its password |

On the next tagged release the Windows job hands both to electron-builder, which signs `Atom.exe` and the installer, and a following step fails the release if either signature is not valid.

**If the certificate lives in a vault.** Microsoft's Trusted Signing and the authorities' own cloud services sign through their own tools, with their own credentials. That path is not wired in, because it cannot be tested without an account. Once a service is chosen, it is one more step in the Windows job of `.github/workflows/release.yml`.

**What signing does not do at once.** A new Windows certificate has no reputation yet. SmartScreen may keep warning for the first weeks, until enough people have installed the signed build. An EV certificate skips most of that wait.

## Checking a release

Every release lists the SHA-256 of each file in `SHA256SUMS.txt`. On a Mac, `spctl -a -vv /Applications/Atom.app` says "Notarized Developer ID" for a signed build. On Windows, right-click the installer, choose Properties, and look for the Digital Signatures tab.
