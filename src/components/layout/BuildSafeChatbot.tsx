import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Bot,
  CornerDownLeft,
  MessageSquareText,
  RotateCcw,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import {
  generateAiResponse,
  INITIAL_GREETING_MESSAGE,
  type ChatContext,
  type ChatMessage,
} from '@/lib/ai/buildSafeKnowledge'
import { APP_LOGO_PATH } from '@/lib/constants'

export interface BuildSafeChatbotProps {
  context?: ChatContext
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  hideFloatingButton?: boolean
}

function getInitialGreeting(context?: ChatContext): ChatMessage {
  if (context?.assessmentResult) {
    const res = context.assessmentResult
    const targetLabel =
      context.category === 'farm_lot'
        ? `Proposed Farm Lot (${context.cropType?.split(' ')[0] ?? 'Crops'})`
        : (context.buildingType ?? 'Proposed Structure')

    const zoningRow = res.lgu.find((r) => r.label.toLowerCase().includes('zoning'))
    const floodRow = res.lgu.find((r) => r.label.toLowerCase().includes('flood'))
    const allRows = [...res.lgu, ...res.seismic, ...res.volcanic, ...res.hydromet]
    const isProhibited = allRows.some((r) => r.value.includes('🚫') || r.value.includes('PROHIBITED'))
    const isRestricted = allRows.some((r) => r.value.includes('⚠️') || r.value.includes('RESTRICTED') || r.value.includes('Data Gap'))

    const statusBadge = isProhibited
      ? '🚫 **CRITICAL: PROHIBITED LOCATION**'
      : isRestricted
      ? '⚠️ **CAUTION: RESTRICTED ZONE**'
      : '✅ **CLEAR SCREENING**'

    return {
      id: `welcome-${Date.now()}`,
      sender: 'assistant',
      text: `👋 **Assessment Complete! I am BUILD-SAFE AI.**

I've synced with your assessment for **${targetLabel}** at **${res.input.lat.toFixed(5)}° N, ${res.input.lng.toFixed(5)}° E** (${res.coverage?.municipality ?? 'Lasam'}):

• **CLUP Zoning:** ${zoningRow?.value ?? 'Zoned'}
• **Flood Hazard:** ${floodRow?.value ?? 'Evaluated'}
• **Status:** ${statusBadge}

Ask me anything about required municipal permits, flood mitigation, zoning clearance, or crop suitability!`,
      timestamp: 'Just now',
      suggestions: [
        'What permits are required for this site in Lasam?',
        'How can I mitigate flood risk here?',
        'Can I convert this agricultural land?',
        'Nearest agricultural business or facility',
      ],
    }
  }

  return INITIAL_GREETING_MESSAGE
}

