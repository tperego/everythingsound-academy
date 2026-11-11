#!/bin/bash
# Start the EverythingSound practice app and open it in your browser.
# Double-click this file in Finder, or run it from a terminal.
# If the app is already running, it just opens the browser.

cd "$(dirname "$0")" || exit 1
PORT=5173
URL="http://127.0.0.1:$PORT/"

if curl -s -o /dev/null --max-time 2 "$URL"; then
  echo "EverythingSound is already running at $URL"
  open "$URL"
  exit 0
fi

echo "Starting EverythingSound at $URL"
echo "Leave this window open while you use it. Press Ctrl+C to stop."
(sleep 1; open "$URL") &
exec python3 -m http.server "$PORT" --bind 127.0.0.1
