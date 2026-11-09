import type { Language } from './bodies'

const VOICE_LANG: Record<Language, string> = { en: 'en-GB', it: 'it-IT' }

// The browser loads its voices in the background: the first getVoices() call often returns none,
// and an utterance without a voice falls back to the default (English) one. So pick the voice ourselves.
let voices: SpeechSynthesisVoice[] = []
if ('speechSynthesis' in window) {
  const load = () => (voices = speechSynthesis.getVoices())
  load()
  speechSynthesis.addEventListener('voiceschanged', load)
}

function voiceFor(language: Language): SpeechSynthesisVoice | undefined {
  // Some browsers write "it_IT", others "it-IT". Prefer voices on this computer over online ones.
  const matching = voices.filter((v) => v.lang.replace('_', '-').startsWith(language))
  return (
    matching.find((v) => v.lang.replace('_', '-') === VOICE_LANG[language] && v.localService) ??
    matching.find((v) => v.localService) ??
    matching[0]
  )
}

// Reads text aloud with the browser's built-in voice for the language, stopping whatever was being said.
export function say(language: Language, ...lines: string[]) {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const voice = voiceFor(language)
  for (const line of lines) {
    const utterance = new SpeechSynthesisUtterance(line)
    utterance.lang = VOICE_LANG[language]
    utterance.rate = 0.85
    if (voice) utterance.voice = voice
    speechSynthesis.speak(utterance)
  }
}
