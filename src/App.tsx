import { Canvas } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { BODIES, LANGUAGES, type Language } from './bodies'
import Scene from './Scene'
import { say } from './speech'

const LANGUAGE_KEY = 'tinyspace.language'

const UI: Record<Language, { label: string; loading: string; readAloud: string; goTo: string }> = {
  en: { label: '🇬🇧 EN', loading: 'Getting the rocket ready…', readAloud: 'Read aloud', goTo: 'Go to' },
  it: { label: '🇮🇹 IT', loading: 'Preparo il razzo…', readAloud: 'Leggi ad alta voce', goTo: 'Vai a' },
}

// The saved choice, or the browser's language the first time. Storage can be blocked, so never rely on it.
function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY)
    if (saved === 'en' || saved === 'it') return saved
  } catch {
    // fall through
  }
  return navigator.language.startsWith('it') ? 'it' : 'en'
}

export default function App() {
  // A link like /#saturn starts at that body.
  const [index, setIndex] = useState(() => Math.max(0, BODIES.findIndex((b) => `#${b.id}` === location.hash)))
  const [language, setLanguage] = useState(initialLanguage)
  // While flying, the name and facts of the body we left fade out; the new ones appear on arrival.
  const [arrived, setArrived] = useState(true)
  const [shown, setShown] = useState(index)
  const [ready, setReady] = useState(false)
  const body = BODIES[shown]
  const text = body.text[language]
  const ui = UI[language]

  const go = useCallback((step: number) => {
    setIndex((i) => {
      const next = Math.min(BODIES.length - 1, Math.max(0, i + step))
      if (next !== i) setArrived(false)
      return next
    })
  }, [])

  const current = useRef({ index, language })
  useEffect(() => {
    current.current = { index, language }
  }, [index, language])
  const onArrive = useCallback(() => {
    const { index, language } = current.current
    setShown(index)
    setArrived(true)
    say(language, BODIES[index].text[language].name)
  }, [])

  function chooseLanguage(next: Language) {
    setLanguage(next)
    try {
      localStorage.setItem(LANGUAGE_KEY, next)
    } catch {
      // Not saved; it still works for this visit.
    }
    say(next, body.text[next].name)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Enter' || e.key === ' ') say(language, text.name, ...text.facts)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, language, text])

  const prev = BODIES[index - 1]?.text[language]
  const next = BODIES[index + 1]?.text[language]

  return (
    <div className="app">
      <Canvas camera={{ fov: 45, near: 0.05, far: 5000 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <Scene index={index} onArrive={onArrive} onReady={() => setReady(true)} />
        </Suspense>
      </Canvas>

      {!ready && <div className="loading">{ui.loading}</div>}

      <header className={`title ${arrived ? '' : 'hidden'}`}>
        <h1>{text.name}</h1>
        <p className="kind">{text.kind}</p>
      </header>

      <div className="languages">
        {LANGUAGES.map((l) => (
          <button
            key={l}
            className={l === language ? 'current' : ''}
            onClick={(e) => {
              chooseLanguage(l)
              e.currentTarget.blur() // so Space and Enter don't press it again
            }}
          >
            {UI[l].label}
          </button>
        ))}
      </div>

      <section className={`facts ${arrived ? '' : 'hidden'}`}>
        <ul>
          {text.facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
        <button className="speak" onClick={() => say(language, text.name, ...text.facts)} aria-label={ui.readAloud}>
          🔊
        </button>
      </section>

      {prev && (
        <button className="nav left" onClick={() => go(-1)} aria-label={`${ui.goTo} ${prev.name}`}>
          <span className="arrow">←</span>
          <span className="to">{prev.name}</span>
        </button>
      )}
      {next && (
        <button className="nav right" onClick={() => go(1)} aria-label={`${ui.goTo} ${next.name}`}>
          <span className="to">{next.name}</span>
          <span className="arrow">→</span>
        </button>
      )}

      <nav className="dots">
        {BODIES.map((b, i) => (
          <button
            key={b.id}
            className={i === index ? 'current' : ''}
            onClick={() => go(i - index)}
            aria-label={b.text[language].name}
            title={b.text[language].name}
          />
        ))}
      </nav>
    </div>
  )
}
