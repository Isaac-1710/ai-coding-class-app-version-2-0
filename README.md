# Little Ledger

[**Open the Little Ledger app**](https://isaac-1710.github.io/ai-coding-class-app-version-2-0/)

Little Ledger helps homeschool parents keep students’ grades together and find them later. Its main use is simple: select a student, save a grade, then search or filter the records when quarterly paperwork is due.

**One change I made:** I first explored an assignment planner, then changed the idea to a gradebook when it became clear that saving and finding grades would help families more.

## How it works

- `index.html` contains the grade entry form, student setup, and saved-grade list.
- `styles.css` makes the gradebook readable on phones and computers.
- `app.js` validates and saves records in this browser, filters and edits them, and handles backup and restore.

Grades stay in this browser on this device; they are not sent to a server. Download a backup regularly and keep it somewhere safe. Restoring a backup replaces the current local records after confirmation.

## Run it

Serve this folder with a local web server or publish it as a static site, then open its address in a current version of Chrome, Edge, Firefox, or Safari. The app uses standard browser features and has no framework or build step. Serving it from an address (instead of opening the file directly) lets browsers save records reliably.

Records are stored separately by each browser on each device. To move them between browsers or devices, download a backup in one and restore it in the other.

The repository publishes the app to GitHub Pages whenever changes are pushed to `main`. If the app link is not available yet, check the **Actions** tab for the Pages deployment to finish.
