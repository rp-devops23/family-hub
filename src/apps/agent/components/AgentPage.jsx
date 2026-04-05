import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
// In dev, set VITE_FUNCTIONS_URL=http://localhost:54321/functions/v1 to test locally
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL
  ?? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

// ============================================================================
// AGENT PAGE — Conversational AI chat interface
// ============================================================================

export default function AgentPage({ onHome }) {
  const { user, language, toggleLanguage, signOut } = useAuth()
  const t = (fr, en) => language === 'fr' ? fr : en

  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConvList, setShowConvList] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Load conversations list
  useEffect(() => {
    if (!user) return
    loadConversations()
  }, [user])

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConvId) return
    loadMessages(activeConvId)
  }, [activeConvId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function loadConversations() {
    const { data } = await supabase
      .from('agent_conversations')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(30)
    setConversations(data ?? [])
  }

  async function loadMessages(convId) {
    const { data } = await supabase
      .from('agent_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setLoading(true)

    // Optimistic UI — show user message immediately
    const tempUserMsg = { id: 'temp-user', role: 'user', content: text, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${FUNCTIONS_URL}/family-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: text, conversationId: activeConvId }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Set conversation if new
      if (!activeConvId) {
        setActiveConvId(data.conversationId)
        await loadConversations()
      }

      // Reload messages from DB (removes temp, adds real IDs)
      await loadMessages(data.conversationId ?? activeConvId)

    } catch (err) {
      console.error('Agent error:', err)
      setMessages(prev => [...prev, {
        id: 'temp-err',
        role: 'assistant',
        content: t('Désolé, une erreur est survenue. Réessaie.', 'Sorry, something went wrong. Please try again.'),
        created_at: new Date().toISOString(),
        error: true,
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function startNewConversation() {
    setActiveConvId(null)
    setMessages([])
    setShowConvList(false)
    inputRef.current?.focus()
  }

  function selectConversation(id) {
    setActiveConvId(id)
    setShowConvList(false)
  }

  function formatTime(iso) {
    const d = new Date(iso)
    return d.toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(iso) {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now - d) / 86400000)
    if (diffDays === 0) return t("Aujourd'hui", 'Today')
    if (diffDays === 1) return t('Hier', 'Yesterday')
    return d.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            {onHome && (
              <button onClick={onHome} style={styles.iconBtn} title={t('Accueil', 'Home')}>🏠</button>
            )}
            <button onClick={() => setShowConvList(v => !v)} style={styles.convBtn}>
              <span style={styles.agentIcon}>🤖</span>
              <span style={styles.headerTitle}>Family Agent</span>
              <span style={{ fontSize: '10px', color: '#636E72', marginLeft: '4px' }}>▼</span>
            </button>
          </div>
          <div style={styles.headerRight}>
            <button onClick={startNewConversation} style={styles.newChatBtn}>
              ✏️ {t('Nouveau', 'New')}
            </button>
            <button onClick={toggleLanguage} style={styles.iconBtn}>
              {language === 'fr' ? 'EN 🇬🇧' : 'FR 🇫🇷'}
            </button>
            <button onClick={signOut} style={styles.iconBtn}>🚪</button>
          </div>
        </header>

        {/* Conversation list dropdown */}
        {showConvList && (
          <div style={styles.convList}>
            <button onClick={startNewConversation} style={styles.newConvItem}>
              ✏️ {t('Nouvelle conversation', 'New conversation')}
            </button>
            {conversations.length === 0 && (
              <p style={styles.convEmpty}>{t('Aucune conversation', 'No conversations yet')}</p>
            )}
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                style={{ ...styles.convItem, ...(conv.id === activeConvId ? styles.convItemActive : {}) }}
              >
                <span style={styles.convTitle}>{conv.title}</span>
                <span style={styles.convDate}>{formatDate(conv.updated_at)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Messages area */}
        <div style={styles.messagesArea} onClick={() => setShowConvList(false)}>
          {messages.length === 0 && !loading && (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>🤖</span>
              <p style={styles.emptyTitle}>Family Agent</p>
              <p style={styles.emptySubtitle}>
                {t(
                  'Posez-moi des questions sur vos finances, vos recettes ou demandez de l\'aide pour planifier vos repas.',
                  'Ask me about your finances, recipes, or get help planning your meals.'
                )}
              </p>
              <div style={styles.suggestions}>
                {[
                  t('Résume mes dépenses ce mois', 'Summarize my spending this month'),
                  t('Suggère une recette facile', 'Suggest an easy recipe'),
                  t('Quels sont mes budgets actifs ?', 'What are my active budgets?'),
                ].map(s => (
                  <button key={s} onClick={() => { setInput(s); inputRef.current?.focus() }} style={styles.suggestion}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} style={{ ...styles.msgRow, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' && <span style={styles.avatar}>🤖</span>}
              <div style={{
                ...styles.bubble,
                ...(msg.role === 'user' ? styles.bubbleUser : styles.bubbleAgent),
                ...(msg.error ? styles.bubbleError : {})
              }}>
                <p style={styles.bubbleText}>{msg.content}</p>
                <span style={styles.bubbleTime}>{formatTime(msg.created_at)}</span>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ ...styles.msgRow, justifyContent: 'flex-start' }}>
              <span style={styles.avatar}>🤖</span>
              <div style={styles.typingBubble}>
                <span style={styles.dot} />
                <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
                <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={styles.inputArea}>
          <div style={styles.inputRow}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder={t('Écrivez votre message...', 'Write your message...')}
              style={styles.textarea}
              rows={1}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{ ...styles.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }}
            >
              ➤
            </button>
          </div>
          <p style={styles.hint}>{t('Entrée pour envoyer · Maj+Entrée pour nouvelle ligne', 'Enter to send · Shift+Enter for new line')}</p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}

const styles = {
  wrapper: {
    width: '100%', minHeight: '100vh', backgroundColor: '#F5F7FA',
    display: 'flex', justifyContent: 'center', fontFamily: FONT,
  },
  container: {
    width: '100%', maxWidth: '600px', minHeight: '100vh',
    display: 'flex', flexDirection: 'column', position: 'relative', backgroundColor: '#F5F7FA',
  },

  // Header
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', backgroundColor: 'white',
    borderBottom: '1px solid #E1E8ED',
    position: 'sticky', top: 0, zIndex: 200, boxSizing: 'border-box',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  agentIcon: { fontSize: '22px' },
  headerTitle: { fontSize: '18px', fontWeight: 700, color: '#2D3436' },
  convBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
    borderRadius: '8px',
  },
  iconBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '6px 10px', border: '1px solid #E1E8ED', borderRadius: '8px',
    background: 'white', cursor: 'pointer', fontSize: '13px', fontFamily: FONT,
  },
  newChatBtn: {
    padding: '6px 12px', border: '1px solid #E1E8ED', borderRadius: '8px',
    background: 'white', cursor: 'pointer', fontSize: '13px', fontFamily: FONT,
    fontWeight: 600, color: '#00A3E0',
  },

  // Conversation list
  convList: {
    position: 'absolute', top: '57px', left: 0, right: 0, zIndex: 300,
    backgroundColor: 'white', borderBottom: '1px solid #E1E8ED',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)', maxHeight: '280px', overflowY: 'auto',
  },
  newConvItem: {
    width: '100%', padding: '14px 16px', textAlign: 'left', border: 'none',
    borderBottom: '1px solid #F0F4F8', background: '#F0F9FF',
    cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#00A3E0', fontFamily: FONT,
  },
  convItem: {
    width: '100%', padding: '12px 16px', textAlign: 'left', border: 'none',
    borderBottom: '1px solid #F5F7FA', background: 'white',
    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontFamily: FONT,
  },
  convItemActive: { backgroundColor: '#F0F9FF' },
  convTitle: { fontSize: '14px', color: '#2D3436', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  convDate: { fontSize: '11px', color: '#8A92A0', marginLeft: '8px', flexShrink: 0 },
  convEmpty: { padding: '16px', textAlign: 'center', color: '#8A92A0', fontSize: '14px', margin: 0 },

  // Messages
  messagesArea: {
    flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '120px',
    display: 'flex', flexDirection: 'column', gap: '12px',
  },
  emptyState: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '40px 20px', textAlign: 'center', gap: '12px',
  },
  emptyIcon: { fontSize: '56px' },
  emptyTitle: { fontSize: '22px', fontWeight: 700, color: '#2D3436', margin: 0 },
  emptySubtitle: { fontSize: '15px', color: '#636E72', margin: 0, maxWidth: '320px', lineHeight: 1.5 },
  suggestions: { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '360px', marginTop: '8px' },
  suggestion: {
    padding: '10px 16px', backgroundColor: 'white', border: '1px solid #E1E8ED',
    borderRadius: '20px', cursor: 'pointer', fontSize: '13px', color: '#00A3E0',
    fontFamily: FONT, textAlign: 'left', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },

  // Message bubbles
  msgRow: { display: 'flex', alignItems: 'flex-end', gap: '8px' },
  avatar: { fontSize: '24px', flexShrink: 0, marginBottom: '4px' },
  bubble: {
    maxWidth: '75%', padding: '10px 14px', borderRadius: '16px',
    display: 'flex', flexDirection: 'column', gap: '4px',
  },
  bubbleUser: {
    backgroundColor: '#00A3E0', color: 'white',
    borderBottomRightRadius: '4px',
  },
  bubbleAgent: {
    backgroundColor: 'white', color: '#2D3436',
    borderBottomLeftRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  bubbleError: { backgroundColor: '#FEF2F2', color: '#C75050' },
  bubbleText: { margin: 0, fontSize: '15px', lineHeight: 1.5, whiteSpace: 'pre-wrap' },
  bubbleTime: { fontSize: '10px', opacity: 0.6, alignSelf: 'flex-end' },

  // Typing indicator
  typingBubble: {
    backgroundColor: 'white', borderRadius: '16px', borderBottomLeftRadius: '4px',
    padding: '14px 18px', display: 'flex', gap: '5px', alignItems: 'center',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  dot: {
    width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#BDC3C7',
    display: 'inline-block',
    animation: 'bounce 1.2s infinite',
  },

  // Input
  inputArea: {
    position: 'fixed', bottom: 0,
    left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '600px',
    backgroundColor: 'white', borderTop: '1px solid #E1E8ED',
    padding: '12px 16px max(12px, env(safe-area-inset-bottom))',
    boxSizing: 'border-box', zIndex: 100,
  },
  inputRow: { display: 'flex', gap: '10px', alignItems: 'flex-end' },
  textarea: {
    flex: 1, padding: '10px 14px', fontSize: '15px', fontFamily: FONT,
    border: '1px solid #E1E8ED', borderRadius: '12px', outline: 'none',
    resize: 'none', backgroundColor: '#F5F7FA', color: '#2D3436',
    lineHeight: 1.5, maxHeight: '120px', overflowY: 'auto',
  },
  sendBtn: {
    width: '44px', height: '44px', borderRadius: '12px',
    backgroundColor: '#00A3E0', color: 'white', border: 'none',
    cursor: 'pointer', fontSize: '18px', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    transition: 'opacity 0.2s',
  },
  hint: { margin: '6px 0 0', fontSize: '11px', color: '#BDC3C7', textAlign: 'center' },
}
