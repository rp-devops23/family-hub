import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const ACCENT = '#8E44AD';

const PRIORITY_META = {
  1: { emoji: '🔴', labelFr: 'Urgent',   labelEn: 'Urgent',    color: '#E74C3C', bg: '#FDEAEA' },
  2: { emoji: '🟡', labelFr: 'Prévu',    labelEn: 'Planned',   color: '#E67E22', bg: '#FFF3E0' },
  3: { emoji: '🔵', labelFr: 'Envisagé', labelEn: 'Considered', color: '#3498DB', bg: '#EBF5FB' },
};

function fmtEur(n) {
  if (n == null) return '';
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function isRealise(task) {
  if (task.done) return true;
  if (task.expires_at && new Date(task.expires_at) < new Date(new Date().toDateString())) return true;
  return false;
}

export default function TravauxPage({ onHome }) {
  const { user, language, toggleLanguage, signOut, t } = useAuth();
  const [tab, setTab] = useState('todo'); // 'todo' | 'done'
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [formName, setFormName]           = useState('');
  const [formDate, setFormDate]           = useState('');
  const [formPriority, setFormPriority]   = useState(2);
  const [formAmount, setFormAmount]       = useState('');
  const [formDriveLink, setFormDriveLink] = useState('');
  const [formSaving, setFormSaving]       = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', 'work')
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
      .eq('id', task.id).select().single();
    if (data) setTasks(prev => prev.map(t => t.id === task.id ? data : t));
  }

  async function save() {
    if (!formName.trim()) return;
    setFormSaving(true);
    const payload = {
      name: formName.trim(),
      category: 'work',
      expires_at:       formDate || null,
      priority:         formPriority,
      estimated_amount: formAmount !== '' ? parseFloat(formAmount) : null,
      drive_link:       formDriveLink.trim() || null,
      updated_at:       new Date().toISOString(),
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

  async function del(id) {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  function openForm(task = null) {
    setEditingTask(task);
    setFormName(task?.name ?? '');
    setFormDate(task?.expires_at ?? '');
    setFormPriority(task?.priority ?? 2);
    setFormAmount(task?.estimated_amount != null ? String(task.estimated_amount) : '');
    setFormDriveLink(task?.drive_link ?? '');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTask(null);
    setFormName('');
    setFormDate('');
    setFormPriority(2);
    setFormAmount('');
    setFormDriveLink('');
  }

  function fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const todoTasks = useMemo(() => tasks.filter(t => !isRealise(t)), [tasks]);
  const doneTasks = useMemo(() => tasks.filter(t => isRealise(t)), [tasks]);
  const currentList = tab === 'todo' ? todoTasks : doneTasks;

  // Total estimated for todo items
  const totalEstimated = useMemo(
    () => todoTasks.reduce((s, t) => s + (t.estimated_amount ?? 0), 0),
    [todoTasks]
  );

  return (
    <div style={s.wrapper}>
      <div style={s.container}>
        {/* Header */}
        <header style={s.header}>
          <div style={s.hLeft}>
            <button onClick={onHome} style={s.iconBtn}>🏠</button>
            <span style={s.hIcon}>🔨</span>
            <span style={s.hTitle}>{t('Travaux', 'Home Work')}</span>
          </div>
          <div style={s.hRight}>
            <button onClick={toggleLanguage} style={s.iconBtn}>{language === 'fr' ? 'EN 🇬🇧' : 'FR 🇫🇷'}</button>
            <button onClick={signOut} style={s.iconBtn}>🚪</button>
          </div>
        </header>

        {/* Tabs */}
        <div style={s.tabs}>
          <button
            onClick={() => setTab('todo')}
            style={{ ...s.tab, ...(tab === 'todo' ? s.tabActive : {}) }}
          >
            🔨 {t('À faire', 'To do')}
            {todoTasks.length > 0 && <span style={s.tabBadge}>{todoTasks.length}</span>}
          </button>
          <button
            onClick={() => setTab('done')}
            style={{ ...s.tab, ...(tab === 'done' ? s.tabActive : {}) }}
          >
            ✅ {t('Réalisés', 'Completed')}
            {doneTasks.length > 0 && <span style={{ ...s.tabBadge, backgroundColor: '#95A5A6' }}>{doneTasks.length}</span>}
          </button>
        </div>

        {/* Budget summary for todo tab */}
        {tab === 'todo' && todoTasks.some(t => t.estimated_amount) && (
          <div style={s.budgetBar}>
            <span style={s.budgetLabel}>{t('Budget estimé total', 'Total estimated budget')}</span>
            <span style={s.budgetAmount}>{fmtEur(totalEstimated)}</span>
          </div>
        )}

        {/* List */}
        <div style={s.list}>
          {loading ? (
            <p style={s.empty}>{t('Chargement…', 'Loading…')}</p>
          ) : currentList.length === 0 ? (
            <div style={s.emptyCard}>
              <p style={s.emptyIcon}>{tab === 'todo' ? '🔨' : '🎉'}</p>
              <p style={s.emptyText}>
                {tab === 'todo'
                  ? t('Aucun travail prévu', 'No work planned')
                  : t('Aucun travail réalisé', 'No completed work')}
              </p>
            </div>
          ) : currentList.map(task => {
            const prio = task.priority ? PRIORITY_META[task.priority] : null;
            return (
              <div key={task.id} style={{ ...s.row, opacity: isRealise(task) ? 0.65 : 1 }}>
                <button onClick={() => toggleDone(task)} style={s.check}>
                  {task.done ? '✅' : '⬜'}
                </button>
                <div style={s.content}>
                  <div style={s.nameRow}>
                    <span style={{ ...s.name, textDecoration: task.done ? 'line-through' : 'none' }}>
                      {task.name}
                    </span>
                    {prio && (
                      <span style={{ ...s.prioBadge, backgroundColor: prio.bg, color: prio.color }}>
                        {prio.emoji} {language === 'fr' ? prio.labelFr : prio.labelEn}
                      </span>
                    )}
                  </div>
                  <div style={s.meta}>
                    {task.expires_at && (
                      <span style={s.metaItem}>
                        📅 {fmtDate(task.expires_at)}
                      </span>
                    )}
                    {task.estimated_amount != null && (
                      <span style={{ ...s.metaItem, fontWeight: '600', color: '#2D3436' }}>
                        💶 {fmtEur(task.estimated_amount)}
                      </span>
                    )}
                    {task.drive_link && (
                      <a href={task.drive_link} target="_blank" rel="noopener noreferrer"
                        style={s.driveLink} onClick={e => e.stopPropagation()}>
                        📎 {t('Devis', 'Quote')}
                      </a>
                    )}
                  </div>
                </div>
                <div style={s.actions}>
                  <button onClick={() => openForm(task)} style={s.btn}>✏️</button>
                  <button onClick={() => del(task.id)} style={s.btn}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAB — only on todo tab */}
        {tab === 'todo' && (
          <button onClick={() => openForm()} style={s.fab}>
            <span style={{ fontSize: '24px', lineHeight: 1 }}>+</span>
          </button>
        )}

        {/* Form modal */}
        {showForm && (
          <div style={s.overlay} onClick={closeForm}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
              <div style={s.mHeader}>
                <h2 style={s.mTitle}>{editingTask ? t('Modifier', 'Edit') : t('Nouveau travail', 'New task')}</h2>
                <button onClick={closeForm} style={s.closeBtn}>✕</button>
              </div>
              <div style={s.mForm}>
                {/* Name */}
                <div style={s.field}>
                  <label style={s.label}>{t('Nom', 'Name')} *</label>
                  <input autoFocus type="text" value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder={t('Ex: Peindre le salon', 'Ex: Paint the living room')}
                    style={s.input} />
                </div>

                {/* Priority */}
                <div style={s.field}>
                  <label style={s.label}>{t('Priorité', 'Priority')}</label>
                  <div style={s.prioGroup}>
                    {[1, 2, 3].map(p => {
                      const m = PRIORITY_META[p];
                      const active = formPriority === p;
                      return (
                        <button key={p} type="button" onClick={() => setFormPriority(p)}
                          style={{ ...s.prioBtn, backgroundColor: active ? m.bg : 'white', color: active ? m.color : '#636E72', borderColor: active ? m.color : '#E1E8ED', fontWeight: active ? '700' : '400' }}>
                          {m.emoji} {p} — {language === 'fr' ? m.labelFr : m.labelEn}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Work date */}
                <div style={s.field}>
                  <label style={s.label}>{t('Date des travaux (optionnel)', 'Work date (optional)')}</label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={s.input} />
                </div>

                {/* Estimated cost */}
                <div style={s.field}>
                  <label style={s.label}>{t('Montant estimé (€, optionnel)', 'Estimated cost (€, optional)')}</label>
                  <input type="number" min="0" step="50" value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    placeholder="Ex: 1500" style={s.input} />
                </div>

                {/* Drive link */}
                <div style={s.field}>
                  <label style={s.label}>{t('Lien Drive — devis (optionnel)', 'Drive link — quote (optional)')}</label>
                  <input type="url" value={formDriveLink}
                    onChange={e => setFormDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/…" style={s.input} />
                </div>
              </div>
              <div style={s.mBtns}>
                <button onClick={closeForm} style={s.cancelBtn}>{t('Annuler', 'Cancel')}</button>
                <button onClick={save} disabled={formSaving || !formName.trim()}
                  style={{ ...s.saveBtn, opacity: formSaving || !formName.trim() ? 0.5 : 1 }}>
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

const s = {
  wrapper: { width: '100%', minHeight: '100vh', backgroundColor: '#F5F0FF', display: 'flex', justifyContent: 'center', fontFamily: FONT },
  container: { width: '100%', maxWidth: '600px', minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F5F0FF' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'white', borderBottom: '1px solid #E8DAEF', position: 'sticky', top: 0, zIndex: 10 },
  hLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  hRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  hIcon: { fontSize: '22px' },
  hTitle: { fontSize: '18px', fontWeight: '700', color: '#2D3436' },
  iconBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px', border: '1px solid #E1E8ED', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', fontFamily: FONT },
  tabs: { display: 'flex', backgroundColor: 'white', borderBottom: '1px solid #E8DAEF' },
  tab: { flex: 1, padding: '14px 8px', border: 'none', background: 'none', fontSize: '14px', fontWeight: '600', color: '#636E72', cursor: 'pointer', borderBottom: '3px solid transparent', fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  tabActive: { color: ACCENT, borderBottomColor: ACCENT },
  tabBadge: { backgroundColor: ACCENT, color: 'white', fontSize: '11px', fontWeight: '700', minWidth: '18px', height: '18px', borderRadius: '9px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' },
  budgetBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EDE7F6', padding: '10px 16px', borderBottom: '1px solid #D7BDE2' },
  budgetLabel: { fontSize: '13px', color: '#6C3483' },
  budgetAmount: { fontSize: '15px', fontWeight: '700', color: '#6C3483' },
  list: { flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '100px' },
  emptyCard: { backgroundColor: 'white', borderRadius: '12px', padding: '40px 20px', textAlign: 'center' },
  emptyIcon: { fontSize: '48px', margin: '0 0 12px' },
  emptyText: { color: '#636E72', fontSize: '15px', margin: 0 },
  empty: { textAlign: 'center', color: '#636E72', padding: '40px 0' },
  row: { display: 'flex', alignItems: 'flex-start', gap: '10px', backgroundColor: 'white', borderRadius: '12px', padding: '12px 14px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' },
  check: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', flexShrink: 0, padding: 0, lineHeight: 1, paddingTop: '2px' },
  content: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' },
  nameRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  name: { fontSize: '15px', fontWeight: '500', color: '#2D3436' },
  prioBadge: { fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap' },
  meta: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' },
  metaItem: { fontSize: '12px', color: '#636E72' },
  driveLink: { fontSize: '12px', color: '#3498DB', textDecoration: 'none', fontWeight: '500' },
  actions: { display: 'flex', gap: '4px', flexShrink: 0 },
  btn: { width: '30px', height: '30px', border: '1px solid #E1E8ED', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'fixed', bottom: '24px', right: 'max(20px, calc(50% - 280px))', width: '56px', height: '56px', borderRadius: '28px', backgroundColor: ACCENT, color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(142,68,173,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 200 },
  modal: { backgroundColor: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '500px', paddingBottom: '24px', maxHeight: '90vh', overflowY: 'auto' },
  mHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 0' },
  mTitle: { margin: 0, fontSize: '18px', fontWeight: '600', color: '#2D3436' },
  closeBtn: { width: '32px', height: '32px', border: 'none', backgroundColor: '#F5F7FA', borderRadius: '16px', cursor: 'pointer', color: '#636E72', fontSize: '14px' },
  mForm: { padding: '16px 20px 0' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '500', color: '#636E72', marginBottom: '6px' },
  input: { width: '100%', padding: '12px 14px', border: '1px solid #E1E8ED', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: FONT },
  prioGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  prioBtn: { width: '100%', padding: '10px 14px', border: '2px solid', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', textAlign: 'left', fontFamily: FONT, transition: 'all 0.1s' },
  mBtns: { display: 'flex', gap: '12px', padding: '8px 20px 0' },
  cancelBtn: { flex: 1, padding: '14px', border: '1px solid #E1E8ED', backgroundColor: 'white', borderRadius: '10px', fontSize: '15px', cursor: 'pointer', color: '#636E72', fontFamily: FONT },
  saveBtn: { flex: 1, padding: '14px', border: 'none', backgroundColor: ACCENT, borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', color: 'white', fontFamily: FONT },
};
