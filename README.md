# SenSei Web

Browser workspace for SenSei accounts. The phone authorizes a browser with the existing QR key handoff. Financial records stay end-to-end encrypted on the server and are decrypted in this browser with `sensei-crypto`.

## Configure

1. Copy `.env.example` to `.env.local`.
2. Set the Firebase web app values from the same Firebase project used by `sensei-be` and `sensei-rn`.
3. Set `NEXT_PUBLIC_API_URL` to the backend origin. The default local backend port is `3000`; the web dev server uses `3001`.
4. Add the web origin to the backend `CORS_ORIGINS` setting and enable Firebase Authentication and Storage for the project.

The optional emulator URL values connect the web client to Auth and Storage emulators. Firestore access is through the backend API only.

```sh
npm install
npm run dev
```

Open `http://localhost:3001`, choose **Link with phone**, then scan the code from SenSei → Backup → Link a browser. The phone asks for confirmation before it shares the data key. QR sessions expire after two minutes. The browser Firebase login and data key are stored in browser persistent storage until sign-out; a phone can revoke the browser from Backup → Manage linked browsers.

## Data and privacy

- The QR carries the existing `sensei://link` payload: one-time session ID and ephemeral browser X25519 public key. The private key is generated and kept in the browser while linking.
- After phone approval, the backend returns the wrapped key approval and a Firebase custom token. The browser opens the key locally, signs in, then decrypts `/sync/pull` records locally.
- Edits are encrypted with the shared `sensei-crypto` package before `/sync/push`. The backend never receives plaintext finance records.
- The browser stores the data key and decrypted cache in IndexedDB. Use **Sign out** to clear both. Removing site data also clears the local browser key.
- Receipt images already kept in cloud storage can be viewed after local decryption. New receipt capture and upload remain in the phone app.

## Shared crypto updates

The package uses the built `sensei-crypto` archive already produced for the mobile app. After changing shared crypto, run `npm run build` in `../sensei-crypto`, refresh the app archive with `npm run pack:app`, then reinstall the web package from `../sensei-rn/vendor/sensei-crypto-0.1.0.tgz`.
