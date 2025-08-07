# TikTok Live Dashboard

This project provides a simple web dashboard for TikTok live streamers built using [tiktok-live-connector](https://github.com/zerodytrash/TikTok-Live-Connector).

## Features
- Real-time comments with usernames and avatars
- Viewer, like, and share counts
- Gift events and running list of top gifters
- Battle timer notifications
- Event and error logging under the `logs/` directory

## Usage
Install dependencies and start the server:

```bash
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000) in your browser and enter the TikTok username of the live stream in the text box.

Logs are written to `logs/events.log` and `logs/error.log`.
