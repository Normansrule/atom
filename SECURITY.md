# Security

Atom is a static website and a small Mac app that shows one local HTML file. It makes no network requests, stores nothing but your theme and mission progress (in your own browser or app), and has no accounts or servers.

If you find a security problem anyway, please report it privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. Please don't open a public issue for it. You'll get a reply within a week.

Releases of the Mac app list the SHA-256 checksum of `Atom-mac.zip`. To check a download:

```sh
shasum -a 256 ~/Downloads/Atom-mac.zip
```
