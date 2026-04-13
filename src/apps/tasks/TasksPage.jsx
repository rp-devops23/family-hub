import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

// ============================================================================
// TASKS PAGE — Corvées & Travaux
// ============================================================================

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const PRIORITY_META = {
  1: { emoji: '🔴', labelFr: 'Urgent',    labelEn: 'Urgent',    color: '#E74C3C', bg: '#FDEAEA' },
  2: { emoji: '🟡', labelFr: 'Prévu',     labelEn: 'Planned',   color: '#E67E22', bg: '#FFF3E0' },
  3: { emoji: '🔵', labelFr: 'Envisagé',  labelEn: 'Considered', color: '#3498DB', bg: '#EBF5FB' },
};

function formatAmount(n) {
  if (!n && n !== 0) return '';
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export default function TasksPage({ onHome }) {
  const { user, language, toggleLanguage, signOut, t } = useAuth();
  const [tab, setTab] = useState('chore'); // 'chore' | 'work'
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Form state
  const [formName, setFormName]           = useState('');
  const [formExpires, setFormExpires]     = useState('');
  const [formPriority, setFormPriority]   = useState(2);
  const [formAmount, setFormAmount]       = useState('');
  const [formDriveLink, setFormDriveLink] = useState('');
  const [formSaving, setFormSaving]       = useState(false);

  useEffect(() => { if (user) loadTasks(); }, [user]);

  async function loadTasks() {
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('done', { ascending: true })
      .order('priority', { ascending: true, nullsFirst: false })
      .order('expires_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    setTasks(data ?? []);
    setLoading(false);
  }

  async function toggleDone(task) {
    const { data } = await supabase
      .from('tasks')
      .update({ done: !task.done, updated_at: new Date().toISOString() })
      .eq('id', task.id)
      .select().single();
    if (data) setTasks(prev => prev.map(t => t.id === task.id ? data : t));
  }

  async function saveTask() {
    if (!formName.trim()) return;
    setFormSaving(true);
    const payload = {
      name: formName.trim(),
      category: tab,
      expires_at: formExpires || null,
      updated_at: new Date().toISOString(),
      // work-only fields
      priority:         tab === 'work' ? formPriority : null,
      estimated_amount: tab === 'work' && formAmount !== '' ? parseFloat(formAmount) : null,
      drive_link:       tab === 'work' && formDriveLink.trim() ? formDriveLink.trim() : null,
    };
    if (editingTask) {
      const { data } = await supabase.from('tasks').update(payload).eq('id', editingTask.id).select().single();
      if (data) setTasks(prev => prev.map(t => t.id === editingTask.id ? data : t));
    } else {
      const { data } = await supabase.from('tasks').insert({ ...payload, user_id: user.id }).select().single();
      if (data) setTasks(prev => [data, ...prev]);
    }
    setFormSaving(false);
    closeForm();
  }

  async function deleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  function openForm(task = null) {
    setEditingTask(task);
    setFormName(task?.name ?? '');
    setFormExpires(task?.expires_at ?? '');
    setFormPriority(task?.priority ?? 2);
    setFormAmount(task?.estimated_amount != null ? String(task.estimated_amount) : '');
    setFormDriveLink(task?.drive_link ?? '');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTask(null);
    setFormName('');
    setFormExpires('');
    setFormPriority(2);
    setFormAmount('');
    setFormDriveLink('');
  }

  const tabTasks = useMemo(() => tasks.filter(t => t.category === tab), [tasks, tab]);

  function getExpiryStatus(expiresAt) {
    if (!expiresAt) return 'none';
    const diff = new Date(expiresAt) - new Date(new Date().toDateString());
    if (diff < 0) return 'overdue';
    if (diff <= 3 * 86400000) return 'soon';
    return 'ok';
  }

  function formatExpiry(expiresAt) {
    if (!expiresAt) return '';
    return new Date(expiresAt).toLocaleDateString(
      language === 'fr' ? 'fr-FR' : 'en-US',
      { day: 'numeric', month: 'short' }
    );
  }

  const pendingCount = (cat) => tasks.filter(t => t.category === cat && !t.done).length;

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button onClick={onHome} style={styles.iconBtn} title={t('Accueil', 'Home')}>🏠</button>
            <span style={styles.headerIcon}>✅</span>
            <span style={styles.headerTitle}>{t('Tâches', 'Tasks')}</span>
          </div>
          <div style={styles.headerRight}>
            <button onClick={toggleLanguage} style={styles.iconBtn}>
              {language === 'fr' ? 'EN 🇬🇧' : 'FR 🇫🇷'}
            </button>
            <button onClick={signOut} style={styles.iconBtn}>🚪</button>
          </div>
        </header>

        {/* Tabs */}
        <div style={styles.tabs}>
          {[
            { key: 'chore', labelFr: 'Corvées',  labelEn: 'Chores',     icon: '🧹' },
            { key: 'work',  labelFr: 'Travaux',   labelEn: 'Home Work',  icon: '🔨' },
          ].map(tab_ => (
            <button
              key={tab_.key}
              onClick={() => setTab(tab_.key)}
              style={{ ...styles.tab, ...(tab === tab_.key ? styles.tabActive : {}) }}
            >
              {tab_.icon} {language === 'fr' ? tab_.labelFr : tab_.labelEn}
              {pendingCount(tab_.key) > 0 && (
                <span style={styles.tabBadge}>{pendingCount(tab_.key)}</span>
              )}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div style={styles.list}>
          {loading ? (
            <p style={styles.empty}>{t('Chargement…', 'Loading…')}</p>
          ) : tabTasks.length === 0 ? (
            <div style={styles.emptyCard}>
              <p style={styles.emptyIcon}>{tab === 'chore' ? '🧹' : '🔨'}</p>
              <p style={styles.emptyText}>
                {tab === 'chore'
                  ? t('Aucune corvée — tout est propre !', 'No chores — all clean!')
                  : t('Aucun travail prévu', 'No work planned')}
              </p>
            </div>
          ) : (
            tabTasks.map(task => {
              const status = getExpiryStatus(task.expires_at);
              const prio = task.priority ? PRIORITY_META[task.priority] : null;
              return (
                <div key={task.id} style={{ ...styles.taskRow, opacity: task.done ? 0.6 : 1 }}>
                  <button onClick={() => toggleDone(task)} style={styles.checkbox}>
                    {task.done ? '✅' : '⬜'}
                  </button>
                  <div style={styles.taskContent}>
                    <div style={styles.taskNameRow}>
                      <span style={{ ...styles.taskName, textDecoration: task.done ? 'line-through' : 'none' }}>
                        {task.name}
                      </span>
                      {prio && (
                        <span style={{ ...styles.prioBadge, backgroundColor: prio.bg, color: prio.color }}>
                          {prio.emoji} {language === 'fr' ? prio.labelFr : prio.labelEn}
                        </span>
                      )}
                    </div>
                    <div style={styles.taskMeta}>
                      {task.expires_at && (
                        <span style={{
                          ...styles.taskMetaItem,
                          color: status === 'overdue' ? '#E74C3C' : status === 'soon' ? '#E67E22' : '#636E72',
                        }}>
                          {status === 'overdue' ? '⚠️' : status === 'soon' ? '⏰' : '📅'}
                          {' '}{formatExpiry(task.expires_at)}
                        </span>
                      )}
                      {task.estimated_amount != null && (
                        <span style={{ ...styles.taskMetaItem, color: '#2D3436', fontWeight: '600' }}>
                          💶 {formatAmount(task.estimated_amount)}
                        </span>
                      )}
                      {task.drive_link && (
                        <a
                          href={task.drive_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.driveLink}
                          onClick={e => e.stopPropagation()}
                        >
                          📎 {t('Devis', 'Quote')}
                        </a>
                      )}
                    </div>
                  </div>
                  <div style={styles.taskActions}>
                    <button onClick={() => openForm(task)} style={styles.actionBtn}>✏️</button>
                    <button onClick={() => deleteTask(task.id)} style={styles.actionBtn}>🗑️</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FAB */}
        <button onClick={() => openForm()} style={styles.fab}>
          <span style={{ fontSize: '24px', lineHeight: 1 }}>+</span>
        </button>

        {/* Form modal */}
        {showForm && (
          <div style={styles.overlay} onClick={closeForm}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {editingTask
                    ? t('Modifier', 'Edit')
                    : tab === 'chore' ? t('Nouvelle corvée', 'New chore') : t('Nouveau travail', 'New task')}
                </h2>
                <button onClick={closeForm} style={styles.closeBtn}>✕</button>
              </div>

              <div style={styles.modalForm}>
                {/* Name */}
                <div style={styles.field}>
                  <label style={styles.label}>{t('Nom', 'Name')} *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder={tab === 'chore'
                      ? t('Ex: Passer l\'aspirateur', 'Ex: Vacuum the floors')
                      : t('Ex: Peindre le salon', 'Ex: Paint the living room')}
                    style={styles.input}
                    autoFocus
                  />
                </div>

                {/* Due date */}
                <div style={styles.field}>
                  <label style={styles.label}>{t('À faire avant le (optionnel)', 'Due date (optional)')}</label>
                  <input
                    type="date"
                    value={formExpires}
                    onChange={e => setFormExpires(e.target.value)}
                    style={styles.input}
                  />
                </div>

                {/* Work-only fields */}
                {tab === 'work' && (
                  <>
                    {/* Priority */}
                    <div style={styles.field}>
                      <label style={styles.label}>{t('Priorité', 'Priority')}</label>
                      <div style={styles.prioGroup}>
                        {[1, 2, 3].map(p => {
                          const m = PRIORITY_META[p];
                          const active = formPriority === p;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setFormPriority(p)}
                              style={{
                                ...styles.prioBtn,
                                backgroundColor: active ? m.bg : 'white',
                                color: active ? m.color : '#636E72',
                                borderColor: active ? m.color : '#E1E8ED',
                                fontWeight: active ? '700' : '400',
                              }}
                            >
                              {m.emoji} {p} — {language === 'fr' ? m.labelFr : m.labelEn}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Estimated amount */}
                    <div style={styles.field}>
                      <label style={styles.label}>{t('Montant estimé (€, optionnel)', 'Estimated cost (€, optional)')}</label>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={formAmount}
                        onChange={e => setFormAmount(e.target.value)}
                        placeholder="Ex: 1500"
                        style={styles.input}
                      />
                    </div>

                    {/* Drive link */}
                    <div style={styles.field}>
                      <label style={styles.label}>{t('Lien Drive (devis, optionnel)', 'Drive link (quote, optional)')}</label>
                      <input
                        type="url"
                        value={formDriveLink}
                        onChange={e => setFormDriveLink(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        style={styles.input}
                      />
                    </div>
                  </>
                )}
              </div>

              <div style={styles.modalButtons}>
                <button onClick={closeForm} style={styles.cancelBtn}>{t('Annuler', 'Cancel')}</button>
                <button
                  onClick={saveTask}
                  disabled={formSaving || !formName.trim()}
                  style={{ ...styles.saveBtn, opacity: formSaving || !formName.trim() ? 0.5 : 1 }}
                >
                  {formSaving ? '...' : t('Enregistrer', 'Save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: '100%', minHeight: '100vh', backgroundColor: '#FFF8F0',
    display: 'flex', justifyContent: 'center', fontFamily: FONT,
  },
  container: {
    width: '100%', maxWidth: '600px', minHeight: '100vh',
    display: 'flex', flexDirection: 'column', backgroundColor: '#FFF8F0',
  },

  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', backgroundColor: 'white',
    borderBottom: '1px solid #FDE8CC',
    position: 'sticky', top: 0, zIndex: 10,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  headerIcon: { fontSize: '22px' },
  headerTitle: { fontSize: '18px', fontWeight: '700', color: '#2D3436' },
  iconBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '6px 10px', border: '1px solid #E1E8ED', borderRadius: '8px',
    background: 'white', cursor: 'pointer', fontSize: '13px', fontFamily: FONT,
  },

  tabs: {
    display: 'flex', backgroundColor: 'white',
    borderBottom: '1px solid #FDE8CC',
  },
  tab: {
    flex: 1, padding: '14px 8px', border: 'none', background: 'none',
    fontSize: '14px', fontWeight: '600', color: '#636E72', cursor: 'pointer',
    borderBottom: '3px solid transparent', fontFamily: FONT,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  },
  tabActive: { color: '#E67E22', borderBottomColor: '#E67E22' },
  tabBadge: {
    backgroundColor: '#E67E22', color: 'white',
    fontSize: '11px', fontWeight: '700',
    minWidth: '18px', height: '18px', borderRadius: '9px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 4px',
  },

  list: {
    flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px',
    paddingBottom: '100px',
  },
  emptyCard: {
    backgroundColor: 'white', borderRadius: '12px', padding: '40px 20px',
    textAlign: 'center',
  },
  emptyIcon: { fontSize: '48px', margin: '0 0 12px' },
  emptyText: { color: '#636E72', fontSize: '15px', margin: 0 },
  empty: { textAlign: 'center', color: '#636E72', padding: '40px 0' },

  taskRow: {
    display: 'flex', alignItems: 'flex-start', gap: '10px',
    backgroundColor: 'white', borderRadius: '12px', padding: '12px 14px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
  },
  checkbox: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '22px', flexShrink: 0, padding: 0, lineHeight: 1, paddingTop: '2px',
  },
  taskContent: {
    flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px',
  },
  taskNameRow: {
    display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
  },
  taskName: { fontSize: '15px', fontWeight: '500', color: '#2D3436' },
  prioBadge: {
    fontSize: '11px', fontWeight: '600', padding: '2px 8px',
    borderRadius: '10px', whiteSpace: 'nowrap',
  },
  taskMeta: {
    display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center',
  },
  taskMetaItem: { fontSize: '12px' },
  driveLink: {
    fontSize: '12px', color: '#3498DB', textDecoration: 'none', fontWeight: '500',
  },
  taskActions: { display: 'flex', gap: '4px', flexShrink: 0 },
  actionBtn: {
    width: '30px', height: '30px', border: '1px solid #E1E8ED',
    borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', fontSize: '13px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  fab: {
    position: 'fixed', bottom: '24px', right: 'max(20px, calc(50% - 280px))',
    width: '56px', height: '56px', borderRadius: '28px',
    backgroundColor: '#E67E22', color: 'white', border: 'none',
    boxShadow: '0 4px 12px rgba(230,126,34,0.4)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 200,
  },
  modal: {
    backgroundColor: 'white', borderRadius: '20px 20px 0 0',
    width: '100%', maxWidth: '500px', paddingBottom: '24px',
    maxHeight: '90vh', overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 20px 0',
  },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '600', color: '#2D3436' },
  closeBtn: {
    width: '32px', height: '32px', border: 'none', backgroundColor: '#F5F7FA',
    borderRadius: '16px', cursor: 'pointer', color: '#636E72', fontSize: '14px',
  },
  modalForm: { padding: '16px 20px 0' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '500', color: '#636E72', marginBottom: '6px' },
  input: {
    width: '100%', padding: '12px 14px', border: '1px solid #E1E8ED',
    borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
    fontFamily: FONT,
  },
  prioGroup: {
    display: 'flex', flexDirection: 'column', gap: '8px',
  },
  prioBtn: {
    width: '100%', padding: '10px 14px', border: '2px solid',
    borderRadius: '10px', fontSize: '14px', cursor: 'pointer',
    textAlign: 'left', fontFamily: FONT, transition: 'all 0.1s',
  },
  modalButtons: { display: 'flex', gap: '12px', padding: '8px 20px 0' },
  cancelBtn: {
    flex: 1, padding: '14px', border: '1px solid #E1E8ED', backgroundColor: 'white',
    borderRadius: '10px', fontSize: '15px', cursor: 'pointer', color: '#636E72', fontFamily: FONT,
  },
  saveBtn: {
    flex: 1, padding: '14px', border: 'none', backgroundColor: '#E67E22',
    borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
    color: 'white', fontFamily: FONT,
  },
};
