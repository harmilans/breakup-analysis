# Talking Stage Autopsy

Standalone frontend plus an online screenshot-analysis API.

## Files

- `index.html` - the full app UI.
- `api/analyze-testimony.js` - secure backend endpoint for vent and screenshot analysis.
- `package.json` - Vercel deployment scripts.

## Run locally

You can open `index.html` directly for a static preview. In direct file preview mode, screenshots are not sent anywhere and the app uses text-only fallback analysis.

For full online analysis, run through Vercel:

```powershell
npm install
$env:OPENAI_API_KEY="your_key_here"
npm start
```

Then open the local Vercel URL. The frontend will call `/api/analyze-testimony`.

## Deploy

Deploy the `talking-stage-autopsy` folder to Vercel and set:

- `OPENAI_API_KEY` - required.
- `OPENAI_MODEL` - optional, defaults to `gpt-4.1-mini`.

The app does not save submissions by default. It sends the vent text and up to 3 screenshots to the API for analysis, then returns only `delta`, `note`, and `findings` to the browser.
