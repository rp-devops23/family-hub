import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const ACCENT = '#27AE60';

export default function CorveesPage({ onHome }) {
  const { user, language, toggleLanguage, signOut, t } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formName, setFormName] = useState('');
  const [formExpires, setFormExpires] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', 'chore')
      .order('done', { ascending: true })
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
      category: 'chore',
      expires_at: formExpires || null,
      updated_at: new Date().toISOString(),
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
    setFormExpires(task?.expires_at ?? '');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTask(null);
    setFormName('');
    setFormExpires('');
  }

  function expiryStatus(d) {
    if (!d) return 'none';
    const diff = new Date(d) - new Date(new Date().toDateString());
    if (diff < 0) return 'overdue';
    if (diff <= 3 * 86400000) return 'soon';
    return 'ok';
  }

  function fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
  }

  const pending = tasks.filter(t => !t.done).length;

  return (
    <div style={s.wrapper}>
      <div style={s.container}>
        <header style={s.header}>
          <div style={s.hLeft}>
            <button onClick={onHome} style={s.iconBtn}>🏠</button>
            <span style={s.hIcon}>🧹</span>
            <span style={s.hTitle}>{t('Corvées', 'Chores')}</span>
            {pending > 0 && <span style={s.badge}>{pending}</span>}
          </div>
          <div style={s.hRight}>
            <button onClick={toggleLanguage} style={s.iconBtn}>{language === 'fr' ? 'EN 🇬🇧' : 'FR 🇫🇷'}</button>
            <button onClick={signOut} style={s.iconBtn}>🚪</button>
          </div>
        </header>

        <div style={s.list}>
          {loading ? (
            <p style={s.empty}>{t('Chargement…', 'Loading…')}</p>
          ) : tasks.length === 0 ? (
            <div style={s.emptyCard}>
              <p style={s.emptyIcon}>🧹</p>
              <p style={s.emptyText}>{t('Aucune corvée — tout est propre !', 'No chores — all clean!')}</p>
            </div>
          ) : tasks.map(task => {
            const st = expiryStatus(task.expires_at);
            return (
              <div key={task.id} style={{ ...s.row, opacity: task.done ? 0.5 : 1 }}>
                <button onClick={() => toggleDone(task)} style={s.check}>{task.done ? '✅' : '⬜'}</button>
                <div style={s.content}>
                  <span style={{ ...s.name, textDecoration: task.done ? 'line-through' : 'none' }}>{task.name}</span>
                  {task.expires_at && (
                    <span style={{ fontSize: '12px', color: st === 'overdue' ? '#E74C3C' : st === 'soon' ? '#E67E22' : '#636E72' }}>
                      {st === 'overdue' ? '⚠️' : st === 'soon' ? '⏰' : '📅'} {fmtDate(task.expires_at)}
                    </span>
                  )}
                </div>
                <div style={s.actions}>
                  <button onClick={() => openForm(task)} style={s.btn}>✏️</button>
                  <button onClick={() => del(task.id)} style={s.btn}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={() => openForm()} style={s.fab}>
          <span style={{ fontSize: '24px', lineHeight: 1 }}>+</span>
        </button>

        {showForm && (
          <div style={s.overlay} onClick={closeForm}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
              <div style={s.mHeader}>
                <h2 style={s.mTitle}>{editingTask ? t('Modifier', 'Edit') : t('Nouvelle corvée', 'New chore')}</h2>
                <button onClick={closeForm} style={s.closeBtn}>✕</button>
              </div>
              <div style={s.mForm}>
                <div style={s.field}>
                  <label style={s.label}>{t('Nom', 'Name')} *</label>
                  <input autoFocus type="text" value={formName} onChange={e => setFormName(e.target.value)}
                    placeholder={t('Ex: Passer l\'aspirateur', 'Ex: Vacuum')} style={s.input} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>{t('À faire avant (optionnel)', 'Due date (optional)')}</label>
                  <input type="date" value={formExpires} onChange={e => setFormExpires(e.target.value)} style={s.input} />
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
  wrapper: { width: '100%', minHeight: '100vh', backgroundColor: '#F0FFF4', display: 'flex', justifyContent: 'center', fontFamily: FONT },
  container: { width: '100%', maxWidth: '600px', minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F0FFF4' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'white', borderBottom: '1px solid #C3E6CB', position: 'sticky', top: 0, zIndex: 10 },
  hLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  hRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  hIcon: { fontSize: '22px' },
  hTitle: { fontSize: '18px', fontWeight: '700', color: '#2D3436' },
  badge: { backgroundColor: ACCENT, color: 'white', fontSize: '11px', fontWeight: '700', minWidth: '18px', height: '18px', borderRadius: '9px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' },
  iconBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px', border: '1px solid #E1E8ED', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', fontFamily: FONT },
  list: { flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '100px' },
  emptyCard: { backgroundColor: 'white', borderRadius: '12px', padding: '40px 20px', textAlign: 'center' },
  emptyIcon: { fontSize: '48px', margin: '0 0 12px' },
  emptyText: { color: '#636E72', fontSize: '15px', margin: 0 },
  empty: { textAlign: 'center', color: '#636E72', padding: '40px 0' },
  row: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'white', borderRadius: '12px', padding: '12px 14px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' },
  check: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', flexShrink: 0, padding: 0, lineHeight: 1 },
  content: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
  name: { fontSize: '15px', fontWeight: '500', color: '#2D3436' },
  actions: { display: 'flex', gap: '4px', flexShrink: 0 },
  btn: { width: '30px', height: '30px', border: '1px solid #E1E8ED', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'fixed', bottom: '24px', right: 'max(20px, calc(50% - 280px))', width: '56px', height: '56px', borderRadius: '28px', backgroundColor: ACCENT, color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(39,174,96,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 200 },
  modal: { backgroundColor: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '500px', paddingBottom: '24px', maxHeight: '90vh', overflowY: 'auto' },
  mHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 0' },
  mTitle: { margin: 0, fontSize: '18px', fontWeight: '600', color: '#2D3436' },
  closeBtn: { width: '32px', height: '32px', border: 'none', backgroundColor: '#F5F7FA', borderRadius: '16px', cursor: 'pointer', color: '#636E72', fontSize: '14px' },
  mForm: { padding: '16px 20px 0' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '500', color: '#636E72', marginBottom: '6px' },
  input: { width: '100%', padding: '12px 14px', border: '1px solid #E1E8ED', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: FONT },
  mBtns: { display: 'flex', gap: '12px', padding: '0 20px' },
  cancelBtn: { flex: 1, padding: '14px', border: '1px solid #E1E8ED', backgroundColor: 'white', borderRadius: '10px', fontSize: '15px', cursor: 'pointer', color: '#636E72', fontFamily: FONT },
  saveBtn: { flex: 1, padding: '14px', border: 'none', backgroundColor: ACCENT, borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', color: 'white', fontFamily: FONT },
};
