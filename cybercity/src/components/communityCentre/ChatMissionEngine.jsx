import { useEffect, useRef, useState } from 'react'
import { scoreTileReply, scoreResidentMission } from '../../lib/scoring'
import Panel from '../shared/Panel'

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shuffled(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * The Community Centre live-chat + tile-builder mechanic, extracted out of
 * the standalone ResidentMission page so the same mechanic can be embedded
 * in the capstone challenge's communication stage. `scenario` has the exact
 * shape of one entry in data/communityCentre.js's RESIDENTS (icon, name,
 * description, channel, chat, strategies, replyTiles, replyConsequence),
 * so any resident-shaped data — including the capstone's own scenario —
 * drives it identically. Manages intro -> deciding -> consequence ->
 * replying -> sending; the moment a reply is sent it calls
 * onComplete({ correctChoice, tileResult, score }) exactly once — what
 * happens after that (persistence, the "mission complete" summary panel) is
 * the caller's responsibility, same split as IncidentEngine.
 */
export default function ChatMissionEngine({ scenario, onComplete }) {
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState(false)
  const [phase, setPhase] = useState('intro') // intro -> deciding -> consequence -> replying -> sending
  const [chosenStrategyId, setChosenStrategyId] = useState(null)
  const [selectedTileIds, setSelectedTileIds] = useState([])
  const [flash, setFlash] = useState(null) // { tileId, text }
  const [tileOrder] = useState(() =>
    scenario ? shuffled([...scenario.replyTiles.core, ...scenario.replyTiles.distractors]) : [],
  )

  const mountedRef = useRef(true)
  const startedRef = useRef(false)
  const logEndRef = useRef(null)
  const concludedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, typing])

  function pushMessage(from, text) {
    setMessages((prev) => [...prev, { id: prev.length, from, text, time: formatTime() }])
  }

  async function playSequence(msgs) {
    for (const m of msgs) {
      setTyping(true)
      await sleep(750 + Math.random() * 450)
      if (!mountedRef.current) return
      setTyping(false)
      pushMessage('resident', m.text)
      await sleep(150)
      if (!mountedRef.current) return
    }
  }

  useEffect(() => {
    if (!scenario || startedRef.current) return
    startedRef.current = true
    ;(async () => {
      await playSequence([{ text: scenario.chat.opening }, { text: scenario.chat.question }])
      if (mountedRef.current) setPhase('deciding')
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario])

  if (!scenario) return <p>Unknown scenario.</p>

  async function chooseStrategy(strategy) {
    if (phase !== 'deciding') return
    setChosenStrategyId(strategy.id)
    pushMessage('player', strategy.label)
    setPhase('consequence')
    await playSequence(strategy.consequence)
    if (mountedRef.current) setPhase('replying')
  }

  function toggleTile(tile) {
    if (phase !== 'replying') return
    const isSelected = selectedTileIds.includes(tile.id)
    if (!isSelected && tile.type) {
      setFlash({ tileId: tile.id, text: tile.feedback })
      setTimeout(() => {
        if (mountedRef.current) setFlash((f) => (f?.tileId === tile.id ? null : f))
      }, 2200)
    }
    setSelectedTileIds((prev) => (isSelected ? prev.filter((id) => id !== tile.id) : [...prev, tile.id]))
  }

  async function sendReply() {
    if (selectedTileIds.length === 0) return
    const allTiles = [...scenario.replyTiles.core, ...scenario.replyTiles.distractors]
    const assembledText = `${selectedTileIds.map((id) => allTiles.find((t) => t.id === id)?.text).join(' ')}.`
    pushMessage('player', assembledText)
    setPhase('sending')

    const tileResult = scoreTileReply(selectedTileIds, scenario.replyTiles)
    const correctChoice = chosenStrategyId === scenario.strategies.find((s) => s.correct)?.id
    const score = scoreResidentMission({ correctChoice, clarity: tileResult })

    await playSequence(tileResult.clear ? scenario.replyConsequence.good : scenario.replyConsequence.unclear)
    if (!mountedRef.current || concludedRef.current) return
    concludedRef.current = true
    onComplete({ correctChoice, tileResult, score })
  }

  return (
    <>
    <Panel className="flex flex-col gap-3">
      <div className="flex items-center gap-2 pb-2 border-b border-[var(--cc-panel-border)]">
        <span className="text-2xl" aria-hidden="true">
          {scenario.icon}
        </span>
        <div>
          <p className="font-semibold m-0">{scenario.name}</p>
          <p className="text-xs text-[var(--cc-text-dim)] m-0">{scenario.channel}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`cc-bubble-in flex flex-col ${m.from === 'player' ? 'items-end' : 'items-start'}`}>
            <div
              className="rounded-2xl px-3 py-2 text-sm max-w-[85%]"
              style={
                m.from === 'player'
                  ? { background: 'var(--cc-accent)', color: '#06111c' }
                  : { background: 'var(--cc-bg-alt)', border: '1px solid var(--cc-panel-border)' }
              }
            >
              {m.text}
            </div>
            <span className="text-[10px] text-[var(--cc-text-dim)] mt-0.5">
              {m.from === 'player' ? 'You' : scenario.name} · {m.time}
            </span>
          </div>
        ))}
        {typing && (
          <div className="flex items-start">
            <div
              className="rounded-2xl px-3 py-3 flex gap-1"
              style={{ background: 'var(--cc-bg-alt)', border: '1px solid var(--cc-panel-border)' }}
              role="status"
              aria-label={`${scenario.name} is typing`}
            >
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="cc-typing-dot w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--cc-text-dim)', animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={logEndRef} />
      </div>

      {phase === 'deciding' && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--cc-panel-border)]">
          {scenario.strategies.map((s) => (
            <button
              key={s.id}
              onClick={() => chooseStrategy(s)}
              className="px-4 py-2.5 rounded-full border text-sm text-left min-h-11"
              style={{ borderColor: 'var(--cc-panel-border)', background: 'var(--cc-bg-alt)' }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </Panel>

    {(phase === 'replying' || phase === 'sending') && (
        <Panel className="flex flex-col gap-3">
          <h2 className="text-base font-semibold mt-0 mb-0">
            Now help {scenario.name} actually reply — tap tiles to build the message, in order
          </h2>

          <div
            className="min-h-11 rounded-lg border border-dashed border-[var(--cc-panel-border)] p-2 flex flex-wrap gap-1.5 items-center"
            aria-label="Your assembled reply"
          >
            {selectedTileIds.length === 0 && <span className="text-xs text-[var(--cc-text-dim)] px-1">Tap tiles below to add them here…</span>}
            {selectedTileIds.map((id) => {
              const tile = [...scenario.replyTiles.core, ...scenario.replyTiles.distractors].find((t) => t.id === id)
              return (
                <button
                  key={id}
                  onClick={() => toggleTile(tile)}
                  disabled={phase === 'sending'}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${flash?.tileId === id ? 'cc-tile-warn' : ''}`}
                  style={{ background: 'var(--cc-accent)', color: '#06111c' }}
                >
                  {tile.text} <span aria-hidden="true">✕</span>
                </button>
              )
            })}
          </div>

          {/* Immediate feedback for a jargon/bad-advice tile, shown the instant it's
              tapped — independent of the tile's current list, since selecting it
              moves it from "available" to "assembled" in this same render. */}
          {flash && (
            <p
              role="status"
              className="text-xs px-2.5 py-1.5 rounded-lg m-0 self-start"
              style={{ background: 'var(--cc-danger)', color: '#2a0206' }}
            >
              ⚠️ {flash.text}
            </p>
          )}

          <div className="flex flex-wrap gap-2" role="group" aria-label="Available reply tiles">
            {tileOrder
              .filter((t) => !selectedTileIds.includes(t.id))
              .map((tile) => (
                <button
                  key={tile.id}
                  onClick={() => toggleTile(tile)}
                  disabled={phase === 'sending'}
                  aria-pressed="false"
                  className="px-3 py-2 rounded-full border text-sm min-h-11"
                  style={{ borderColor: 'var(--cc-panel-border)', background: 'var(--cc-bg-alt)' }}
                >
                  {tile.text}
                </button>
              ))}
          </div>

          <button
            onClick={sendReply}
            disabled={selectedTileIds.length === 0 || phase === 'sending'}
            className="self-start px-5 py-2.5 rounded-lg font-semibold min-h-11 disabled:opacity-40"
            style={{ background: 'var(--cc-accent)', color: '#06111c' }}
          >
            Send reply
          </button>
        </Panel>
      )}
    </>
  )
}
