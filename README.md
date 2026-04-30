# MessMate

A ready-to-run student mess management app. Open `index.html` in a browser and start using it.

## What It Handles

- Residents and monthly rent display
- Individual breakfast, lunch, dinner, and guest meal counts
- Grocery and market purchases with item cost, quantity, buyer, and category
- Today's prepared food menu
- Rent and meal payments
- Monthly settlement with automatic food cost per meal
- CSV export for sharing bills

## Suggested Real Use Cases

- Student sees rent due, meal bill, and total balance before paying.
- Mess manager records daily meal counts for every resident.
- Market buyer adds every food item with cost so spending stays transparent.
- Cook checks the daily menu and kitchen notes.
- Monthly settlement splits food expense by actual meal count.
- Guest meals are counted separately so extra consumption is not hidden.
- Away residents can be marked inactive so rent or meals are not accidentally counted.

## Data

The app stores data in the browser through `localStorage`. It includes sample data on first launch. Use **Reset sample** to restore the demo dataset.

For a production version, the next step would be adding login roles, cloud database sync, mobile app packaging, and UPI payment tracking.

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
