// These five variables are the speaker's state.
let isOn = false;
let mode = "idle"; // Ignored when off: idle, pairing, connected, playing.
let isPluggedIn = false;
let battery = 60;
let volume = 5;

// Find elements once, so the rest of the code is easier to read.
const powerButton = document.getElementById("power");
const bluetoothButton = document.getElementById("bluetooth");
const playButton = document.getElementById("play");
const deviceButton = document.getElementById("device");
const batteryGrid = document.getElementById("battery-grid");
const plugCheckbox = document.getElementById("plug");
const orangeLight = document.getElementById("orange");
const message = document.getElementById("message");
let holdTimer = null;
let warningAnimation = null;

// Make 100 display blocks once. These are not editable controls.
for (let i = 0; i < 100; i++) {
  const block = document.createElement("span");
  block.setAttribute("aria-hidden", "true");
  batteryGrid.appendChild(block);
}

// Draw the interface from the current state (one place for visual rules).
function render() {
  const isPlaying = isOn && mode === "playing";
  const isConnected = isOn && (mode === "connected" || mode === "playing");
  const isPairing = isOn && mode === "pairing";
  const isCharging = isPluggedIn && battery < 100;
  const isLow = isOn && !isPluggedIn && battery > 0 && battery <= 20;

  document.getElementById("green").className = "light" + (isOn ? " green" : "");
  document.getElementById("blue").className = "light" + (isPairing ? " blue blink" : isConnected ? " blue" : "");
  orangeLight.className = "light" + (isCharging ? " orange" : isLow ? " orange blink" : "");
  document.getElementById("speaker").classList.toggle("playing", isPlaying);
  document.getElementById("notes").style.setProperty("--note-size", (16 + volume * 4) + "px");
  deviceButton.hidden = !isPairing;
  document.getElementById("empty-list").hidden = isPairing || isConnected;
  document.getElementById("phone-status").textContent = isConnected ? "Liviana's Bluetooth Speaker · " + (isPlaying ? "Playing" : "Connected") : "";
  for (let i = 0; i < 100; i++) {
    batteryGrid.children[i].classList.toggle("filled", i < battery);
  }
  batteryGrid.setAttribute("aria-valuenow", battery);
  document.getElementById("battery-value").textContent = battery + "%";
  document.getElementById("state").textContent =
    "isOn = " + isOn + "\nmode = " + (isOn ? '"' + mode + '"' : "— (off)") +
    "\nisPluggedIn = " + isPluggedIn + "\nbattery = " + battery +
    "\nvolume = " + volume + "\nisPlaying = " + isPlaying + " (derived)";
  powerButton.setAttribute("aria-pressed", isOn);
  playButton.setAttribute("aria-pressed", isPlaying);
  // Muting the output immediately also silences any unfinished note.
  if (masterGain) masterGain.gain.value = isPlaying ? volume / 10 * 0.15 : 0;
  if (chimeGain) chimeGain.gain.value = isOn ? volume / 10 * 0.15 : 0;
}

function turnOff() {
  isOn = false;
  mode = "idle";
  cancelHold();
  stopMusic();
}

powerButton.addEventListener("click", () => {
  if (isOn) {
    turnOff();
    message.textContent = "Power off.";
  } else if (battery === 0) {
    // Exactly three orange flashes, even when the speaker cannot start.
    if (warningAnimation) warningAnimation.cancel();
    warningAnimation = orangeLight.animate([
      { backgroundColor: "#ffa74b", opacity: 1 },
      { backgroundColor: "#17191d", opacity: 1 }
    ], { duration: 500, iterations: 3, easing: "steps(1, end)" });
    message.textContent = "Battery empty. Plug in the cable and let it charge.";
  } else {
    if (warningAnimation) warningAnimation.cancel();
    isOn = true;
    mode = "idle";
    message.textContent = "Power on. Hold Bluetooth for one second to pair.";
  }
  render();
});

