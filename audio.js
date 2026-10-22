// ============================================================================
// MODULE 1: AUDIO.JS (Multi-Voice System: Mom Narrator, Child Train, Friends & Suno MP3)
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

function playCurrentCandidate() {
  if (!isMusicPlaying) return;
  bgMusicAudio.src = sunoCandidateFiles[currentSongIndex % sunoCandidateFiles.length];
  bgMusicAudio.play().catch(function() {
    currentSongIndex++;
    if (currentSongIndex < sunoCandidateFiles.length * 2) playCurrentCandidate();
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
  if (!isMusicPlaying) window.toggleMusic();
  else playCurrentCandidate();
  speakCharacter('train', 'Little Train Toby', '#ef4444', 'Yay! Let us listen to the next happy train song!');
};

window.changeMusicVolume = function(val) {
  bgMusicAudio.volume = parseFloat(val);
};

// --- MULTI-ROLE VOICE ENGINE (Mom Narrator, Child Train, Best Friends) ---
var verifiedEnVoices = [];
function loadEnglishVoices() {
  if (!('speechSynthesis' in window)) return;
  var all = window.speechSynthesis.getVoices() || [];
  verifiedEnVoices = all.filter(function(v) {
    var l = (v.lang || '').toLowerCase();
    var n = (v.name || '').toLowerCase();
    if (l.indexOf('cs') !== -1 || l.indexOf('cz') !== -1 || n.indexOf('zuzana') !== -1) return false;
    return l.indexOf('en') === 0;
  });
}
if ('speechSynthesis' in window) {
  loadEnglishVoices();
  window.speechSynthesis.onvoiceschanged = loadEnglishVoices;
}

var faceCardTimer = null;
var cloudFallbackAudio = null;

// role: 'mom' (warm gentle female) | 'train' (cheerful child) | 'friend' (playful character)
window.speakCharacter = function(role, speakerName, avatarColorHex, text) {
  var card = document.getElementById('face-cam-card');
  var avatar = document.getElementById('face-avatar');
  var tag = document.getElementById('speaker-tag');
  var txtEl = document.getElementById('speech-text');

  if (card) {
    avatar.style.background = avatarColorHex || '#ef4444';
    tag.textContent = speakerName;
    txtEl.textContent = text;
    card.classList.add('visible', 'talking');
    clearTimeout(faceCardTimer);
    faceCardTimer = setTimeout(function() {
      card.classList.remove('talking');
      setTimeout(function() { card.classList.remove('visible'); }, 900);
    }, 4500);
  }

  // Trigger Face-Cam zoom on the locomotive in game.js if available
  if (window.triggerFaceCamHighlight) window.triggerFaceCamHighlight(110);

  if (!verifiedEnVoices.length) loadEnglishVoices();

  if (verifiedEnVoices.length > 0 && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      var u = new SpeechSynthesisUtterance(text);

      // Pick warm female voice for Mom, higher voice for Child Train
      var femalePrefs = ['Samantha', 'Victoria', 'Karen', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Moira'];
      var chosen = verifiedEnVoices[0];
      for (var i = 0; i < femalePrefs.length; i++) {
        var found = verifiedEnVoices.find(function(v) { return v.name.indexOf(femalePrefs[i]) !== -1; });
        if (found) { chosen = found; break; }
      }
      u.voice = chosen;
      u.lang = 'en-US';

      if (role === 'mom') {
        u.pitch = 1.06; // Warm, soothing motherly narrator
        u.rate = 0.91;
      } else if (role === 'train') {
        u.pitch = 1.48; // Excited little child voice for the train!
        u.rate = 1.04;
      } else {
        u.pitch = 1.28; // Playful best friend voice
        u.rate = 0.98;
      }
      window.speechSynthesis.speak(u);
      return;
    } catch (e) {}
  }

  // Cloud English fallback if system has no English voices installed
  try {
    if (cloudFallbackAudio) cloudFallbackAudio.pause();
    var url = 'https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=en-US&q=' + encodeURIComponent(text);
    cloudFallbackAudio = new Audio(url);
    cloudFallbackAudio.playbackRate = role === 'train' ? 1.14 : 0.96;
    cloudFallbackAudio.play().catch(function(){});
  } catch (e) {}
};

// Backwards-compatible wrapper
window.speakPureEnglish = function(emoji, text) {
  window.speakCharacter('mom', emoji + ' Mom Narrator', '#ec4899', text);
};

// --- WEB AUDIO SYNTHESIZER (Horns, Laughs, Helicopter, Cow Moo, Sheep Baa, Magic Chime) ---
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
    osc.frequency.setValueAtTime(f, now + idx * 0.06);
    gain.gain.setValueAtTime(0.11, now + idx * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now + idx * 0.06);
    osc.stop(now + idx * 0.06 + dur);
  });
}

window.playTrainHorn = function() { playTone([349.23, 440.0, 523.25], 0.65, 'triangle'); };
window.playCollectSound = function() { playTone([587.33, 880.0, 1174.66], 0.26, 'sine'); };
window.playSheepBaa = function() { playTone([310, 275, 300], 0.32, 'sawtooth'); };
window.playCowMoo = function() { playTone([145, 130], 0.75, 'sawtooth'); };
window.playCarBeepBeep = function() { playTone([480, 620], 0.18, 'square'); };
window.playHappyLaugh = function() { playTone([523, 659, 587, 784, 659], 0.14, 'sine'); };
window.playMagicSubwaySound = function() { playTone([440, 554.37, 659.25, 880, 1108.73], 0.35, 'sine'); };
