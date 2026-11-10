# Our Journey

A small static site: an apology, our journey in 24 photos, and a letter.

## Add the photos

Put the photos in the `photos/` folder, named by number:

```
photos/01.jpg
photos/02.jpg
...
photos/26.jpg
```

`.jpg`, `.jpeg`, `.png` and `.webp` all work. Any photo that's missing shows a placeholder.
iPhone `.heic` photos don't display in most browsers, so convert those to `.jpg` first.

## Edit the words

Everything you read on the page lives in `content.js`: the intro, the captions and the letter.

## Run locally

Open `index.html` in a browser, or run `npx serve .`

## Deploy

Push to GitHub, then import the repo in Vercel. There's no build step: leave Framework Preset as "Other" and the build command empty.