// A short press does nothing. Releasing early cancels the timer.
function startHold() {
  if (!isOn || holdTimer !== null) return;
  holdTimer = setTimeout(() => {
    holdTimer = null;
    if (!isOn) return;
    mode = "pairing";
    stopMusic();
    message.textContent = "Pairing. Select the speaker on the phone.";
    render();
  }, 1000);
}
function cancelHold() {
  clearTimeout(holdTimer);
  holdTimer = null;
}
bluetoothButton.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  bluetoothButton.setPointerCapture(event.pointerId);
  startHold();
});
bluetoothButton.addEventListener("pointerup", cancelHold);
bluetoothButton.addEventListener("pointercancel", cancelHold);
bluetoothButton.addEventListener("lostpointercapture", cancelHold);
bluetoothButton.addEventListener("blur", cancelHold);
window.addEventListener("blur", cancelHold);
bluetoothButton.addEventListener("contextmenu", (event) => event.preventDefault());
bluetoothButton.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    if (!event.repeat) startHold();
  }
});
bluetoothButton.addEventListener("keyup", (event) => {
  if (event.key === " " || event.key === "Enter") cancelHold();
});

deviceButton.addEventListener("click", () => {
  if (!isOn || mode !== "pairing") return;
  mode = "connected";
  message.textContent = "Connected! Press Play / Pause to start the tune.";
  playConnectionChime();
  render();
});

playButton.addEventListener("click", () => {
  if (!isOn) return;
  if (mode === "connected") {
    mode = "playing";
    startMusic();
    message.textContent = "Playing an original tune.";
  } else if (mode === "playing") {
    mode = "connected";
    stopMusic();
    message.textContent = "Paused. The phone is still connected.";
  }
  render();
});

function changeVolume(amount) {
  if (!isOn) return;
  volume = Math.max(0, Math.min(10, volume + amount));
  render();
}
document.getElementById("plus").addEventListener("click", () => changeVolume(1));
document.getElementById("minus").addEventListener("click", () => changeVolume(-1));
plugCheckbox.addEventListener("change", () => {
  isPluggedIn = plugCheckbox.checked;
  render();
});

function checkBattery() {
  if (battery === 0 && isOn) {
    turnOff();
    message.textContent = "The battery reached 0%. The speaker turned itself off.";
  }
  render();
}
// Count three quiet ticks (3 × 3 seconds) before using 1% battery.
let quietTicks = 0;
// Time changes the state too. Charging wins over battery drain.
setInterval(() => {
  if (isPluggedIn) {
    quietTicks = 0;
    if (battery < 100) battery += 1;
  } else if (isOn && battery > 0) {
    if (mode === "playing") {
      quietTicks = 0;
      battery -= 1; // Playing uses 1% every 3 seconds.
    } else {
      quietTicks += 1;
      if (quietTicks === 3) {
        battery -= 1; // Other on modes use 1% every 9 seconds.
        quietTicks = 0;
      }
    }
  } else {
    quietTicks = 0; // Off and unplugged uses no battery in this model.
  }
  checkBattery();
}, 3000);

// Web Audio makes an original melody from frequencies, with no song files.
let audioContext = null;
let masterGain = null;
let chimeGain = null;
let musicTimer = null;
let noteIndex = 0;
const melody = [261.63, 329.63, 392, 329.63, 440, 392, 293.66, 349.23];

function playNote() {
  if (!isOn || mode !== "playing") return;
  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();
  const now = audioContext.currentTime;
  oscillator.type = "sine";
  oscillator.frequency.value = melody[noteIndex];
  noteIndex = (noteIndex + 1) % melody.length;
  // A short fade makes each note gentle instead of clicking.
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(1, now + 0.02);
  envelope.gain.linearRampToValueAtTime(0, now + 0.3);
  oscillator.connect(envelope);
  envelope.connect(masterGain);
  oscillator.start(now);
  oscillator.stop(now + 0.32);
  oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
}

function prepareAudio() {
  // Browsers require the first audio start to follow a user's click.
  if (!audioContext) {
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(audioContext.destination);
    chimeGain = audioContext.createGain();
    chimeGain.gain.value = 0;
    chimeGain.connect(audioContext.destination);
  }
  audioContext.resume().catch(() => {
    message.textContent = "Audio could not start. Try pausing and pressing play again.";
  });
}

// Two rising tones announce a successful Bluetooth connection.
function playConnectionChime() {
  prepareAudio();
  [523.25, 783.99].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    const start = audioContext.currentTime + index * 0.18;
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(1, start + 0.02);
    envelope.gain.linearRampToValueAtTime(0, start + 0.16);
    oscillator.connect(envelope);
    envelope.connect(chimeGain);
    oscillator.start(start);
    oscillator.stop(start + 0.18);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  });
}

function startMusic() {
  prepareAudio();
  clearInterval(musicTimer);
  playNote();
  musicTimer = setInterval(playNote, 400);
}
function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
  if (masterGain) masterGain.gain.value = 0;
}

render();
