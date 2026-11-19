import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  personTotals, groupTotals, eventTotals, share, nextStatus, parseMoney, splitNames,
  parseQuickIdea, toBuyByStore, nextYearName, nextYearDate, ideaAmount,
} from './lib/giftMath';

// ============================================================================
// PLANIFICATEUR DE CADEAUX — événement → groupes libres → personnes → idées
// Budgets facultatifs par personne, par groupe et pour l'événement.
// ============================================================================

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const ACCENT = '#E74C3C';
const C = { bought: '#27AE60', decided: '#E67E22', idea: '#B2BEC3', text: '#2D3436', muted: '#636E72', line: '#F1D5D5' };
const STATUS_ICON = { idea: '💡', decided: '🛒', bought: '✅' };
const LAST_EVENT_KEY = 'familyhub.giftEvent';

const eur = (n) => (n == null ? '—' : new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n));
const daysUntil = (d) => (d ? Math.ceil((new Date(d) - new Date(new Date().toDateString())) / 86400000) : null);
const readLast = () => { try { return localStorage.getItem(LAST_EVENT_KEY); } catch { return null; } };
const writeLast = (v) => { try { localStorage.setItem(LAST_EVENT_KEY, v); } catch { /* stockage indisponible */ } };

export default function GiftPlanner({ user, t, language }) {
  const [data, setData] = useState({ events: [], groups: [], people: [], ideas: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventId, setEventId] = useState(readLast());
  const [view, setView] = useState('people'); // people | buy
  const [collapsed, setCollapsed] = useState({});
  const [sheet, setSheet] = useState(null); // { title, fields, values, onSave, onDelete?, extra? }

  useEffect(() => {
    let cancelled = false;
    const q = (table, order) => supabase.from(table).select('*').eq('user_id', user.id).order(order, { ascending: true });
    Promise.all([q('gift_events', 'sort_order'), q('gift_groups', 'sort_order'), q('gift_people', 'sort_order'), q('gift_ideas', 'created_at')]).then(([e, g, p, i]) => {
      if (cancelled) return;
      const failed = [e, g, p, i].find((r) => r.error);
      if (failed) setError(failed.error.message);
      setData({ events: e.data ?? [], groups: g.data ?? [], people: p.data ?? [], ideas: i.data ?? [] });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user.id]);

  const { events, groups, people, ideas } = data;
  const event = events.find((e) => e.id === eventId) ?? events[0] ?? null;
  const eventGroups = useMemo(() => (event ? groups.filter((g) => g.event_id === event.id) : []), [groups, event]);
  const totals = useMemo(() => (event ? eventTotals(event, groups, people, ideas) : null), [event, groups, people, ideas]);

  // ---- Écritures : on met l'état à jour avec la ligne renvoyée par Supabase ----------------
  const run = async (promise) => {
    const { data: row, error: err } = await promise;
    if (err) { setError(err.message); return null; }
    setError('');
    return row;
  };
  const put = (key, row) => setData((d) => ({ ...d, [key]: d[key].some((r) => r.id === row.id) ? d[key].map((r) => (r.id === row.id ? row : r)) : [...d[key], row] }));
  const drop = (key, id) => setData((d) => ({ ...d, [key]: d[key].filter((r) => r.id !== id) }));
  const insert = async (table, key, values) => { const row = await run(supabase.from(table).insert({ ...values, user_id: user.id }).select().single()); if (row) put(key, row); return row; };
  const update = async (table, key, id, values) => { const row = await run(supabase.from(table).update(values).eq('id', id).eq('user_id', user.id).select().single()); if (row) put(key, row); return row; };
  const remove = async (table, key, id, message) => {
    if (message && !window.confirm(message)) return;
    const { error: err } = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id);
    if (err) setError(err.message); else drop(key, id);
  };
  const closeSheet = () => setSheet(null);

  const chooseEvent = (id) => { setEventId(id); writeLast(id); };

  // ---- Événements ---------------------------------------------------------------------------
  const eventFields = [
    { key: 'name', label: t('Nom', 'Name'), placeholder: t('Ex : Noël 2026', 'Ex: Christmas 2026'), required: true },
    { key: 'event_date', label: t('Date', 'Date'), type: 'date' },
    { key: 'total_budget', label: t('Budget total (€) — facultatif', 'Total budget (€) — optional'), type: 'money', hint: t('Vide = somme des budgets des groupes', 'Empty = sum of group budgets') },
  ];
  const openEvent = (ev = null) => setSheet({
    title: ev ? t('Modifier l’événement', 'Edit event') : t('Nouvel événement', 'New event'),
    fields: eventFields,
    values: { name: ev?.name ?? '', event_date: ev?.event_date ?? '', total_budget: ev?.total_budget ?? '' },
    onSave: async (v) => {
      const values = { name: v.name.trim(), event_date: v.event_date || null, total_budget: parseMoney(v.total_budget) };
      const row = ev ? await update('gift_events', 'events', ev.id, values) : await insert('gift_events', 'events', { ...values, sort_order: events.length });
      if (row) { chooseEvent(row.id); closeSheet(); }
    },
    onDelete: ev ? () => { remove('gift_events', 'events', ev.id, t(`Supprimer « ${ev.name} » avec ses groupes, personnes et idées ?`, `Delete “${ev.name}” with all its groups, people and ideas?`)).then(() => { setEventId(null); closeSheet(); }); } : null,
    extra: ev ? { label: t('📋 Copier pour l’an prochain', '📋 Copy for next year'), action: () => copyEvent(ev) } : null,
  });

  async function copyEvent(ev) {
    const copy = await insert('gift_events', 'events', { name: nextYearName(ev.name), event_date: nextYearDate(ev.event_date), total_budget: ev.total_budget, sort_order: events.length });
    if (!copy) return;
    for (const g of groups.filter((x) => x.event_id === ev.id)) {
      const ng = await insert('gift_groups', 'groups', { event_id: copy.id, name: g.name, budget: g.budget, sort_order: g.sort_order });
      if (!ng) return;
      for (const p of people.filter((x) => x.group_id === g.id)) {
        await insert('gift_people', 'people', { group_id: ng.id, name: p.name, budget: p.budget, notes: p.notes, sort_order: p.sort_order });
      }
    }
    chooseEvent(copy.id); closeSheet();
  }

  // ---- Groupes ------------------------------------------------------------------------------
  const openGroup = (g = null) => setSheet({
    title: g ? t('Modifier le groupe', 'Edit group') : t('Nouveau groupe', 'New group'),
    fields: [
      { key: 'name', label: t('Nom', 'Name'), placeholder: t('Ex : Famille Ricky, Amis, Collègues…', 'Ex: Family, Friends, Colleagues…'), required: true },
      { key: 'budget', label: t('Budget du groupe (€) — facultatif', 'Group budget (€) — optional'), type: 'money', hint: t('Vide = somme des budgets des personnes', 'Empty = sum of people budgets') },
    ],
    values: { name: g?.name ?? '', budget: g?.budget ?? '' },
    onSave: async (v) => {
      const values = { name: v.name.trim(), budget: parseMoney(v.budget) };
      const row = g ? await update('gift_groups', 'groups', g.id, values) : await insert('gift_groups', 'groups', { ...values, event_id: event.id, sort_order: eventGroups.length });
      if (row) closeSheet();
    },
    onDelete: g ? () => { remove('gift_groups', 'groups', g.id, t(`Supprimer le groupe « ${g.name} » avec ses personnes et idées ?`, `Delete group “${g.name}” with its people and ideas?`)).then(closeSheet); } : null,
  });

  // ---- Personnes ----------------------------------------------------------------------------
  const openPeople = (g) => setSheet({
    title: t(`Ajouter des personnes — ${g.name}`, `Add people — ${g.name}`),
    fields: [
      { key: 'names', label: t('Prénoms (séparés par une virgule ou une ligne)', 'Names (comma or line separated)'), type: 'textarea', placeholder: t('Mamie, Papi, Oncle Jean', 'Grandma, Grandpa, Uncle Jean'), required: true },
      { key: 'budget', label: t('Budget par personne (€) — facultatif', 'Budget per person (€) — optional'), type: 'money' },
    ],
    values: { names: '', budget: '' },
    onSave: async (v) => {
      const existing = people.filter((p) => p.group_id === g.id).map((p) => p.name);
      const names = splitNames(v.names, existing);
      const budget = parseMoney(v.budget);
      let order = existing.length;
      for (const name of names) await insert('gift_people', 'people', { group_id: g.id, name, budget, sort_order: order++ });
      closeSheet();
    },
  });

  const openPerson = (p) => setSheet({
    title: t('Modifier la personne', 'Edit person'),
    fields: [
      { key: 'name', label: t('Nom', 'Name'), required: true },
      { key: 'budget', label: t('Budget (€) — facultatif', 'Budget (€) — optional'), type: 'money' },
      { key: 'notes', label: t('Notes (goûts, tailles…)', 'Notes (tastes, sizes…)'), type: 'textarea' },
    ],
    values: { name: p.name, budget: p.budget ?? '', notes: p.notes ?? '' },
    onSave: async (v) => { if (await update('gift_people', 'people', p.id, { name: v.name.trim(), budget: parseMoney(v.budget), notes: v.notes.trim() || null })) closeSheet(); },
    onDelete: () => { remove('gift_people', 'people', p.id, t(`Supprimer ${p.name} et ses idées ?`, `Delete ${p.name} and their ideas?`)).then(closeSheet); },
  });

  // ---- Idées --------------------------------------------------------------------------------
  const addIdea = (person, text) => {
    const { title, price } = parseQuickIdea(text);
    if (!title) return;
    return insert('gift_ideas', 'ideas', { person_id: person.id, title, estimated_price: price });
  };
  const cycleIdea = (idea) => {
    const status = nextStatus(idea.status);
    const patch = { status, updated_at: new Date().toISOString() };
    // En passant à « acheté », le prix réel démarre à l'estimation
    if (status === 'bought' && idea.actual_price == null && idea.estimated_price != null) patch.actual_price = idea.estimated_price;
    update('gift_ideas', 'ideas', idea.id, patch);
  };
  const openIdea = (idea) => setSheet({
    title: t('Modifier l’idée', 'Edit idea'),
    fields: [
      { key: 'title', label: t('Cadeau', 'Gift'), required: true },
      { key: 'status', label: t('Statut', 'Status'), type: 'status' },
      { key: 'estimated_price', label: t('Prix estimé (€)', 'Estimated price (€)'), type: 'money' },
      { key: 'actual_price', label: t('Prix payé (€)', 'Price paid (€)'), type: 'money' },
      { key: 'store', label: t('Magasin', 'Store'), placeholder: t('Ex : Fnac, Amazon…', 'Ex: Fnac, Amazon…') },
      { key: 'url', label: t('Lien', 'Link'), placeholder: 'https://…' },
      { key: 'notes', label: t('Notes', 'Notes'), type: 'textarea' },
    ],
    values: { title: idea.title, status: idea.status, estimated_price: idea.estimated_price ?? '', actual_price: idea.actual_price ?? '', store: idea.store ?? '', url: idea.url ?? '', notes: idea.notes ?? '' },
    onSave: async (v) => {
      const row = await update('gift_ideas', 'ideas', idea.id, {
        title: v.title.trim(), status: v.status, estimated_price: parseMoney(v.estimated_price), actual_price: parseMoney(v.actual_price),
        store: v.store.trim() || null, url: v.url.trim() || null, notes: v.notes.trim() || null, updated_at: new Date().toISOString(),
      });
      if (row) closeSheet();
    },
    onDelete: () => { remove('gift_ideas', 'ideas', idea.id).then(closeSheet); },
  });

  if (loading) return <p style={s.muted}>{t('Chargement…', 'Loading…')}</p>;

  return (
    <div style={s.root}>
      {error && (
        <div style={s.error}>
          ⚠️ {/relation .* does not exist|schema cache|Could not find the table/i.test(error)
            ? t('Les tables du planificateur ne sont pas encore créées dans Supabase (migration gift_planner.sql).', 'Planner tables are not created in Supabase yet (gift_planner.sql migration).')
            : error}
        </div>
      )}

      {events.length === 0 ? (
        <div style={s.emptyCard}>
          <p style={{ fontSize: 48, margin: '0 0 8px' }}>🎄</p>
          <p style={s.emptyTitle}>{t('Prépare tes cadeaux', 'Plan your gifts')}</p>
          <p style={s.muted}>{t('Crée un événement (ex. Noël 2026), ajoute des groupes — famille, amis… — puis les personnes à gâter. Les idées et les budgets viennent ensuite, à ton rythme.', 'Create an event (e.g. Christmas 2026), add groups — family, friends… — then the people. Ideas and budgets come later, at your pace.')}</p>
          <button style={s.primary} onClick={() => openEvent()}>{t('Créer un événement', 'Create an event')}</button>
        </div>
      ) : (
        <>
          <EventBar events={events} event={event} onChoose={chooseEvent} onEdit={() => openEvent(event)} onNew={() => openEvent()} t={t} language={language} />
          <Summary totals={totals} t={t} />

          <div style={s.viewTabs}>
            {[['people', t('👥 Personnes', '👥 People')], ['buy', t('🛒 À acheter', '🛒 To buy')]].map(([k, label]) => (
              <button key={k} onClick={() => setView(k)} style={{ ...s.viewTab, ...(view === k ? s.viewTabOn : {}) }}>{label}</button>
            ))}
          </div>

          {view === 'buy' ? (
            <ToBuy event={event} groups={groups} people={people} ideas={ideas} onBought={cycleIdea} onEdit={openIdea} t={t} />
          ) : (
            <>
              {eventGroups.length === 0 && <p style={s.muted}>{t('Aucun groupe pour l’instant : ajoutes-en un ci-dessous.', 'No group yet: add one below.')}</p>}
              {eventGroups.map((g) => {
                const gt = groupTotals(g, people, ideas);
                const open = !collapsed[g.id];
                return (
                  <section key={g.id} style={s.group}>
                    <div style={s.groupHead}>
                      <button style={s.groupToggle} onClick={() => setCollapsed((c) => ({ ...c, [g.id]: open }))} aria-expanded={open}>
                        <span style={{ fontSize: 12, color: C.muted }}>{open ? '▾' : '▸'}</span>
                        <span style={s.groupName}>{g.name}</span>
                        <span style={s.count}>{gt.peopleCount}</span>
                      </button>
                      <button style={s.ghost} onClick={() => openGroup(g)} aria-label={t('Modifier le groupe', 'Edit group')}>✏️</button>
                    </div>
                    <BudgetLine t={t} totals={gt} />
                    {gt.allocationOver && <p style={s.warn}>⚠️ {t(`Budgets des personnes (${eur(gt.personBudgetSum)}) > budget du groupe (${eur(gt.ownBudget)})`, `People budgets (${eur(gt.personBudgetSum)}) > group budget (${eur(gt.ownBudget)})`)}</p>}
                    {open && (
                      <>
                        {people.filter((p) => p.group_id === g.id).map((p) => (
                          <PersonCard key={p.id} person={p} ideas={ideas.filter((i) => i.person_id === p.id)} totals={personTotals(p, ideas)}
                            onEdit={() => openPerson(p)} onAdd={(text) => addIdea(p, text)} onCycle={cycleIdea} onOpenIdea={openIdea} t={t} />
                        ))}
                        <button style={s.addLink} onClick={() => openPeople(g)}>＋ {t('Ajouter des personnes', 'Add people')}</button>
                      </>
                    )}
                  </section>
                );
              })}
              <button style={s.addGroup} onClick={() => openGroup()}>＋ {t('Nouveau groupe', 'New group')}</button>
            </>
          )}
        </>
      )}

      {sheet && <Sheet sheet={sheet} onClose={closeSheet} t={t} />}
    </div>
  );
}

// ---- Sélecteur d'événement + compte à rebours ------------------------------------------------
function EventBar({ events, event, onChoose, onEdit, onNew, t, language }) {
  const days = daysUntil(event.event_date);
  const date = event.event_date ? new Date(event.event_date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long' }) : null;
  return (
    <div style={s.eventBar}>
      <div style={s.chips}>
        {events.map((e) => (
          <button key={e.id} onClick={() => onChoose(e.id)} style={{ ...s.chip, ...(e.id === event.id ? s.chipOn : {}) }}>{e.name}</button>
        ))}
        <button onClick={onNew} style={s.chipAdd} aria-label={t('Nouvel événement', 'New event')}>＋</button>
      </div>
      <div style={s.eventMeta}>
        <span>{date ? `📅 ${date}` : t('Pas de date', 'No date')}{days !== null && days >= 0 && ` · ${t(`dans ${days} j`, `in ${days} d`)}`}{days !== null && days < 0 && ` · ${t('passé', 'past')}`}</span>
        <button style={s.ghost} onClick={onEdit} aria-label={t('Modifier l’événement', 'Edit event')}>✏️</button>
      </div>
    </div>
  );
}

// ---- Carte de synthèse : budget + barre segmentée ---------------------------------------------
function Summary({ totals, t }) {
  const base = totals.budget ?? Math.max(totals.withIdeas, 1);
  return (
    <div style={s.summary}>
      <div style={s.sumTop}>
        <div>
          <div style={s.sumLabel}>{t('Engagé (acheté + décidé)', 'Committed (bought + decided)')}</div>
          <div style={s.sumBig}>{eur(totals.firm)}{totals.budget != null && <span style={s.sumOf}> / {eur(totals.budget)}</span>}</div>
        </div>
        {totals.remaining != null && (
          <div style={{ textAlign: 'right' }}>
            <div style={s.sumLabel}>{totals.remaining >= 0 ? t('Reste', 'Left') : t('Dépassement', 'Over')}</div>
            <div style={{ ...s.sumBig, color: totals.remaining >= 0 ? C.bought : ACCENT }}>{eur(Math.abs(totals.remaining))}</div>
          </div>
        )}
      </div>
      <SegBar parts={[[totals.bought, C.bought], [totals.decided, C.decided], [totals.idea, C.idea]]} base={base} />
      <div style={s.legend}>
        <span><i style={{ ...s.dot, background: C.bought }} />{t('Acheté', 'Bought')} {eur(totals.bought)}</span>
        <span><i style={{ ...s.dot, background: C.decided }} />{t('Décidé', 'Decided')} {eur(totals.decided)}</span>
        <span><i style={{ ...s.dot, background: C.idea }} />{t('Idées', 'Ideas')} {eur(totals.idea)}</span>
      </div>
      {totals.budget == null && <p style={s.hint}>{t('Astuce : fixe un budget sur l’événement, un groupe ou une personne pour suivre ce qu’il reste.', 'Tip: set a budget on the event, a group or a person to track what’s left.')}</p>}
      {totals.allocationOver && <p style={s.warn}>⚠️ {t(`Les budgets des groupes (${eur(totals.groupBudgetSum)}) dépassent le budget total (${eur(totals.ownBudget)}).`, `Group budgets (${eur(totals.groupBudgetSum)}) exceed the total budget (${eur(totals.ownBudget)}).`)}</p>}
      {totals.withoutIdea > 0 && <p style={s.hint}>🎯 {t(`${totals.withoutIdea} personne(s) sans idée pour l’instant`, `${totals.withoutIdea} person(s) without an idea yet`)}</p>}
    </div>
  );
}

function SegBar({ parts, base, height = 8 }) {
  // Chaque segment est borné à ce qu'il reste de la barre (le total ne dépasse jamais 100 %)
  const widths = parts.reduce((acc, [value]) => {
    const taken = acc.reduce((a, w) => a + w, 0);
    return [...acc, Math.min(share(value, base), Math.max(0, 1 - taken))];
  }, []);
  return (
    <div style={{ ...s.bar, height }} role="img" aria-label="progress">
      {parts.map(([, color], i) => (widths[i] > 0 ? <div key={i} style={{ width: `${widths[i] * 100}%`, background: color }} /> : null))}
    </div>
  );
}

function BudgetLine({ totals, t }) {
  const base = totals.budget ?? Math.max(totals.withIdeas, 1);
  return (
    <div style={{ marginBottom: 8 }}>
      <SegBar parts={[[totals.bought, C.bought], [totals.decided, C.decided], [totals.idea, C.idea]]} base={base} height={6} />
      <div style={s.lineText}>
        <span>{eur(totals.firm)}{totals.budget != null ? ` / ${eur(totals.budget)}` : ''}</span>
        {totals.remaining != null && <span style={{ color: totals.over ? ACCENT : C.muted }}>{totals.over ? t(`+${eur(-totals.remaining)} de trop`, `${eur(-totals.remaining)} over`) : t(`reste ${eur(totals.remaining)}`, `${eur(totals.remaining)} left`)}</span>}
      </div>
    </div>
  );
}

// ---- Carte personne -------------------------------------------------------------------------
function PersonCard({ person, ideas, totals, onEdit, onAdd, onCycle, onOpenIdea, t }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    await onAdd(text);
    setText(''); setBusy(false);
  };
  return (
    <div style={s.person}>
      <div style={s.personHead}>
        <button style={s.personName} onClick={onEdit}>{person.name}</button>
        {totals.budget != null && (
          <span style={{ ...s.badge, ...(totals.over ? s.badgeOver : {}) }}>
            {totals.over ? t(`+${eur(-totals.remaining)}`, `+${eur(-totals.remaining)}`) : t(`reste ${eur(totals.remaining)}`, `${eur(totals.remaining)} left`)} · {eur(totals.budget)}
          </span>
        )}
      </div>
      {ideas.length === 0 && <p style={s.noIdea}>{t('Pas encore d’idée', 'No idea yet')}</p>}
      <div style={s.ideas}>
        {ideas.map((i) => (
          <div key={i.id} style={{ ...s.idea, ...(i.status === 'idea' ? s.ideaIdea : i.status === 'decided' ? s.ideaDecided : s.ideaBought) }}>
            <button style={s.ideaStatus} onClick={() => onCycle(i)} aria-label={t('Changer le statut', 'Change status')}>{STATUS_ICON[i.status]}</button>
            <button style={s.ideaTitle} onClick={() => onOpenIdea(i)}>
              <span style={{ textDecoration: i.status === 'bought' ? 'line-through' : 'none' }}>{i.title}</span>
              {ideaAmount(i) > 0 && <span style={s.ideaPrice}> {eur(ideaAmount(i))}</span>}
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={submit} style={s.quick}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Ajouter une idée (ex : Foulard 30)', 'Add an idea (e.g. Scarf 30)')} style={s.quickInput} aria-label={t('Ajouter une idée', 'Add an idea')} />
        <button type="submit" disabled={!text.trim() || busy} style={{ ...s.quickBtn, opacity: text.trim() ? 1 : 0.4 }}>＋</button>
      </form>
    </div>
  );
}

// ---- Vue « À acheter » par magasin -----------------------------------------------------------
function ToBuy({ event, groups, people, ideas, onBought, onEdit, t }) {
  const stores = toBuyByStore(event, groups, people, ideas);
  if (stores.length === 0) return <div style={s.emptyCard}><p style={s.muted}>{t('Rien à acheter pour l’instant. Touche 💡 sur une idée pour la passer en 🛒 « décidé ».', 'Nothing to buy yet. Tap 💡 on an idea to move it to 🛒 “decided”.')}</p></div>;
  return stores.map(({ store, items, total }) => (
    <section key={store || '_'} style={s.group}>
      <div style={s.groupHead}><span style={{ ...s.groupName, flex: 1 }}>{store || t('Magasin à choisir', 'Store to pick')}</span><span style={s.count}>{eur(total)}</span></div>
      {items.map((i) => (
        <div key={i.id} style={s.buyRow}>
          <button style={s.ideaStatus} onClick={() => onBought(i)} aria-label={t('Marquer acheté', 'Mark bought')}>🛒</button>
          <button style={s.buyMain} onClick={() => onEdit(i)}>
            <span>{i.title}</span><span style={s.buyWho}>{i.person.name}</span>
          </button>
          <span style={s.ideaPrice}>{i.estimated_price != null ? eur(i.estimated_price) : ''}</span>
        </div>
      ))}
    </section>
  ));
}

// ---- Feuille de formulaire générique -------------------------------------------------------
function Sheet({ sheet, onClose, t }) {
  const [values, setValues] = useState(sheet.values);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setValues((x) => ({ ...x, [k]: v }));
  const missing = sheet.fields.some((f) => f.required && !String(values[f.key] ?? '').trim());
  const save = async () => { setSaving(true); await sheet.onSave(values); setSaving(false); };
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={sheet.title}>
        <div style={s.mHead}><h2 style={s.mTitle}>{sheet.title}</h2><button style={s.close} onClick={onClose} aria-label={t('Fermer', 'Close')}>✕</button></div>
        <div style={s.mBody}>
          {sheet.fields.map((f, idx) => (
            <label key={f.key} style={s.field}>
              <span style={s.label}>{f.label}{f.required && ' *'}</span>
              {f.type === 'textarea' ? (
                <textarea rows={3} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} style={{ ...s.input, resize: 'vertical' }} autoFocus={idx === 0} />
              ) : f.type === 'status' ? (
                <div style={s.statusRow}>
                  {['idea', 'decided', 'bought'].map((st) => (
                    <button key={st} type="button" onClick={() => set(f.key, st)} style={{ ...s.statusBtn, ...(values[f.key] === st ? s.statusOn : {}) }}>
                      {STATUS_ICON[st]} {st === 'idea' ? t('Idée', 'Idea') : st === 'decided' ? t('Décidé', 'Decided') : t('Acheté', 'Bought')}
                    </button>
                  ))}
                </div>
              ) : (
                <input type={f.type === 'date' ? 'date' : 'text'} inputMode={f.type === 'money' ? 'decimal' : undefined} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.type === 'money' ? '€' : f.placeholder} style={s.input} autoFocus={idx === 0} />
              )}
              {f.hint && <span style={s.fieldHint}>{f.hint}</span>}
            </label>
          ))}
          {sheet.extra && <button type="button" style={s.extra} onClick={sheet.extra.action}>{sheet.extra.label}</button>}
          {sheet.onDelete && <button type="button" style={s.danger} onClick={sheet.onDelete}>🗑️ {t('Supprimer', 'Delete')}</button>}
        </div>
        <div style={s.mBtns}>
          <button style={s.cancel} onClick={onClose}>{t('Annuler', 'Cancel')}</button>
          <button style={{ ...s.save, opacity: saving || missing ? 0.5 : 1 }} disabled={saving || missing} onClick={save}>{saving ? '…' : t('Enregistrer', 'Save')}</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  root: { padding: '12px 16px 100px', fontFamily: FONT, color: C.text },
  muted: { color: C.muted, fontSize: 14, lineHeight: 1.5, margin: '8px 0', textAlign: 'center' },
  error: { background: '#FDECEA', color: '#922B21', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 10 },
  emptyCard: { background: 'white', borderRadius: 16, padding: '32px 20px', textAlign: 'center', marginTop: 8 },
  emptyTitle: { fontSize: 18, fontWeight: 700, margin: '0 0 6px' },
  primary: { marginTop: 12, padding: '13px 22px', border: 'none', borderRadius: 12, background: ACCENT, color: 'white', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: FONT },
  eventBar: { marginBottom: 10 },
  chips: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 },
  chip: { flexShrink: 0, padding: '8px 14px', borderRadius: 18, border: `1px solid ${C.line}`, background: 'white', fontSize: 14, fontWeight: 600, color: C.muted, cursor: 'pointer', fontFamily: FONT },
  chipOn: { background: ACCENT, borderColor: ACCENT, color: 'white' },
  chipAdd: { flexShrink: 0, width: 36, borderRadius: 18, border: `1px dashed ${C.idea}`, background: 'transparent', fontSize: 16, color: C.muted, cursor: 'pointer' },
  eventMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: C.muted, padding: '0 2px' },
  ghost: { border: 'none', background: 'none', cursor: 'pointer', fontSize: 15, padding: '6px 8px' },
  summary: { background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: 12 },
  sumTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10, gap: 12 },
  sumLabel: { fontSize: 12, color: C.muted },
  sumBig: { fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' },
  sumOf: { fontSize: 15, fontWeight: 600, color: C.muted },
  bar: { display: 'flex', borderRadius: 6, background: '#F1F2F4', overflow: 'hidden' },
  legend: { display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: C.muted, marginTop: 8 },
  dot: { display: 'inline-block', width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  hint: { fontSize: 12, color: C.muted, margin: '8px 0 0' },
  warn: { fontSize: 12, color: '#B9770E', background: '#FEF5E7', borderRadius: 8, padding: '6px 10px', margin: '8px 0 0' },
  viewTabs: { display: 'flex', gap: 6, background: '#F6E4E4', padding: 4, borderRadius: 12, marginBottom: 12 },
  viewTab: { flex: 1, padding: '9px 6px', border: 'none', borderRadius: 9, background: 'transparent', fontSize: 14, fontWeight: 600, color: C.muted, cursor: 'pointer', fontFamily: FONT },
  viewTabOn: { background: 'white', color: ACCENT, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  group: { background: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: '10px 10px 12px', marginBottom: 12, border: `1px solid ${C.line}` },
  groupHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  groupToggle: { flex: 1, display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', cursor: 'pointer', padding: '6px 4px', textAlign: 'left', fontFamily: FONT },
  groupName: { fontSize: 16, fontWeight: 700, color: C.text },
  count: { fontSize: 12, fontWeight: 700, color: C.muted, background: '#F1F2F4', borderRadius: 10, padding: '2px 8px' },
  lineText: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, marginTop: 4 },
  addLink: { border: 'none', background: 'none', color: ACCENT, fontWeight: 600, fontSize: 14, padding: '8px 4px', cursor: 'pointer', fontFamily: FONT },
  addGroup: { width: '100%', padding: 14, border: `1.5px dashed ${ACCENT}`, borderRadius: 14, background: 'transparent', color: ACCENT, fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: FONT },
  person: { background: 'white', borderRadius: 14, padding: '12px 12px 10px', marginBottom: 8, boxShadow: '0 1px 5px rgba(0,0,0,0.05)' },
  personHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  personName: { border: 'none', background: 'none', fontSize: 16, fontWeight: 700, color: C.text, padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: FONT },
  badge: { fontSize: 12, fontWeight: 600, color: C.bought, background: '#E8F8EF', borderRadius: 10, padding: '3px 9px', whiteSpace: 'nowrap' },
  badgeOver: { color: ACCENT, background: '#FDECEA' },
  noIdea: { fontSize: 13, color: C.idea, fontStyle: 'italic', margin: '0 0 6px' },
  ideas: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  idea: { display: 'flex', alignItems: 'center', borderRadius: 18, borderWidth: 1, borderStyle: 'solid', maxWidth: '100%' },
  ideaIdea: { background: '#F6F7F8', borderColor: '#DFE3E6', borderStyle: 'dashed' },
  ideaDecided: { background: '#FEF3E7', borderColor: '#F5CBA7' },
  ideaBought: { background: '#E8F8EF', borderColor: '#A9DFBF' },
  ideaStatus: { border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, padding: '7px 4px 7px 10px', lineHeight: 1 },
  ideaTitle: { border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: C.text, padding: '7px 12px 7px 2px', textAlign: 'left', fontFamily: FONT, overflow: 'hidden', textOverflow: 'ellipsis' },
  ideaPrice: { fontSize: 12, fontWeight: 700, color: C.muted, whiteSpace: 'nowrap' },
  quick: { display: 'flex', gap: 6 },
  quickInput: { flex: 1, minWidth: 0, padding: '9px 12px', border: '1px solid #E8ECEF', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: FONT, background: '#FAFBFC' },
  quickBtn: { width: 40, border: 'none', borderRadius: 10, background: ACCENT, color: 'white', fontSize: 18, cursor: 'pointer' },
  buyRow: { display: 'flex', alignItems: 'center', gap: 4, background: 'white', borderRadius: 12, padding: '4px 12px 4px 2px', marginBottom: 6 },
  buyMain: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', border: 'none', background: 'none', cursor: 'pointer', padding: '8px 4px', fontSize: 15, color: C.text, fontFamily: FONT, textAlign: 'left' },
  buyWho: { fontSize: 12, color: C.muted },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 200 },
  modal: { background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 500, maxHeight: '92vh', display: 'flex', flexDirection: 'column' },
  mHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 0' },
  mTitle: { margin: 0, fontSize: 18, fontWeight: 700 },
  close: { width: 32, height: 32, border: 'none', background: '#F5F7FA', borderRadius: 16, cursor: 'pointer', color: C.muted },
  mBody: { padding: '14px 20px 0', overflowY: 'auto' },
  field: { display: 'block', marginBottom: 12 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: C.muted, marginBottom: 6 },
  fieldHint: { display: 'block', fontSize: 12, color: C.idea, marginTop: 4 },
  input: { width: '100%', padding: '12px 14px', border: '1px solid #E1E8ED', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box', fontFamily: FONT },
  statusRow: { display: 'flex', gap: 6 },
  statusBtn: { flex: 1, padding: '10px 4px', border: '1px solid #E1E8ED', borderRadius: 10, background: 'white', fontSize: 13, cursor: 'pointer', fontFamily: FONT, color: C.muted },
  statusOn: { borderColor: ACCENT, background: '#FFF0F0', color: ACCENT, fontWeight: 700 },
  extra: { width: '100%', padding: 12, border: '1px solid #E1E8ED', borderRadius: 10, background: 'white', cursor: 'pointer', fontSize: 14, fontFamily: FONT, color: C.text, marginBottom: 8 },
  danger: { width: '100%', padding: 12, border: 'none', borderRadius: 10, background: '#FDECEA', color: '#C0392B', cursor: 'pointer', fontSize: 14, fontFamily: FONT, marginBottom: 8 },
  mBtns: { display: 'flex', gap: 12, padding: '10px 20px 22px' },
  cancel: { flex: 1, padding: 14, border: '1px solid #E1E8ED', background: 'white', borderRadius: 10, fontSize: 15, cursor: 'pointer', color: C.muted, fontFamily: FONT },
  save: { flex: 1, padding: 14, border: 'none', background: ACCENT, borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', color: 'white', fontFamily: FONT },
};
