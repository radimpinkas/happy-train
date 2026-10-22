// ============================================================================
// MODULE 1: AUDIO.JS (Suno MP3 Playlist, Web Audio Synthesizer & English Voice)
// ============================================================================

var sunoCandidateFiles = [
  'song1.mp3',
  'song2.mp3',
  'Little Train Ride.mp3',
  'Little Train Ride (1).mp3'
];
var currentSongIndex = 0;
var isMusicPlaying = false;
var bgMusicAudio = new Audio();
bgMusicAudio.volume = 0.45;

// Automatically advance to the next song in the list when one finishes or fails
function playCurrentCandidate() {
  if (!isMusicPlaying) return;
  bgMusicAudio.src = sunoCandidateFiles[currentSongIndex % sunoCandidateFiles.length];
  bgMusicAudio.play().catch(function() {
    // Try next candidate filename if one doesn't exist
    currentSongIndex++;
    if (currentSongIndex < sunoCandidateFiles.length * 2) {
      playCurrentCandidate();
    }
  });
}

bgMusicAudio.addEventListener('ended', function() {
  currentSongIndex = (currentSongIndex + 1) % sunoCandidateFiles.length;
  playCurrentCandidate();
});

window.toggleMusic = function() {
  initAudio();
  var btn = document.getElementById('music-toggle-btn');
  if (isMusicPlaying) {
    isMusicPlaying = false;
    bgMusicAudio.pause();
    btn.textContent = '🎵 Music: OFF (M)';
    btn.classList.remove('playing');
  } else {
    isMusicPlaying = true;
    btn.textContent = '🎵 Music: ON (M)';
    btn.classList.add('playing');
    bgMusicAudio.volume = parseFloat(document.getElementById('music-vol').value);
    playCurrentCandidate();
  }
};

window.nextMusicTrack = function() {
  currentSongIndex = (currentSongIndex + 1) % sunoCandidateFiles.length;
  if (!isMusicPlaying) {
    window.toggleMusic();
  } else {
    playCurrentCandidate();
  }
  speakPureEnglish("🎵", "Switching to the next train song!", true);
};

window.changeMusicVolume = function(val) {
  bgMusicAudio.volume = parseFloat(val);
};

// --- ENGLISH VOICE ENGINE (Cloud EN + System TTS Fallback) ---
var useCloudVoice = true;
var cloudAudio = null;
var verifiedEnVoice = null;

function findBestSystemEnVoice() {
  if (!('speechSynthesis' in window)) return null;
  var list = window.speechSynthesis.getVoices() || [];
  var enOnly = list.filter(function(v) {
    var l = (v.lang || '').toLowerCase();
    var n = (v.name || '').toLowerCase();
    if (l.indexOf('cs') !== -1 || l.indexOf('cz') !== -1 || n.indexOf('zuzana') !== -1) return false;
    return l.indexOf('en') === 0;
  });
  var prefs = ['Google US English', 'Google UK English Female', 'Microsoft Aria', 'Samantha', 'Daniel', 'Karen'];
  for (var i = 0; i < prefs.length; i++) {
    for (var j = 0; j < enOnly.length; j++) {
      if (enOnly[j].name.indexOf(prefs[i]) !== -1) return enOnly[j];
    }
  }
  return enOnly[0] || null;
}

if ('speechSynthesis' in window) {
  verifiedEnVoice = findBestSystemEnVoice();
  window.speechSynthesis.onvoiceschanged = function() { verifiedEnVoice = findBestSystemEnVoice(); };
}

window.toggleVoiceEngine = function() {
  useCloudVoice = !useCloudVoice;
  var btn = document.getElementById('voice-btn');
  btn.textContent = useCloudVoice ? '🎙️ Cloud EN' : '🎙️ System TTS';
  btn.style.background = useCloudVoice ? '#4ade80' : '#fde047';
  speakPureEnglish("🔊", useCloudVoice ? "Natural cloud English voice active!" : "System English voice active!", true);
};

var bannerTimer = null;
window.speakPureEnglish = function(emoji, text, force) {
  var banner = document.getElementById('speech-banner');
  if (banner) {
    document.getElementById('speech-emoji').textContent = emoji;
    document.getElementById('speech-text').textContent = text;
    banner.classList.add('visible');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function() { banner.classList.remove('visible'); }, 4200);
  }

  if (useCloudVoice) {
    try {
      if (cloudAudio) cloudAudio.pause();
      var url = 'https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=en-US&q=' + encodeURIComponent(text);
      cloudAudio = new Audio(url);
      cloudAudio.playbackRate = 1.04;
      var p = cloudAudio.play();
      if (p !== undefined) p.catch(function() { speakSystemFallback(text, force); });
      return;
    } catch (e) {}
  }
  speakSystemFallback(text, force);
};

function speakSystemFallback(text, force) {
  if (!('speechSynthesis' in window)) return;
  try {
    if (force || !window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    if (!verifiedEnVoice) verifiedEnVoice = findBestSystemEnVoice();
    var u = new SpeechSynthesisUtterance(text);
    if (verifiedEnVoice) u.voice = verifiedEnVoice;
    u.lang = 'en-US';
    u.rate = 0.96;
    u.pitch = 1.06;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

// --- WEB AUDIO SOUND EFFECTS ---
var audioCtx = null;
window.initAudio = function() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
};

function playTone(freqs, dur, type) {
  initAudio();
  var now = audioCtx.currentTime;
  freqs.forEach(function(f, idx) {
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(f, now + idx * 0.05);
    gain.gain.setValueAtTime(0.11, now + idx * 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now + idx * 0.05);
    osc.stop(now + idx * 0.05 + dur);
  });
}

window.playTrainHorn = function() { playTone([349.23, 440.0, 523.25], 0.65, 'triangle'); };
window.playCollectSound = function() { playTone([587.33, 880.0, 1174.66], 0.26, 'sine'); };
window.playSheepBaa = function() { playTone([290, 260], 0.35, 'sawtooth'); };
