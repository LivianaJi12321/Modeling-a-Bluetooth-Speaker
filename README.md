# Modeling a Bluetooth Speaker

A rough interactive model of my Bluetooth speaker, built with plain HTML, CSS, and JavaScript. It simulates the controls and behavior; it does not connect to real Bluetooth devices.

## Open the model

[Try the interactive speaker model](https://livianaji12321.github.io/Modeling-a-Bluetooth-Speaker/) — no download needed.

To run it locally: Download the files and open `index.html` in a browser. Keep all three files in the same folder. No installation or build step is needed.

## Files

- `index.html` — structure, buttons, phone, and battery display.
- `style.css` — cylinder illustration, layout, lights, and animations.
- `script.js` — state changes, battery simulation, and generated sound.

## Controls

1. Press Power.
2. Hold Bluetooth for one second.
3. Select the speaker on the phone.
4. Press Play/Pause and adjust the volume with + and −.
5. Select Plug in cable to charge.

The battery display has 100 blocks. Battery rates are accelerated: unplugged playback uses 1% every 3 seconds, other powered-on modes use 1% every 9 seconds, and charging adds 1% every 3 seconds. At 0%, the speaker turns off.

The melody and connection chime are generated with the Web Audio API. No recorded songs, frameworks, or external assets are required.
