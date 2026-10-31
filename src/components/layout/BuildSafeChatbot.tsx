import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  AudioLines,
  ChevronDown,
  FileText,
  MessageSquare,
  MoreVertical,
  PenLine,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  generateAiResponse,
  type ChatContext,
  type ChatMessage,
} from '@/lib/ai/buildSafeKnowledge'

export interface BuildSafeChatbotProps {
  context?: ChatContext
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  hideFloatingButton?: boolean
}

/**
 * Pixel-accurate Google Gemini 4-pointed sparkle SVG icon
 */
export function GeminiSparkle({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="geminiSparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="30%" stopColor="#9B72CB" />
          <stop offset="65%" stopColor="#D96570" />
          <stop offset="85%" stopColor="#F4B400" />
          <stop offset="100%" stopColor="#0F9D58" />
        </linearGradient>
      </defs>
      <path
        d="M12 0C12 6.62742 6.62742 12 0 12C6.62742 12 12 17.3726 12 24C12 17.3726 17.3726 12 24 12C17.3726 12 12 6.62742 12 0Z"
        fill="url(#geminiSparkleGrad)"
      />
    </svg>
  )
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

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [contextAttached, setContextAttached] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [selectedModel, setSelectedModel] = useState('Auto')
  const [showPlusMenu, setShowPlusMenu] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      scrollToBottom()
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, messages, isTyping])

  // Close popup menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

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
      const activeCtx = contextAttached ? context : undefined
      const response = generateAiResponse(trimmed, activeCtx)
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
    setMessages([])
    setIsTyping(false)
    setShowMenu(false)
  }

  // Determine context label for attached chip
  const contextLabel = context?.assessmentResult
    ? `Sharing "Assessment: ${context.assessmentResult.input.lat.toFixed(4)}° N, ${context.assessmentResult.input.lng.toFixed(4)}° E"`
    : 'Sharing "BUILD-SAFE: Multi-Hazard Site Intelli... "'

  return (
    <>
      {/* Floating Action Button (Visible when sidebar is closed) */}
      {!hideFloatingButton && !isOpen && (
        <div className="fixed bottom-5 right-5 z-[70] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2.5 rounded-full border border-slate-200/90 bg-white/95 px-4 py-2.5 text-slate-800 shadow-xl backdrop-blur-md transition-all duration-200 hover:scale-105 hover:shadow-2xl hover:border-slate-300 active:scale-95 cursor-pointer ring-4 ring-slate-900/5"
            aria-label="Open BUILD-SAFE AI chat"
            title="Chat with BUILD-SAFE AI"
          >
            <GeminiSparkle className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold tracking-tight text-slate-800">
              BUILD-SAFE AI
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </button>
        </div>
      )}

      {/* Full-Height Right Docked Sidebar (Styled like Google Gemini) */}
      {isOpen && (
        <aside
          role="dialog"
          aria-label="BUILD-SAFE AI Chat"
          className="fixed top-0 right-0 bottom-0 z-[75] flex h-full w-full sm:w-[420px] lg:w-[460px] xl:w-[480px] flex-col justify-between overflow-hidden border-l border-slate-200/80 bg-gradient-to-b from-[#ffffff] via-[#f8faff] to-[#edf4fc] shadow-2xl shadow-slate-900/15 animate-in slide-in-from-right duration-300 font-sans select-text"
        >
          {/* Top Header Bar */}
          <div className="flex shrink-0 items-center justify-between px-3.5 py-3 border-b border-transparent">
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetChat}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-white hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                  title="Start a new chat"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New chat</span>
                </button>
              )}
            </div>

            {/* Top Right Controls (Three-dots menu and Close X) */}
            <div className="flex items-center gap-1 relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowMenu((prev) => !prev)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="More options"
                aria-label="More options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Close chat"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Three-dots Dropdown Menu */}
              {showMenu && (
                <div className="absolute top-10 right-0 z-50 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={handleResetChat}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-slate-100 transition-colors cursor-pointer font-medium"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                    <span>Clear conversation</span>
                  </button>
                  <div className="my-1 h-px bg-slate-100" />
                  <div className="px-3 py-1 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                    Reference Knowledge
                  </div>
                  <div className="px-3 py-1.5 text-[11.5px] text-slate-600 leading-snug">
                    • Lasam CLUP (2020–2029)<br />
                    • DENR-MGB 1:10k Flood Data<br />
                    • PHIVOLCS Fault Lines & NSCP<br />
                    • PD 1067 Waterway Easements
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Body */}
          {messages.length === 0 ? (
            /* Idle Screen: Exact layout matching user screenshot */
            <div className="flex flex-1 flex-col justify-between px-6 pb-4">
              {/* Center Sparkle and Greeting */}
              <div className="flex flex-1 flex-col items-center justify-center text-center -mt-8">
                <GeminiSparkle className="h-10 w-10 mb-5 drop-shadow-sm" />
                <h1 className="text-[26px] sm:text-[28px] font-normal text-slate-800 tracking-tight leading-snug">
                  What's the vibe, manoling?
                </h1>
              </div>

              {/* Stacked Suggestion Pills (above bottom input box) */}
              <div className="flex flex-col gap-2.5 mb-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
                <button
                  type="button"
                  onClick={() => handleSendMessage('Explain the BUILD-SAFE site assessment process')}
                  className="w-fit max-w-full rounded-full border border-slate-200/90 bg-white/95 px-4 py-2.5 text-[13px] font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:shadow-xs transition-all flex items-center gap-2.5 cursor-pointer text-left active:scale-[0.99]"
                >
                  <FileText className="h-4 w-4 text-slate-600 shrink-0" />
                  <span className="truncate">Explain the BUILD-SAFE site assessment process</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage('Discuss a topic with me')}
                  className="w-fit max-w-full rounded-full border border-slate-200/90 bg-white/95 px-4 py-2.5 text-[13px] font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:shadow-xs transition-all flex items-center gap-2.5 cursor-pointer text-left active:scale-[0.99]"
                >
                  <MessageSquare className="h-4 w-4 text-slate-600 shrink-0" />
                  <span className="truncate">Discuss a topic with me</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage('Help me with my writing')}
                  className="w-fit max-w-full rounded-full border border-slate-200/90 bg-white/95 px-4 py-2.5 text-[13px] font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:shadow-xs transition-all flex items-center gap-2.5 cursor-pointer text-left active:scale-[0.99]"
                >
                  <PenLine className="h-4 w-4 text-slate-600 shrink-0" />
                  <span className="truncate">Help me with my writing</span>
                </button>
              </div>
            </div>
          ) : (
            /* Active Conversation Scroll View */
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  {msg.sender === 'user' ? (
                    <div className="rounded-3xl bg-slate-100 px-4 py-2.5 text-[13.5px] font-normal text-slate-800 leading-relaxed max-w-[85%] shadow-2xs">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5 max-w-[95%]">
                      <div className="shrink-0 mt-0.5">
                        <GeminiSparkle className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="text-[13.5px] leading-relaxed text-slate-800 whitespace-pre-wrap">
                          {renderFormattedText(msg.text)}
                        </div>

                        {/* Suggestion Chips */}
                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="pt-1 flex flex-wrap gap-1.5">
                            {msg.suggestions.map((sug, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSendMessage(sug)}
                                className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer text-left shadow-2xs active:scale-95"
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <span className="text-[9.5px] text-slate-400 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              ))}

              {/* Typing Shimmer */}
              {isTyping && (
                <div className="flex items-center gap-2.5 text-slate-500 pt-1">
                  <GeminiSparkle className="h-5 w-5 shrink-0 animate-pulse" />
                  <div className="flex items-center gap-1 rounded-2xl bg-white border border-slate-200 px-3 py-2 shadow-2xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Bottom Input Card Container */}
          <div className="p-3 pt-0 shrink-0">
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-slate-200/90 bg-white p-2.5 shadow-sm hover:shadow-md transition-shadow relative"
            >
              {/* Context Pill at top of input card */}
              {contextAttached && (
                <div className="mb-2 flex items-center justify-between rounded-full bg-slate-100/90 px-3 py-1 text-[11.5px] text-slate-600">
                  <div className="flex items-center gap-1.5 truncate">
                    <ShieldCheck className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                    <span className="truncate font-medium">{contextLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setContextAttached(false)}
                    className="text-slate-400 hover:text-slate-700 p-0.5 rounded-full cursor-pointer ml-1"
                    title="Detach context"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Input Row */}
              <div className="flex items-center gap-1.5">
                {/* Plus Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPlusMenu((v) => !v)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                    title="Attach options"
                  >
                    <Plus className="h-4.5 w-4.5" />
                  </button>

                  {showPlusMenu && (
                    <div className="absolute bottom-full left-0 mb-1 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl text-xs z-50 animate-in fade-in zoom-in-95">
                      <button
                        type="button"
                        onClick={() => {
                          setContextAttached(true)
                          setShowPlusMenu(false)
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                        <span>Attach BUILD-SAFE Context</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSendMessage('Tell me about the Lasam CLUP zoning map layers')
                          setShowPlusMenu(false)
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-sky-600" />
                        <span>Query CLUP Map Layers</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Input Text Field */}
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type @ to add tabs"
                  className="flex-1 bg-transparent text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none px-1 py-1"
                />

                {/* Model Selector Dropdown Badge */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowModelMenu((v) => !v)}
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Select AI Model"
                  >
                    <span>{selectedModel}</span>
                    <ChevronDown className="h-3 w-3 text-slate-500" />
                  </button>

                  {showModelMenu && (
                    <div className="absolute bottom-full right-0 mb-1 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg text-xs z-50 animate-in fade-in zoom-in-95">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedModel('Auto')
                          setShowModelMenu(false)
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg cursor-pointer ${
                          selectedModel === 'Auto'
                            ? 'bg-slate-100 font-semibold text-slate-900'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Auto (Gemini 2.5 Flash)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedModel('CLUP Expert')
                          setShowModelMenu(false)
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg cursor-pointer ${
                          selectedModel === 'CLUP Expert'
                            ? 'bg-slate-100 font-semibold text-slate-900'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Lasam CLUP Expert
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedModel('MGB Hazard')
                          setShowModelMenu(false)
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg cursor-pointer ${
                          selectedModel === 'MGB Hazard'
                            ? 'bg-slate-100 font-semibold text-slate-900'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        MGB Hazard AI
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Action Button (Waveform audio icon when empty, Send icon when typing) */}
                {inputText.trim() ? (
                  <button
                    type="submit"
                    disabled={isTyping}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                    title="Send message"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      inputRef.current?.focus()
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                    title="Voice input / Audio mode"
                  >
                    <AudioLines className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </aside>
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
