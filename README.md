# MessMate

A ready-to-run student mess management app. It now works as an installable mobile PWA and has a Firebase Auth + Firestore cloud-sync layer.

## What It Handles

- Residents and monthly rent display
- Individual breakfast, lunch, dinner, and guest meal counts
- Grocery and market purchases with item cost, quantity, buyer, and category
- Today's prepared food menu
- Rent and meal payments
- Monthly settlement with automatic food cost per meal
- CSV export for sharing bills
- Mobile install support through PWA manifest and service worker
- Optional email/password login and shared mess cloud sync

## Suggested Real Use Cases

- Student sees rent due, meal bill, and total balance before paying.
- Mess manager records daily meal counts for every resident.
- Market buyer adds every food item with cost so spending stays transparent.
- Cook checks the daily menu and kitchen notes.
- Monthly settlement splits food expense by actual meal count.
- Guest meals are counted separately so extra consumption is not hidden.
- Away residents can be marked inactive so rent or meals are not accidentally counted.
- Manager signs in on two phones and opens the same mess code to keep entries synced.
- Students install the app on their phone and use their profile to check menu, meals, and dues.

## Data

The app always stores data in the browser through `localStorage`, so it still works offline. Once Firebase is configured and a user signs in, it can also sync the same mess data to Firestore.

It includes sample data on first launch. Use **Reset sample** to restore the demo dataset.

## Use As A Mobile App

1. Open the deployed site on your phone.
2. Android Chrome: tap the browser menu and choose **Install app** or **Add to Home screen**.
3. iPhone Safari: tap Share, then **Add to Home Screen**.
4. Open MessMate from the phone home screen.

## Enable Login And Cloud Database

MessMate uses Firebase for the online part. One Firebase project can handle your mess login and shared database.

1. Create a Firebase project.
2. Add a Web App in Firebase project settings.
3. Copy the Firebase web config.
4. Paste it into `firebase-config.js`.
5. In Firebase Authentication, enable **Email/Password**.
6. In Firestore Database, create a database.
7. Add the rules from `firestore.rules`.
8. Commit, push, and redeploy.

After setup, open **Account & Sync** in the app:

1. Create/sign in with an email and password.
2. Use the generated mess code or enter your own private code.
3. Tap **Open cloud mess**.
4. Set each phone profile as **Manager** or **Student**.
5. Use the same login and mess code on another phone to sync.

The mess code acts like your shared group key, so keep it private and do not use an obvious code like `hostel` or `mess`.

## Run Locally

```powershell
node server.js
```

Then open `http://127.0.0.1:8080`.

On Windows, you can also run `start-messmate.bat`. If npm is available, `npm start` works too.

## Deploy Online

This is a static app, so the same folder can be deployed to GitHub Pages, Netlify, Vercel, or any static hosting provider.

- GitHub Pages: publish the repository root. `.nojekyll` is included.
- Netlify: drag the deployment ZIP or connect the repo. `netlify.toml` is included.
- Vercel: import the repo as a static project. `vercel.json` is included.
