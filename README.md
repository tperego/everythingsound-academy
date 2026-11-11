# EverythingSound · practice prototype

A browser practice space for the music theory course. Each lesson page has its YouTube video, the exercises, a composer, automatic checks, a link out to and back from the DAW, and submission. A separate page lets the teacher mark work and send feedback.

There is no build step and nothing to install: plain HTML, CSS and JavaScript modules. Tone.js (audio) and abcjs (staff notation) load from a CDN.

## Run it

Double-click **`start.command`** in Finder. It starts the app and opens your browser. If the app is already running, it just opens the browser. You can also run it from a terminal:

```bash
~/Documents/MusicTheoryCourse/EverythingSound/start.command
```

If you see `Address already in use`, the app is already running: open the address below instead.

Then open:
- <http://127.0.0.1:5173/>: the student lesson page
- <http://127.0.0.1:5173/mark.html>: the teacher marking page
- <http://127.0.0.1:5173/tests.html>: logic tests (should show "all passed")

It has to be served over http(s); opening `index.html` as a file won't load the modules. Any static host works for putting it online (GitHub Pages, Netlify, your own site).

## Live site

- **Students:** <https://practice.everythingsoundacademy.com/>
- **Marking:** <https://practice.everythingsoundacademy.com/mark.html>
- Hosted for free on GitHub Pages from the public repository `tperego/everythingsound-practice`. Only the app's code is in it; no student data is ever uploaded.
- Domain: Squarespace DNS has a CNAME record `practice` → `tperego.github.io`. The `CNAME` file in this folder tells GitHub Pages the domain name.
- **Publishing a change:** commit it, then `git push`. The site updates within a minute or two.

## What students do

1. Watch the lesson video at the top of the page.
2. Pick an exercise. Enter chords from the palette (or type 1–7) and draw a melody in the scale-degree grid. Shaded rows are chord tones.
3. Press **Check** for instant feedback on anything with a right answer.
4. **Take it into your DAW**: export MIDI (all tracks in one file, or one file per track), work on it in Ableton Live, Logic or Pro Tools, then attach the MIDI and an MP3 or WAV bounce. The app reads the MIDI back and checks it's still in key and keeps the progression.
5. **Submit**: download a `.esound.json` file (it includes the MIDI and audio) or copy a submission link (smaller, but no files).

Work autosaves in the browser. **Live MIDI out** (Chrome or Edge) plays the composer straight into a DAW in real time. On a Mac, use the IAC Driver.

## What you do (teacher)

Open `mark.html`, drop in the submission files (or open a student's submission link). For each submission you can:
- listen to the piece and see it as a grid or on the staff
- see the automatic checks re-run against the current exercise definition
- play the bounce and see the analysis of their DAW MIDI
- score each rubric line and write a comment

Then **Copy feedback link** and send it. The student opens it and sees the marks, your comment and their piece. Marks are saved in your browser. Nothing is uploaded anywhere.

## Adding lessons and exercises

Everything lives in [`js/lessons.js`](js/lessons.js):
- `youtubeId`: the part after `v=` in the YouTube URL
- `videoAt`: seconds into the video, which shows a "Watch this part" button on that exercise
- `start`: key, mode, tempo, bars, and an optional given progression (scale degrees, one per bar) and melody
- `lock`: stop students changing the key, bars or chords
- `checks`: automatic checks (the full list is in [`js/checks.js`](js/checks.js))
- `rubric`: the lines you mark by hand

## Files

| File | What it does |
|---|---|
| `js/theory.js` | Scales, scale degrees, diatonic chords, roman numerals, chord detection |
| `js/project.js` | The piece's data model (stored as scale degrees, so changing key transposes everything) |
| `js/composer.js` | Chord lane and melody grid |
| `js/workspace.js` | Toolbar, playback, staff view, live MIDI out |
| `js/audio.js` | Tone.js playback and Web MIDI output |
| `js/midi.js` | MIDI file writer and reader, and DAW MIDI analysis |
| `js/checks.js` | Automatic checks |
| `js/staff.js` | Staff notation (ABC → abcjs) |
| `js/submission.js` | Submission and feedback formats |
| `js/student.js`, `js/teacher.js` | The two pages |

## Not built yet (phase 2)

Student accounts and an online inbox (instead of files and links), video cue points that open an exercise automatically, TikTok 60-second challenge pages, Ableton template sets, and more exercise types (ear training, intervals, minor keys, rhythm).
