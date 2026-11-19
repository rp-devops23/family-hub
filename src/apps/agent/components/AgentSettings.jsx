import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { shortModel, formatUsd } from '../lib/usage'

// Réglages de l'agent : choix du modèle (le moins cher par défaut) et consommation du mois.

const MODES = [
  {
    id: 'economy', icon: '🌱',
    fr: ['Économique', 'Le moins cher (Claude Haiku 5.5). Idéal pour les courses, les repas et les tâches.'],
    en: ['Economy', 'The cheapest (Claude Haiku 5.5). Great for groceries, meals and tasks.'],
  },
  {
    id: 'auto', icon: '⚖️',
    fr: ['Auto', 'Économique pour les demandes simples, plus puissant pour les analyses et les actions complexes.'],
    en: ['Auto', 'Economy for simple requests, more capable for analyses and complex actions.'],
  },
  {
    id: 'balanced', icon: '🎯',
    fr: ['Équilibré', 'Toujours Claude Sonnet 5.5 : plus fin, coûte plus cher.'],
    en: ['Balanced', 'Always Claude Sonnet 5.5: more nuanced, costs more.'],
  },
  {
    id: 'quality', icon: '🚀',
    fr: ['Maximum', 'Claude Opus 5.5 : le plus capable, et le plus cher.'],
    en: ['Maximum', 'Claude Opus 5.5: the most capable, and the most expensive.'],
  },
]

