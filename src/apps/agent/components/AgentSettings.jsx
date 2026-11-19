import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { shortModel, formatUsd } from '../lib/usage'
import { ANTHROPIC_MODES, DEFAULT_OPENROUTER_MODELS, isValidModelId } from '../lib/models'

// Réglages de l'agent : modèle utilisé, liste des modèles OpenRouter (activer / désactiver),
// consommation du mois, langue et déconnexion.

export default function AgentSettings({ userId, language, t, onClose, onToggleLanguage, onSignOut }) {
  const [mode, setMode] = useState('economy')
  const [activeModelId, setActiveModelId] = useState(null)
  const [models, setModels] = useState([])
  const [modelsReady, setModelsReady] = useState(true) // false = table agent_models absente
  const [usage, setUsage] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null) // { ok, text }
  const [newModel, setNewModel] = useState('')

  const say = (ok, text) => setMessage({ ok, text })

  const loadModels = useCallback(async () => {
    const { data, error } = await supabase.from('agent_models').select('*').eq('user_id', userId)
      .order('sort_order', { ascending: true }).order('created_at', { ascending: true })
    if (error) { setModelsReady(false); return [] }
    // Premier affichage : on propose la liste suggérée, entièrement désactivée
    if ((data ?? []).length === 0) {
      await supabase.from('agent_models').upsert(
        DEFAULT_OPENROUTER_MODELS.map((model_id, i) => ({ user_id: userId, provider: 'openrouter', model_id, enabled: false, sort_order: i })),
        { onConflict: 'user_id,provider,model_id', ignoreDuplicates: true },
      )
      const again = await supabase.from('agent_models').select('*').eq('user_id', userId)
        .order('sort_order', { ascending: true }).order('created_at', { ascending: true })
      return again.data ?? []
    }
    return data
  }, [userId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      let settingsRes = await supabase.from('agent_settings').select('model_mode, active_model_id').eq('user_id', userId).maybeSingle()
      // Tolérant : la colonne active_model_id n'existe qu'après la migration agent_models.sql
      if (settingsRes.error) settingsRes = await supabase.from('agent_settings').select('model_mode').eq('user_id', userId).maybeSingle()
      const [usageRes, loaded] = await Promise.all([
        supabase.from('agent_usage').select('model, input_tokens, output_tokens, cost_usd')
          .eq('user_id', userId).gte('created_at', monthStart).limit(5000),
        loadModels(),
      ])
      if (cancelled) return
      if (settingsRes.data?.model_mode) setMode(settingsRes.data.model_mode)
      setActiveModelId(settingsRes.data?.active_model_id ?? null)
      setUsage(usageRes.data ?? [])
      setModels(loaded)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [userId, loadModels])

  async function saveSettings(nextMode, nextModelId) {
    const previous = { mode, activeModelId }
    setMode(nextMode); setActiveModelId(nextModelId)
    const { error } = await supabase.from('agent_settings').upsert(
      { user_id: userId, model_mode: nextMode, active_model_id: nextModelId, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    if (error) {
      setMode(previous.mode); setActiveModelId(previous.activeModelId)
      say(false, t("Impossible d'enregistrer. La migration agent_models.sql a-t-elle été appliquée ?", 'Could not save. Was the agent_models.sql migration applied?'))
      return false
    }
    say(true, t('✅ Modèle mis à jour', '✅ Model updated'))
    return true
  }

  const chooseMode = (id) => saveSettings(id, null)
  const chooseModel = (row) => saveSettings('custom', row.id)

  async function toggleModel(row) {
    const enabled = !row.enabled
    const { error } = await supabase.from('agent_models').update({ enabled }).eq('id', row.id).eq('user_id', userId)
    if (error) { say(false, t('Action impossible.', 'Action failed.')); return }
    setModels(prev => prev.map(m => (m.id === row.id ? { ...m, enabled } : m)))
    // Un modèle désactivé ne peut plus être utilisé : retour au mode économique
    if (!enabled && activeModelId === row.id) await saveSettings('economy', null)
  }

  async function addModel() {
    const id = newModel.trim()
    if (!isValidModelId(id)) { say(false, t('Format attendu : fournisseur/modèle (ex. google/gemini-4-neon)', 'Expected format: provider/model (e.g. google/gemini-4-neon)')); return }
    if (models.some(m => m.model_id === id)) { say(false, t('Ce modèle est déjà dans la liste.', 'This model is already in the list.')); return }
    const { data, error } = await supabase.from('agent_models')
      .insert({ user_id: userId, provider: 'openrouter', model_id: id, enabled: true, sort_order: models.length })
      .select().single()
    if (error) { say(false, t('Impossible d’ajouter ce modèle.', 'Could not add this model.')); return }
    setModels(prev => [...prev, data]); setNewModel('')
    say(true, t('Modèle ajouté et activé.', 'Model added and enabled.'))
  }

  async function removeModel(row) {
    if (!window.confirm(t(`Retirer « ${row.model_id} » de la liste ?`, `Remove "${row.model_id}" from the list?`))) return
    const { error } = await supabase.from('agent_models').delete().eq('id', row.id).eq('user_id', userId)
    if (error) { say(false, t('Action impossible.', 'Action failed.')); return }
    setModels(prev => prev.filter(m => m.id !== row.id))
    if (activeModelId === row.id) await saveSettings('economy', null)
  }

  const enabledModels = models.filter(m => m.enabled)
  const usingCustom = mode === 'custom' && enabledModels.some(m => m.id === activeModelId)

  const totals = usage.reduce((acc, r) => ({
    answers: acc.answers + 1,
    tokens: acc.tokens + (r.input_tokens || 0) + (r.output_tokens || 0),
    cost: acc.cost + (r.cost_usd == null ? 0 : Number(r.cost_usd)),
    unknown: acc.unknown + (r.cost_usd == null ? 1 : 0),
  }), { answers: 0, tokens: 0, cost: 0, unknown: 0 })

  const byModel = Object.entries(usage.reduce((acc, r) => {
    const m = (acc[r.model] ||= { answers: 0, cost: 0, unknown: 0 })
    m.answers += 1
    if (r.cost_usd == null) m.unknown += 1; else m.cost += Number(r.cost_usd)
    return acc
  }, {})).sort((a, b) => b[1].cost - a[1].cost)

  const locale = language === 'fr' ? 'fr-FR' : 'en-GB'
  const monthName = new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' })

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.sheet} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>{t("Réglages de l'agent", 'Agent settings')}</h2>
          <button onClick={onClose} style={styles.close} aria-label={t('Fermer', 'Close')}>✕</button>
        </div>

        <div style={styles.body}>
          {message && <p style={{ ...styles.message, color: message.ok ? '#12804A' : '#C0392B' }}>{message.text}</p>}

          {/* ---- Modèle utilisé ---- */}
          <h3 style={styles.section}>{t('Modèle utilisé', 'Model in use')}</h3>
          <div style={styles.list} role="radiogroup">
            {ANTHROPIC_MODES.map(m => {
              const [label, desc] = language === 'fr' ? m.fr : m.en
              const selected = !usingCustom && mode === m.id
              return (
                <button key={m.id} role="radio" aria-checked={selected} onClick={() => chooseMode(m.id)}
                  style={{ ...styles.option, ...(selected ? styles.optionSelected : {}) }}>
                  <span style={styles.optionIcon}>{m.icon}</span>
                  <span style={styles.optionText}>
                    <span style={styles.optionLabel}>
                      {label}{m.id === 'economy' && <span style={styles.badge}>{t('par défaut', 'default')}</span>}
                    </span>
                    <span style={styles.optionDesc}>{desc}</span>
                  </span>
                  <span style={{ ...styles.radio, ...(selected ? styles.radioOn : {}) }} />
                </button>
              )
            })}
            {enabledModels.map(row => {
              const selected = usingCustom && activeModelId === row.id
              return (
                <button key={row.id} role="radio" aria-checked={selected} onClick={() => chooseModel(row)}
                  style={{ ...styles.option, ...(selected ? styles.optionSelected : {}) }}>
                  <span style={styles.optionIcon}>🔀</span>
                  <span style={styles.optionText}>
                    <span style={styles.optionLabel}>{row.model_id}</span>
                    <span style={styles.optionDesc}>OpenRouter</span>
                  </span>
                  <span style={{ ...styles.radio, ...(selected ? styles.radioOn : {}) }} />
                </button>
              )
            })}
          </div>

          {/* ---- Modèles OpenRouter ---- */}
          <h3 style={styles.section}>{t('Modèles OpenRouter', 'OpenRouter models')}</h3>
          {!modelsReady ? (
            <p style={styles.muted}>{t("La liste n'est pas disponible : la migration agent_models.sql n'a pas encore été appliquée.", 'The list is not available: the agent_models.sql migration has not been applied yet.')}</p>
          ) : (
            <>
              <p style={styles.note}>{t(
                'Activez ceux que vous voulez utiliser : ils apparaissent alors dans « Modèle utilisé ». Nécessite la clé OPENROUTER_API_KEY dans les secrets Supabase.',
                'Enable the ones you want to use: they then appear under "Model in use". Requires the OPENROUTER_API_KEY secret in Supabase.',
              )}</p>
              <div style={styles.list}>
                {models.map(row => (
                  <div key={row.id} style={styles.modelRow}>
                    <button
                      type="button" role="switch" aria-checked={row.enabled} aria-label={row.model_id}
                      onClick={() => toggleModel(row)}
                      style={{ ...styles.switchTrack, backgroundColor: row.enabled ? '#5B5BD6' : '#CFCFE2' }}
                    >
                      <span style={{ ...styles.switchThumb, transform: row.enabled ? 'translateX(18px)' : 'none' }} />
                    </button>
                    <span style={{ ...styles.modelName, color: row.enabled ? '#1C1B2E' : '#9696AE' }}>{row.model_id}</span>
                    <button type="button" onClick={() => removeModel(row)} style={styles.removeBtn} aria-label={t('Retirer', 'Remove')}>✕</button>
                  </div>
                ))}
              </div>
              <div style={styles.addRow}>
                <input
                  type="text" value={newModel} onChange={e => setNewModel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addModel() }}
                  placeholder={t('fournisseur/modèle', 'provider/model')} style={styles.addInput}
                  autoCapitalize="none" autoCorrect="off" spellCheck={false}
                />
                <button onClick={addModel} disabled={!newModel.trim()} style={{ ...styles.addBtn, opacity: newModel.trim() ? 1 : 0.5 }}>
                  {t('Ajouter', 'Add')}
                </button>
              </div>
            </>
          )}

          {/* ---- Consommation ---- */}
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
                  {totals.answers} {t('réponses', 'answers')} · {totals.tokens.toLocaleString(locale)} tokens
                </span>
              </div>
              {byModel.map(([model, v]) => (
                <div key={model} style={styles.modelUsageRow}>
                  <span style={styles.modelUsageName}>{shortModel(model)}</span>
                  <span style={styles.muted}>{v.answers} · {v.unknown === v.answers ? t('coût inconnu', 'unknown cost') : formatUsd(v.cost)}</span>
                </div>
              ))}
              {totals.unknown > 0 && (
                <p style={styles.note}>{t(
                  `Coût inconnu pour ${totals.unknown} réponse(s) (modèles OpenRouter) : voir le détail sur openrouter.ai.`,
                  `Unknown cost for ${totals.unknown} answer(s) (OpenRouter models): see the details on openrouter.ai.`,
                )}</p>
              )}
            </div>
          )}
          <p style={styles.note}>
            {t(
              "Estimation d'après les tarifs d'Anthropic. La facture réelle est dans la console du fournisseur (Anthropic, OpenRouter).",
              "Estimate based on Anthropic's pricing. The actual bill is in the provider's console (Anthropic, OpenRouter).",
            )}
          </p>

          {/* ---- Compte ---- */}
          <h3 style={styles.section}>{t('Compte', 'Account')}</h3>
          <div style={styles.accountRow}>
            <button onClick={onToggleLanguage} style={styles.accountBtn}>
              {language === 'fr' ? '🇬🇧 Switch to English' : '🇫🇷 Passer en français'}
            </button>
            <button onClick={onSignOut} style={{ ...styles.accountBtn, color: '#C0392B' }}>
              🚪 {t('Se déconnecter', 'Sign out')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
const styles = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { width: '100%', maxWidth: '600px', maxHeight: '92vh', backgroundColor: '#F6F6FC', borderRadius: '22px 22px 0 0', display: 'flex', flexDirection: 'column', fontFamily: FONT },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px 8px' },
  title: { margin: 0, fontSize: '18px', fontWeight: 800, color: '#1C1B2E' },
  close: { width: '34px', height: '34px', border: 'none', borderRadius: '50%', backgroundColor: '#E8E8F3', color: '#64647C', cursor: 'pointer', fontSize: '14px' },
  body: { padding: '4px 18px 28px', overflowY: 'auto' },
  section: { margin: '18px 0 8px', fontSize: '12px', fontWeight: 700, color: '#64647C', textTransform: 'uppercase', letterSpacing: '0.6px' },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  option: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', border: '1.5px solid #E8E8F3', borderRadius: '16px', backgroundColor: 'white', cursor: 'pointer', textAlign: 'left', fontFamily: FONT },
  optionSelected: { borderColor: '#5B5BD6', backgroundColor: '#EEEEFC' },
  optionIcon: { fontSize: '22px' },
  optionText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
  optionLabel: { fontSize: '15px', fontWeight: 700, color: '#1C1B2E', display: 'flex', alignItems: 'center', gap: '8px', wordBreak: 'break-all' },
  optionDesc: { fontSize: '13px', color: '#64647C', lineHeight: 1.35 },
  badge: { fontSize: '10px', fontWeight: 700, color: '#12804A', backgroundColor: '#E8F8EF', borderRadius: '9999px', padding: '2px 8px' },
  radio: { width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #CFCFE2', flexShrink: 0 },
  radioOn: { borderColor: '#5B5BD6', backgroundColor: '#5B5BD6', boxShadow: 'inset 0 0 0 3px white' },
  message: { margin: '6px 2px 0', fontSize: '13px', fontWeight: 600 },
  modelRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', backgroundColor: 'white', border: '1px solid #E8E8F3', borderRadius: '14px' },
  modelName: { flex: 1, minWidth: 0, fontSize: '14px', fontWeight: 600, wordBreak: 'break-all' },
  switchTrack: { width: '42px', height: '24px', flexShrink: 0, border: 'none', borderRadius: '12px', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  switchThumb: { width: '20px', height: '20px', borderRadius: '10px', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'transform .2s' },
  removeBtn: { width: '30px', height: '30px', border: 'none', borderRadius: '50%', backgroundColor: 'transparent', color: '#9696AE', cursor: 'pointer', fontSize: '13px', flexShrink: 0 },
  addRow: { display: 'flex', gap: '8px', marginTop: '10px' },
  addInput: { flex: 1, minWidth: 0, padding: '11px 12px', fontSize: '14px', fontFamily: FONT, border: '1.5px solid #E8E8F3', borderRadius: '12px', backgroundColor: 'white', outline: 'none' },
  addBtn: { padding: '0 16px', border: 'none', borderRadius: '12px', backgroundColor: '#5B5BD6', color: 'white', fontWeight: 700, fontSize: '14px', fontFamily: FONT, cursor: 'pointer' },
  usageCard: { backgroundColor: 'white', border: '1px solid #E8E8F3', borderRadius: '16px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' },
  usageRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' },
  usageBig: { fontSize: '22px', fontWeight: 800, color: '#1C1B2E' },
  modelUsageRow: { display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '14px', color: '#1C1B2E', borderTop: '1px solid #F0F0F8', paddingTop: '8px' },
  modelUsageName: { wordBreak: 'break-all' },
  muted: { fontSize: '13px', color: '#64647C', margin: 0 },
  note: { margin: '8px 2px 0', fontSize: '12px', color: '#9696AE', lineHeight: 1.4 },
  accountRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  accountBtn: { flex: '1 1 160px', padding: '12px 14px', border: '1.5px solid #E8E8F3', borderRadius: '14px', backgroundColor: 'white', color: '#1C1B2E', fontWeight: 600, fontSize: '14px', fontFamily: FONT, cursor: 'pointer' },
}