export function BuildSafeChatbot({
  context,
  isOpen: controlledIsOpen,
  onOpenChange,
  hideFloatingButton = false,
}: BuildSafeChatbotProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isControlled = controlledIsOpen !== undefined
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen

  const setIsOpen = (value: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof value === 'function' ? value(isOpen) : value
    if (isControlled) {
      onOpenChange?.(nextVal)
    } else {
      setInternalIsOpen(nextVal)
    }
  }

  const [messages, setMessages] = useState<ChatMessage[]>(() => [getInitialGreeting(context)])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (context?.assessmentResult) {
      setMessages([getInitialGreeting(context)])
    }
  }, [context?.assessmentResult])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, messages, isTyping])

  const handleSendMessage = (textToSend: string) => {
    const trimmed = textToSend.trim()
    if (!trimmed) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setIsTyping(true)

    // Simulate natural AI thinking delay
    setTimeout(() => {
      const response = generateAiResponse(trimmed, context)
      const aiMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: response.suggestions,
      }
      setMessages((prev) => [...prev, aiMsg])
      setIsTyping(false)
    }, 450)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    handleSendMessage(inputText)
  }

  const handleResetChat = () => {
    setMessages([getInitialGreeting(context)])
    setIsTyping(false)
  }

  const siteInfo = context?.assessmentResult
    ? `${context.assessmentResult.coverage?.municipality ?? 'Lasam'} (${context.assessmentResult.input.lat.toFixed(4)}° N, ${context.assessmentResult.input.lng.toFixed(4)}° E)`
    : null

  return (
    <>
      {/* Floating Action Button (Message Icon below) */}
      {!hideFloatingButton && (
        <div className="fixed bottom-5 right-5 z-[70] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {!isOpen && (
            <div className="flex items-center gap-1.5 rounded-full bg-slate-900/90 text-white px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur border border-slate-700/60 animate-in fade-in slide-in-from-right-2 pointer-events-none">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>BUILD-SAFE AI</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={`group relative flex h-13 w-13 items-center justify-center rounded-full shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer ${
              isOpen
                ? 'bg-slate-900 text-white hover:bg-slate-800 ring-4 ring-slate-900/10'
                : 'bg-gradient-to-tr from-emerald-700 via-teal-700 to-emerald-600 text-white hover:scale-105 ring-4 ring-emerald-500/25 shadow-emerald-900/30'
            }`}
            aria-label={isOpen ? 'Close BUILD-SAFE AI chat' : 'Open BUILD-SAFE AI chat'}
            title={isOpen ? 'Close chat' : 'Chat with BUILD-SAFE AI'}
          >
            {isOpen ? (
              <X className="h-6 w-6 transition-transform group-hover:rotate-90 duration-200" />
            ) : (
              <>
                <MessageSquareText className="h-6 w-6 transition-transform group-hover:scale-110 duration-200" />
                {/* Online pulse indicator */}
                <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Small Popup Chatbox: BUILD-SAFE AI */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="BUILD-SAFE AI Chat"
          className="fixed bottom-20 right-4 sm:right-5 z-[75] flex h-[520px] max-h-[82vh] w-[92vw] sm:w-[390px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/25 animate-in fade-in slide-in-from-bottom-4 duration-250"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 px-3.5 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 p-1 backdrop-blur-xs border border-white/20">
                <img src={APP_LOGO_PATH} alt="BUILD-SAFE" className="h-6 w-6 object-contain" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-900" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-wide">BUILD-SAFE AI</h3>
                  <span className="rounded bg-emerald-500/30 border border-emerald-400/40 px-1 py-0.2 text-[9px] font-semibold text-emerald-200 uppercase tracking-wider">
                    Online
                  </span>
                </div>
                <p className="text-[10.5px] text-emerald-100/80">Lasam Multi-Hazard & Zoning Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-white/80">
              <button
                type="button"
                onClick={handleResetChat}
                className="rounded-lg p-1.5 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                title="Restart conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                title="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Active site context pill (if site assessed) */}
          {siteInfo && (
            <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/70 px-3 py-1.5 text-[10.5px] text-emerald-900">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-emerald-600 font-bold">📍 Active Site:</span>
                <span className="truncate font-medium">{siteInfo}</span>
              </div>
              <span className="shrink-0 text-[9.5px] text-emerald-700 font-semibold bg-emerald-100/80 rounded px-1.5 py-0.5">
                Context Synced
              </span>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`flex gap-2 max-w-[92%] ${
                    msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Sender Avatar */}
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-[10px] mt-0.5 ${
                      msg.sender === 'user'
                        ? 'bg-slate-700'
                        : 'bg-gradient-to-tr from-emerald-600 to-teal-700 shadow-xs'
                    }`}
                  >
                    {msg.sender === 'user' ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-teal-700 text-white rounded-tr-xs font-medium'
                        : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/80 shadow-slate-100'
                    }`}
                  >
                    {renderFormattedText(msg.text)}
                  </div>
                </div>

                <span className="text-[9.5px] text-slate-400 mt-1 px-8">
                  {msg.timestamp}
                </span>

                {/* Follow-up Suggestion Chips */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2 pl-8 flex flex-col gap-1.5 w-full">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Suggested questions:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {msg.suggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(sug)}
                          className="rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-medium text-emerald-900 transition-all hover:bg-emerald-100 hover:border-emerald-300 active:scale-95 text-left cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-slate-500">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white text-[10px]">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-xs bg-white border border-slate-200 px-3.5 py-2 shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input & Footer */}
          <div className="border-t border-slate-200 bg-white p-2.5">
            <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask about zoning, hazards, or permits in Lasam…"
                className="flex-1 rounded-xl border border-slate-300 bg-slate-50/80 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isTyping}
                className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs transition-all hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Send message"
              >
                <CornerDownLeft className="h-4 w-4" />
              </button>
            </form>
            <p className="mt-1.5 text-center text-[9px] text-slate-400">
              BUILD-SAFE AI decision support · Lasam CLUP (2020–2029) & Building Code (PD 1096)
            </p>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Parses bold markdown and lists cleanly into React nodes
 */
function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}