export default function AgentSettings({ userId, language, t, onClose }) {
  const [mode, setMode] = useState('economy')
  const [usage, setUsage] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null) // { ok, text }

  useEffect(() => {
    let cancelled = false
    async function load() {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const [{ data: settings }, { data: rows }] = await Promise.all([
        supabase.from('agent_settings').select('model_mode').eq('user_id', userId).maybeSingle(),
        supabase.from('agent_usage').select('model, input_tokens, output_tokens, cost_usd')
          .eq('user_id', userId).gte('created_at', monthStart).limit(5000),
      ])
      if (cancelled) return
      if (settings?.model_mode) setMode(settings.model_mode)
      setUsage(rows ?? [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  async function choose(next) {
    const previous = mode
    setMode(next)
    const { error } = await supabase.from('agent_settings')
      .upsert({ user_id: userId, model_mode: next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) {
      setMode(previous)
      setMessage({ ok: false, text: t(
        "Impossible d'enregistrer. La migration agent_usage_settings.sql a-t-elle été appliquée ?",
        'Could not save. Was the agent_usage_settings.sql migration applied?',
      ) })
    } else {
      setMessage({ ok: true, text: t('✅ Modèle mis à jour', '✅ Model updated') })
    }
  }

  const totals = usage.reduce((acc, r) => ({
    answers: acc.answers + 1,
    tokens: acc.tokens + (r.input_tokens || 0) + (r.output_tokens || 0),
    cost: acc.cost + Number(r.cost_usd || 0),
  }), { answers: 0, tokens: 0, cost: 0 })

  const byModel = Object.entries(usage.reduce((acc, r) => {
    const m = (acc[r.model] ||= { answers: 0, cost: 0 })
    m.answers += 1; m.cost += Number(r.cost_usd || 0)
    return acc
  }, {})).sort((a, b) => b[1].cost - a[1].cost)

  const monthName = new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', { month: 'long', year: 'numeric' })

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.sheet} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>{t("Réglages de l'agent", 'Agent settings')}</h2>
          <button onClick={onClose} style={styles.close} aria-label={t('Fermer', 'Close')}>✕</button>
        </div>

        <div style={styles.body}>
          <h3 style={styles.section}>{t('Modèle', 'Model')}</h3>
          <div style={styles.modes} role="radiogroup">
            {MODES.map(m => {
              const [label, desc] = language === 'fr' ? m.fr : m.en
              const selected = mode === m.id
              return (
                <button
                  key={m.id} role="radio" aria-checked={selected} onClick={() => choose(m.id)}
                  style={{ ...styles.mode, ...(selected ? styles.modeSelected : {}) }}
                >
                  <span style={styles.modeIcon}>{m.icon}</span>
                  <span style={styles.modeText}>
                    <span style={styles.modeLabel}>
                      {label}{m.id === 'economy' && <span style={styles.badge}>{t('par défaut', 'default')}</span>}
                    </span>
                    <span style={styles.modeDesc}>{desc}</span>
                  </span>
                  <span style={{ ...styles.radio, ...(selected ? styles.radioOn : {}) }} />
                </button>
              )
            })}
          </div>
          {message && <p style={{ ...styles.message, color: message.ok ? '#12804A' : '#C0392B' }}>{message.text}</p>}

          <h3 style={styles.section}>{t('Consommation', 'Usage')} · {monthName}</h3>
          {loading ? (
            <p style={styles.muted}>{t('Chargement…', 'Loading…')}</p>
          ) : totals.answers === 0 ? (
            <p style={styles.muted}>{t('Aucune réponse enregistrée ce mois-ci.', 'No answers recorded this month.')}</p>
          ) : (
            <div style={styles.usageCard}>
              <div style={styles.usageRow}>
                <span style={styles.usageBig}>≈ {formatUsd(totals.cost)}</span>
                <span style={styles.muted}>
                  {totals.answers} {t('réponses', 'answers')} · {totals.tokens.toLocaleString(language === 'fr' ? 'fr-FR' : 'en-GB')} tokens
                </span>
              </div>
              {byModel.map(([model, v]) => (
                <div key={model} style={styles.modelRow}>
                  <span>{shortModel(model)}</span>
                  <span style={styles.muted}>{v.answers} · {formatUsd(v.cost)}</span>
                </div>
              ))}
            </div>
          )}
          <p style={styles.note}>
            {t(
              "Estimation d'après les tarifs d'Anthropic. La facture réelle est dans la console Anthropic, sur le compte de la clé API.",
              "Estimate based on Anthropic's pricing. The actual bill is in the Anthropic console, on the API key's account.",
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
const styles = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { width: '100%', maxWidth: '600px', maxHeight: '90vh', backgroundColor: '#F6F6FC', borderRadius: '22px 22px 0 0', display: 'flex', flexDirection: 'column', fontFamily: FONT },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px 8px' },
  title: { margin: 0, fontSize: '18px', fontWeight: 800, color: '#1C1B2E' },
  close: { width: '34px', height: '34px', border: 'none', borderRadius: '50%', backgroundColor: '#E8E8F3', color: '#64647C', cursor: 'pointer', fontSize: '14px' },
  body: { padding: '4px 18px 24px', overflowY: 'auto' },
  section: { margin: '16px 0 8px', fontSize: '12px', fontWeight: 700, color: '#64647C', textTransform: 'uppercase', letterSpacing: '0.6px' },
  modes: { display: 'flex', flexDirection: 'column', gap: '8px' },
  mode: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', border: '1.5px solid #E8E8F3', borderRadius: '16px', backgroundColor: 'white', cursor: 'pointer', textAlign: 'left', fontFamily: FONT },
  modeSelected: { borderColor: '#5B5BD6', backgroundColor: '#EEEEFC' },
  modeIcon: { fontSize: '22px' },
  modeText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
  modeLabel: { fontSize: '15px', fontWeight: 700, color: '#1C1B2E', display: 'flex', alignItems: 'center', gap: '8px' },
  modeDesc: { fontSize: '13px', color: '#64647C', lineHeight: 1.35 },
  badge: { fontSize: '10px', fontWeight: 700, color: '#12804A', backgroundColor: '#E8F8EF', borderRadius: '9999px', padding: '2px 8px' },
  radio: { width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #CFCFE2', flexShrink: 0 },
  radioOn: { borderColor: '#5B5BD6', backgroundColor: '#5B5BD6', boxShadow: 'inset 0 0 0 3px white' },
  message: { margin: '8px 2px 0', fontSize: '13px', fontWeight: 600 },
  usageCard: { backgroundColor: 'white', border: '1px solid #E8E8F3', borderRadius: '16px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' },
  usageRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' },
  usageBig: { fontSize: '22px', fontWeight: 800, color: '#1C1B2E' },
  modelRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#1C1B2E', borderTop: '1px solid #F0F0F8', paddingTop: '8px' },
  muted: { fontSize: '13px', color: '#64647C', margin: 0 },
  note: { margin: '12px 2px 0', fontSize: '12px', color: '#9696AE', lineHeight: 1.4 },
}
