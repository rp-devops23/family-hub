import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import GoogleConnectPage from './GoogleConnectPage'

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

// ============================================================================
// AGENT PAGE — Conversational AI chat interface
// ============================================================================

// Check Web Speech API support
const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null
const VOICE_SUPPORTED = !!SpeechRecognition

export default function AgentPage({ onHome }) {
  const { user, language, toggleLanguage, signOut } = useAuth()
  const t = (fr, en) => language === 'fr' ? fr : en

  const [conversations,    setConversations]    = useState([])
  const [activeConvId,     setActiveConvId]     = useState(null)
  const [messages,         setMessages]         = useState([])
  const [input,            setInput]            = useState('')
  const [loading,          setLoading]          = useState(false)
  const [showConvList,     setShowConvList]     = useState(false)
  const [showGoogleConnect,setShowGoogleConnect]= useState(false)
  const [googleConnected,  setGoogleConnected]  = useState(false)
  const [isListening,      setIsListening]      = useState(false)
  const [actionBanner,     setActionBanner]     = useState(null) // { text, success }

  const messagesEndRef  = useRef(null)
  const inputRef        = useRef(null)
  const recognitionRef  = useRef(null)

  useEffect(() => {
    if (!user) return
    loadConversations()
    checkGoogleStatus()
  }, [user])

  useEffect(() => {
    if (!activeConvId) return
    loadMessages(activeConvId)
  }, [activeConvId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-hide action banner
  useEffect(() => {
    if (!actionBanner) return
    const timer = setTimeout(() => setActionBanner(null), 5000)
    return () => clearTimeout(timer)
  }, [actionBanner])

  async function checkGoogleStatus() {
    const { data } = await supabase.from('google_tokens').select('email').eq('user_id', user.id).maybeSingle()
    setGoogleConnected(!!data)
  }

  async function loadConversations() {
    const { data } = await supabase
      .from('agent_conversations').select('id, title, updated_at')
      .eq('user_id', user.id).order('updated_at', { ascending: false }).limit(30)
    setConversations(data ?? [])
  }

  async function loadMessages(convId) {
    const { data } = await supabase
      .from('agent_messages').select('id, role, content, created_at')
      .eq('conversation_id', convId).order('created_at', { ascending: true })
    setMessages(data ?? [])
  }

  // ---- Voice input ----------------------------------------------------------

  const startListening = useCallback(() => {
    if (!VOICE_SUPPORTED || isListening) return

    const recognition = new SpeechRecognition()
    recognition.lang = language === 'fr' ? 'fr-FR' : 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsListening(false)
    }

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [language, isListening])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  // ---- Send message ---------------------------------------------------------

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setLoading(true)

    const tempUserMsg = { id: 'temp-user', role: 'user', content: text, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const authHeader = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}

      const { data, error: fnError } = await supabase.functions.invoke('family-agent', {
        body: { message: text, conversationId: activeConvId },
        headers: authHeader,
      })
      if (fnError) throw new Error(fnError.message)
      if (data?.error) throw new Error(data.error)

      if (!activeConvId && data?.conversationId) {
        setActiveConvId(data.conversationId)
        await loadConversations()
      }

      await loadMessages(data?.conversationId ?? activeConvId)

      // Show action banner if a tool was executed
      if (data?.actionPerformed) {
        const { result, tool } = data.actionPerformed
        if (result?.success) {
          setActionBanner({
            success: true,
            text: tool === 'create_transaction'
              ? t('✅ Transaction ajoutée', '✅ Transaction added')
              : t('✅ Action effectuée', '✅ Action performed'),
          })
        } else {
          setActionBanner({ success: false, text: t('⚠️ Échec de l\'action', '⚠️ Action failed') })
        }
      }

    } catch (err) {
      console.error('Agent error:', err)
      setMessages(prev => [...prev, {
        id: 'temp-err', role: 'assistant',
        content: `${t('Erreur', 'Error')}: ${err.message}`,
        created_at: new Date().toISOString(),
        error: true,
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  // ---- Conversation management ----------------------------------------------

  function startNewConversation() {
    setActiveConvId(null); setMessages([]); setShowConvList(false)
    inputRef.current?.focus()
  }

  function selectConversation(id) {
    setActiveConvId(id); setShowConvList(false)
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(iso) {
    const d = new Date(iso)
    const diffDays = Math.floor((new Date() - d) / 86400000)
    if (diffDays === 0) return t("Aujourd'hui", 'Today')
    if (diffDays === 1) return t('Hier', 'Yesterday')
    return d.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })
  }

  // ---- Suggestions ----------------------------------------------------------

  const SUGGESTIONS = [
    t("J'ai dépensé 45€ au restaurant hier soir", "I spent €45 at a restaurant last night"),
    t("Ajoute un revenu de 2500€ : salaire de mai", "Add €2500 income: May salary"),
    t("Résume mes dépenses ce mois", "Summarize my spending this month"),
    t("Quels sont mes budgets actifs ?", "What are my active budgets?"),
  ]

  if (showGoogleConnect) {
    return <GoogleConnectPage onBack={() => { setShowGoogleConnect(false); checkGoogleStatus() }} />
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>

        {/* ---- HEADER ---- */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            {onHome && <button onClick={onHome} style={styles.iconBtn}>🏠</button>}
            <button onClick={() => setShowConvList(v => !v)} style={styles.convBtn}>
              <span style={styles.agentIcon}>🤖</span>
              <span style={styles.headerTitle}>Family Agent</span>
              <span style={{ fontSize: '10px', color: '#636E72', marginLeft: '4px' }}>▼</span>
            </button>
          </div>
          <div style={styles.headerRight}>
            <button onClick={startNewConversation} style={styles.newChatBtn}>✏️ {t('Nouveau', 'New')}</button>
            <button
              onClick={() => setShowGoogleConnect(true)}
              style={{ ...styles.iconBtn, ...(googleConnected ? styles.googleBtnConnected : {}) }}
              title={googleConnected ? t('Google connecté', 'Google connected') : t('Connecter Google', 'Connect Google')}
            >
              {googleConnected ? '📅✓' : '📅'}
            </button>
            <button onClick={toggleLanguage} style={styles.iconBtn}>{language === 'fr' ? 'EN 🇬🇧' : 'FR 🇫🇷'}</button>
            <button onClick={signOut} style={styles.iconBtn}>🚪</button>
          </div>
        </header>

        {/* ---- CONVERSATION LIST ---- */}
        {showConvList && (
          <div style={styles.convList}>
            <button onClick={startNewConversation} style={styles.newConvItem}>
              ✏️ {t('Nouvelle conversation', 'New conversation')}
            </button>
            {conversations.length === 0 && (
              <p style={styles.convEmpty}>{t('Aucune conversation', 'No conversations yet')}</p>
            )}
            {conversations.map(conv => (
              <button key={conv.id} onClick={() => selectConversation(conv.id)}
                style={{ ...styles.convItem, ...(conv.id === activeConvId ? styles.convItemActive : {}) }}>
                <span style={styles.convTitle}>{conv.title}</span>
                <span style={styles.convDate}>{formatDate(conv.updated_at)}</span>
              </button>
            ))}
          </div>
        )}

        {/* ---- ACTION BANNER ---- */}
        {actionBanner && (
          <div style={{
            ...styles.actionBanner,
            backgroundColor: actionBanner.success ? '#F0FFF4' : '#FFF3F3',
            borderColor: actionBanner.success ? '#68D391' : '#FFBCBC',
            color: actionBanner.success ? '#2D5A3D' : '#C0392B',
          }}>
            {actionBanner.text}
          </div>
        )}

        {/* ---- MESSAGES ---- */}
        <div style={styles.messagesArea} onClick={() => setShowConvList(false)}>
          {messages.length === 0 && !loading && (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>🤖</span>
              <p style={styles.emptyTitle}>Family Agent</p>
              <p style={styles.emptySubtitle}>
                {t(
                  'Parlez-moi d\'une dépense, d\'un revenu, ou posez-moi n\'importe quelle question sur votre famille.',
                  'Tell me about an expense, income, or ask me anything about your family.',
                )}
              </p>
              <div style={styles.suggestions}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => { setInput(s); inputRef.current?.focus() }} style={styles.suggestion}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} style={{ ...styles.msgRow, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' && <span style={styles.avatar}>🤖</span>}
              <div style={{
                ...styles.bubble,
                ...(msg.role === 'user' ? styles.bubbleUser : styles.bubbleAgent),
                ...(msg.error ? styles.bubbleError : {}),
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

        {/* ---- INPUT ---- */}
        <div style={styles.inputArea}>
          {/* Voice indicator */}
          {isListening && (
            <div style={styles.listeningBanner}>
              <span style={styles.listeningDot} />
              {t('Parlez maintenant…', 'Speak now…')}
              <button onClick={stopListening} style={styles.stopVoiceBtn}>✕</button>
            </div>
          )}
          <div style={styles.inputRow}>
            {/* Voice button */}
            {VOICE_SUPPORTED && (
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={loading}
                style={{
                  ...styles.voiceBtn,
                  backgroundColor: isListening ? '#E74C3C' : '#F5F7FA',
                  color: isListening ? 'white' : '#636E72',
                }}
                title={isListening ? t('Arrêter', 'Stop') : t('Commande vocale', 'Voice input')}
              >
                {isListening ? '⏹' : '🎤'}
              </button>
            )}
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
              }}
              placeholder={VOICE_SUPPORTED
                ? t('Écrivez ou utilisez le micro…', 'Type or use the microphone…')
                : t('Écrivez votre message…', 'Write your message…')}
              style={styles.textarea}
              rows={1}
              disabled={loading || isListening}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim() || isListening}
              style={{ ...styles.sendBtn, opacity: loading || !input.trim() || isListening ? 0.5 : 1 }}
            >
              ➤
            </button>
          </div>
          <p style={styles.hint}>
            {t('Entrée pour envoyer · Maj+Entrée pour nouvelle ligne', 'Enter to send · Shift+Enter for new line')}
            {VOICE_SUPPORTED && t(' · 🎤 pour la voix', ' · 🎤 for voice')}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>
    </div>
  )
}

const styles = {
  wrapper: { width: '100%', minHeight: '100vh', backgroundColor: '#F5F7FA', display: 'flex', justifyContent: 'center', fontFamily: FONT },
  container: { width: '100%', maxWidth: '600px', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', backgroundColor: '#F5F7FA' },

  // Header
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'white', borderBottom: '1px solid #E1E8ED', position: 'sticky', top: 0, zIndex: 200, boxSizing: 'border-box' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '6px' },
  agentIcon: { fontSize: '22px' },
  headerTitle: { fontSize: '18px', fontWeight: 700, color: '#2D3436' },
  convBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px' },
  iconBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px', border: '1px solid #E1E8ED', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', fontFamily: FONT },
  newChatBtn: { padding: '6px 12px', border: '1px solid #E1E8ED', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', fontFamily: FONT, fontWeight: 600, color: '#00A3E0' },
  googleBtnConnected: { backgroundColor: '#F0FFF4', borderColor: '#68D391', color: '#2D5A3D' },

  // Conversation list
  convList: { position: 'absolute', top: '57px', left: 0, right: 0, zIndex: 300, backgroundColor: 'white', borderBottom: '1px solid #E1E8ED', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', maxHeight: '280px', overflowY: 'auto' },
  newConvItem: { width: '100%', padding: '14px 16px', textAlign: 'left', border: 'none', borderBottom: '1px solid #F0F4F8', background: '#F0F9FF', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#00A3E0', fontFamily: FONT },
  convItem: { width: '100%', padding: '12px 16px', textAlign: 'left', border: 'none', borderBottom: '1px solid #F5F7FA', background: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: FONT },
  convItemActive: { backgroundColor: '#F0F9FF' },
  convTitle: { fontSize: '14px', color: '#2D3436', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  convDate: { fontSize: '11px', color: '#8A92A0', marginLeft: '8px', flexShrink: 0 },
  convEmpty: { padding: '16px', textAlign: 'center', color: '#8A92A0', fontSize: '14px', margin: 0 },

  // Action banner
  actionBanner: { margin: '8px 16px 0', padding: '10px 14px', borderRadius: '10px', border: '1px solid', fontSize: '13px', fontWeight: '600', textAlign: 'center', transition: 'all 0.3s' },

  // Messages
  messagesArea: { flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '130px', display: 'flex', flexDirection: 'column', gap: '12px' },
  emptyState: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', gap: '12px' },
  emptyIcon: { fontSize: '56px' },
  emptyTitle: { fontSize: '22px', fontWeight: 700, color: '#2D3436', margin: 0 },
  emptySubtitle: { fontSize: '15px', color: '#636E72', margin: 0, maxWidth: '320px', lineHeight: 1.5 },
  suggestions: { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '380px', marginTop: '8px' },
  suggestion: { padding: '10px 16px', backgroundColor: 'white', border: '1px solid #E1E8ED', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', color: '#00A3E0', fontFamily: FONT, textAlign: 'left', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },

  // Bubbles
  msgRow: { display: 'flex', alignItems: 'flex-end', gap: '8px' },
  avatar: { fontSize: '24px', flexShrink: 0, marginBottom: '4px' },
  bubble: { maxWidth: '78%', padding: '10px 14px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px' },
  bubbleUser: { backgroundColor: '#00A3E0', color: 'white', borderBottomRightRadius: '4px' },
  bubbleAgent: { backgroundColor: 'white', color: '#2D3436', borderBottomLeftRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  bubbleError: { backgroundColor: '#FEF2F2', color: '#C75050' },
  bubbleText: { margin: 0, fontSize: '15px', lineHeight: 1.5, whiteSpace: 'pre-wrap' },
  bubbleTime: { fontSize: '10px', opacity: 0.6, alignSelf: 'flex-end' },

  // Typing
  typingBubble: { backgroundColor: 'white', borderRadius: '16px', borderBottomLeftRadius: '4px', padding: '14px 18px', display: 'flex', gap: '5px', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  dot: { width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#BDC3C7', display: 'inline-block', animation: 'bounce 1.2s infinite' },

  // Input area
  inputArea: { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '600px', backgroundColor: 'white', borderTop: '1px solid #E1E8ED', padding: '10px 16px max(10px, env(safe-area-inset-bottom))', boxSizing: 'border-box', zIndex: 100 },
  listeningBanner: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#FEF2F2', borderRadius: '8px', marginBottom: '8px', fontSize: '13px', color: '#E74C3C', fontWeight: '600' },
  listeningDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#E74C3C', animation: 'pulse 1s infinite', flexShrink: 0 },
  stopVoiceBtn: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#E74C3C', fontSize: '14px', padding: '2px 6px' },
  inputRow: { display: 'flex', gap: '8px', alignItems: 'flex-end' },
  voiceBtn: { width: '44px', height: '44px', borderRadius: '12px', border: '1px solid #E1E8ED', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' },
  textarea: { flex: 1, padding: '10px 14px', fontSize: '15px', fontFamily: FONT, border: '1px solid #E1E8ED', borderRadius: '12px', outline: 'none', resize: 'none', backgroundColor: '#F5F7FA', color: '#2D3436', lineHeight: 1.5, maxHeight: '120px', overflowY: 'auto' },
  sendBtn: { width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#00A3E0', color: 'white', border: 'none', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'opacity 0.2s' },
  hint: { margin: '6px 0 0', fontSize: '11px', color: '#BDC3C7', textAlign: 'center' },
}
