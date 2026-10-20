// Carte d'action de l'agent, affichée sous sa réponse :
//   • finances en attente → Confirmer / Refuser
//   • action effectuée    → résumé + bouton Annuler
//   • annulée / refusée / échec → état grisé

const ICONS = {
  create_transaction: '💸',
  add_shopping_items: '🛒',
  check_shopping_items: '🛒',
  plan_meal: '🍽️',
  add_task: '📝',
  complete_task: '✅',
}

export default function ActionCard({ action, busy, t, onConfirm, onCancel, onUndo }) {
  const icon = ICONS[action.tool] || '⚙️'
  const canUndo = action.status === 'done' && action.undo?.ops?.length > 0

  const tone = {
    pending: { bg: '#FFF8E6', border: '#F5C451', label: t('À confirmer', 'To confirm') },
    done: { bg: '#EEF9F1', border: '#9ADBB0', label: t('Effectué', 'Done') },
    undone: { bg: '#F3F3FA', border: '#D9D9E8', label: t('Annulé', 'Undone') },
    cancelled: { bg: '#F3F3FA', border: '#D9D9E8', label: t('Refusé', 'Declined') },
    failed: { bg: '#FFF1F1', border: '#F2A6A6', label: t('Échec', 'Failed') },
  }[action.status] || { bg: '#F3F3FA', border: '#D9D9E8', label: '' }

  const inactive = action.status === 'undone' || action.status === 'cancelled'

  return (
    <div style={{ ...styles.card, backgroundColor: tone.bg, borderColor: tone.border }}>
      <div style={styles.row}>
        <span style={styles.icon}>{icon}</span>
        <div style={styles.body}>
          <span style={styles.label}>{tone.label}</span>
          <span style={{ ...styles.summary, ...(inactive ? styles.struck : {}) }}>{action.summary}</span>
        </div>
      </div>

      {action.status === 'pending' && (
        <div style={styles.buttons}>
          <button onClick={() => onConfirm(action)} disabled={busy} style={{ ...styles.primary, opacity: busy ? 0.6 : 1 }}>
            ✓ {t('Confirmer', 'Confirm')}
          </button>
          <button onClick={() => onCancel(action)} disabled={busy} style={{ ...styles.secondary, opacity: busy ? 0.6 : 1 }}>
            {t('Refuser', 'Decline')}
          </button>
        </div>
      )}

      {canUndo && (
        <div style={styles.buttons}>
          <button onClick={() => onUndo(action)} disabled={busy} style={{ ...styles.undo, opacity: busy ? 0.6 : 1 }}>
            ↩︎ {t('Annuler', 'Undo')}
          </button>
        </div>
      )}
    </div>
  )
}

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
const styles = {
  card: { border: '1px solid', borderRadius: '14px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '100%' },
  row: { display: 'flex', gap: '10px', alignItems: 'flex-start' },
  icon: { fontSize: '20px', lineHeight: 1.2 },
  body: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  label: { fontSize: '11px', fontWeight: 700, color: '#64647C', textTransform: 'uppercase', letterSpacing: '0.5px' },
  summary: { fontSize: '14px', color: '#1C1B2E', lineHeight: 1.4, wordBreak: 'break-word' },
  struck: { textDecoration: 'line-through', color: '#9696AE' },
  buttons: { display: 'flex', gap: '8px' },
  primary: { flex: 1, padding: '9px 12px', border: 'none', borderRadius: '10px', backgroundColor: '#5B5BD6', color: 'white', fontWeight: 700, fontSize: '14px', fontFamily: FONT, cursor: 'pointer' },
  secondary: { padding: '9px 14px', border: '1px solid #D9D9E8', borderRadius: '10px', backgroundColor: 'white', color: '#64647C', fontWeight: 600, fontSize: '14px', fontFamily: FONT, cursor: 'pointer' },
  undo: { padding: '7px 12px', border: '1px solid #CFCFE2', borderRadius: '10px', backgroundColor: 'white', color: '#4343B5', fontWeight: 600, fontSize: '13px', fontFamily: FONT, cursor: 'pointer' },
}
