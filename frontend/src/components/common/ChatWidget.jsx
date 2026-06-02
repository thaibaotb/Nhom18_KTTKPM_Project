import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, MessageCircle, Send, Sparkles, X, Loader2, Headphones, Smile, Image as ImageIcon } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { sendAiAssistantMessage } from '../../services/aiAssistantApi';
import { apiRequest } from '../../services/api/client';
import AIProductCard from './AIProductCard';

const INITIAL_SUGGESTIONS = [
  'iPhone 16 còn hàng không?',
  'Điện thoại dưới 15 triệu',
  'So sánh iPhone 16 và Samsung S25 Ultra',
  'Chính sách đổi trả như thế nào?'
];

const STORAGE_KEY = 'ai-assistant-widget-history';

function createWelcomeMessage(userName, assistantName) {
  return {
    id: 'welcome',
    role: 'assistant',
    content: `Xin chào ${userName}! Mình là ${assistantName}. Hãy hỏi mình về tồn kho, tìm sản phẩm, so sánh hoặc FAQ.`,
    createdAt: new Date().toISOString(),
    suggestedQuestions: INITIAL_SUGGESTIONS,
    products: []
  };
}

function loadPersistedMessages() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const ChatWidget = () => {
  const { 
    isOpen, 
    setIsOpen, 
    socket, 
    connect, 
    messages: adminMessages, 
    setMessages: setAdminMessages, 
    activeConversation, 
    setActiveConversation, 
    isTyping: isAdminTyping 
  } = useChatStore();

  const { user, token } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' or 'admin'
  const [aiInputValue, setAiInputValue] = useState('');
  const [adminInputValue, setAdminInputValue] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState(INITIAL_SUGGESTIONS);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const assistantName = useMemo(() => 'ELPPA Assistant', []);
  const userName = user?.full_name || user?.fullName || user?.name || 'bạn';

  const [aiMessages, setAiMessages] = useState(() => {
    const persistedMessages = loadPersistedMessages();
    return persistedMessages.length > 0 ? persistedMessages : [createWelcomeMessage(userName, assistantName)];
  });

  useEffect(() => {
    setSuggestedQuestions((current) => (current.length > 0 ? current : INITIAL_SUGGESTIONS));
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(aiMessages));
  }, [aiMessages]);

  useEffect(() => {
    if (token) connect(token);
  }, [token]);

  useEffect(() => {
    if (isOpen && token) {
      if (activeTab === 'admin') {
        if (!activeConversation) {
          fetchMyConversation();
        } else {
          fetchMessages(activeConversation._id);
        }
      }
    }
  }, [isOpen, activeTab, token]);

  useEffect(() => {
    if (socket && activeConversation && activeTab === 'admin') {
      socket.emit('join_conversation', activeConversation._id);
    }
  }, [socket, activeConversation, activeTab]);

  useEffect(() => {
    scrollToBottom();
  }, [aiMessages, adminMessages, isAiTyping, isAdminTyping, isOpen, activeTab]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toHistoryPayload = (list) =>
    list
      .slice(-8)
      .map((item) => ({
        role: item.role,
        content: item.content
      }));

  const fetchMyConversation = async () => {
    try {
      const res = await apiRequest('/api/chat/my-conversation');
      const result = await res.json();
      if (result.success && result.data) {
        setActiveConversation(result.data);
        fetchMessages(result.data._id);
        if (socket) {
          socket.emit('join_conversation', result.data._id);
        }
      }
    } catch (err) {
      console.error('Fetch conversation error:', err);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      const res = await apiRequest(`/api/chat/messages/${convId}`);
      const result = await res.json();
      if (result.success) {
        setAdminMessages(result.data);
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  };

  const sendAiMessage = async (text) => {
    const content = String(text || '').trim();
    if (!content || isAiTyping) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      products: []
    };

    const nextMessages = [...aiMessages, userMessage];
    setAiMessages(nextMessages);
    setAiInputValue('');
    setIsAiTyping(true);

    try {
      const data = await sendAiAssistantMessage({
        message: content,
        history: toHistoryPayload(nextMessages)
      });

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        intent: data.intent,
        entities: data.entities,
        products: Array.isArray(data.products) ? data.products : [],
        comparison: Array.isArray(data.comparison) ? data.comparison : [],
        faq: Array.isArray(data.faq) ? data.faq : [],
        createdAt: new Date().toISOString(),
        suggestedQuestions: data.suggestedQuestions || INITIAL_SUGGESTIONS
      };

      setAiMessages((current) => [...current, assistantMessage]);
      setSuggestedQuestions(assistantMessage.suggestedQuestions);
    } catch (error) {
      setAiMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Mình đang gặp lỗi khi kết nối AI. Bạn vui lòng thử lại sau vài giây.',
          createdAt: new Date().toISOString(),
          products: [],
          suggestedQuestions: INITIAL_SUGGESTIONS
        }
      ]);
      setSuggestedQuestions(INITIAL_SUGGESTIONS);
      console.error('AI assistant error:', error);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSendAdminMessage = () => {
    if (!adminInputValue.trim() || !socket) return;

    socket.emit('send_message', {
      conversationId: activeConversation?._id,
      content: adminInputValue,
      senderId: user.id || user.userId,
      senderRole: 'user',
      userName: user.full_name || user.fullName
    });

    setAdminInputValue('');
  };

  const handleAdminImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !socket) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      socket.emit('send_message', {
        conversationId: activeConversation?._id,
        content: '',
        senderId: user.id || user.userId,
        senderRole: 'user',
        userName: user.full_name || user.fullName,
        messageType: 'image',
        attachments: [{
          type: 'image',
          url: reader.result
        }]
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAdminTyping = (e) => {
    setAdminInputValue(e.target.value);
    if (!socket || !activeConversation) return;

    socket.emit('typing_start', { 
      conversationId: activeConversation._id,
      receiverId: 'admin'
    });

    clearTimeout(window.typingTimer);
    window.typingTimer = setTimeout(() => {
      socket.emit('typing_stop', { conversationId: activeConversation._id });
    }, 2000);
  };

  const onEmojiClick = (emojiData) => {
    setAdminInputValue(prev => prev + emojiData.emoji);
    setShowEmoji(false);
  };

  const handleSuggestionClick = (question) => {
    sendAiMessage(question);
  };

  if (!user || user.role === 'admin') return null;

  return (
    <div className="fixed bottom-6 right-6 z-9999 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            className="mb-4 w-[min(92vw,440px)] h-[min(78vh,680px)] bg-white rounded-[28px] shadow-[0_30px_80px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col border border-elppa-gray-border/60"
          >
            {/* Dynamic Premium Header */}
            <div className="bg-linear-to-r from-elppa-obsidian to-[#2c2c2e] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/12 flex items-center justify-center border border-white/15 backdrop-blur-sm relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    {activeTab === 'ai' ? (
                      <motion.div
                        key="ai-icon"
                        initial={{ rotate: -30, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: 30, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Bot size={22} className="text-purple-300" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="admin-icon"
                        initial={{ rotate: -30, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: 30, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Headphones size={22} className="text-blue-300" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <AnimatePresence mode="wait">
                    {activeTab === 'ai' ? (
                      <motion.div
                        key="ai-title"
                        initial={{ y: 5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -5, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <h4 className="font-semibold leading-none">AI Shopping Assistant</h4>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[10px] text-white/75 font-medium uppercase tracking-[0.22em]">
                            Ollama online
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="admin-title"
                        initial={{ y: 5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -5, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <h4 className="font-semibold leading-none">Hỗ trợ khách hàng</h4>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[10px] text-white/75 font-medium uppercase tracking-[0.22em]">
                            Trực tuyến
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Close assistant"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sliding Premium Tab Switcher */}
            <div className="bg-white/80 border-b border-elppa-gray-border/40 px-4 py-2 flex-none">
              <div className="flex bg-elppa-gray-subtle p-1 rounded-2xl relative">
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl transition-all relative z-10 ${
                    activeTab === 'ai' ? 'text-elppa-obsidian' : 'text-elppa-gray hover:text-elppa-obsidian'
                  }`}
                >
                  <Sparkles size={14} className={activeTab === 'ai' ? 'text-purple-500' : ''} />
                  Trợ lý AI
                </button>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl transition-all relative z-10 ${
                    activeTab === 'admin' ? 'text-elppa-obsidian' : 'text-elppa-gray hover:text-elppa-obsidian'
                  }`}
                >
                  <Headphones size={14} className={activeTab === 'admin' ? 'text-elppa-blue' : ''} />
                  Hỗ trợ viên
                </button>
                {/* Sliding indicator */}
                <motion.div
                  className="absolute top-1 bottom-1 rounded-xl bg-white shadow-xs border border-elppa-gray-border/20"
                  layoutId="activeTabPill"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  style={{
                    left: activeTab === 'ai' ? '4px' : 'calc(50% + 2px)',
                    width: 'calc(50% - 6px)',
                  }}
                />
              </div>
            </div>

            {/* Messages Content Area */}
            <div className="flex-1 overflow-y-auto bg-[#fafafa] px-4 py-5 space-y-4 no-scrollbar">
              {activeTab === 'admin' && adminMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-elppa-blue shadow-xs">
                    <Headphones size={32} />
                  </div>
                  <div>
                    <p className="font-bold text-elppa-obsidian">Chào {userName}!</p>
                    <p className="text-xs text-elppa-gray mt-1 leading-relaxed">
                      Đội ngũ ELPPA sẵn sàng hỗ trợ bạn. Hãy gửi câu hỏi cho chúng tôi nhé.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'ai' ? (
                // AI Messages
                aiMessages.map((message) => {
                  const isUser = message.role === 'user';
                  return (
                    <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[88%] ${isUser ? 'ml-8' : 'mr-8'}`}>
                        <div
                          className={`rounded-[22px] px-4 py-3 text-sm leading-relaxed ${
                            isUser
                              ? 'bg-linear-to-r from-elppa-blue to-blue-600 text-white rounded-br-md shadow-xs'
                              : 'bg-white text-elppa-obsidian border border-elppa-gray-border/60 rounded-bl-md shadow-xs'
                          }`}
                        >
                          {!isUser && (
                            <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-[0.24em] text-elppa-gray font-semibold">
                              <Sparkles size={11} className="text-purple-500 animate-pulse" />
                              <span>{assistantName}</span>
                            </div>
                          )}
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>

                        {!isUser && Array.isArray(message.products) && message.products.length > 0 && (
                          <div className="mt-3 grid grid-cols-1 gap-3">
                            {message.products.slice(0, 4).map((product) => (
                              <AIProductCard key={product._id} product={product} />
                            ))}
                          </div>
                        )}

                        {!isUser && Array.isArray(message.comparison) && message.comparison.length > 0 && (
                          <div className="mt-3 grid grid-cols-1 gap-3">
                            {message.comparison.map((item) => (
                              <AIProductCard
                                key={item.id}
                                product={{
                                  _id: item.id,
                                  name: item.name,
                                  category: item.category,
                                  price: item.price,
                                  stock: item.stock,
                                  image: item.image,
                                  averageRating: item.averageRating,
                                  numReviews: item.numReviews,
                                  highlights: item.highlights
                                }}
                              />
                            ))}
                          </div>
                        )}

                        <p className={`mt-1.5 text-[9px] ${isUser ? 'text-right text-elppa-gray/80' : 'text-elppa-gray'}`}>
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Admin Messages
                adminMessages.map((msg, idx) => {
                  const isMe = msg.senderRole === 'user';
                  return (
                    <div key={msg._id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[88%] ${isMe ? 'ml-8' : 'mr-8'}`}>
                        <div
                          className={`rounded-[22px] px-4 py-3 text-sm leading-relaxed ${
                            isMe
                              ? 'bg-linear-to-r from-elppa-blue to-blue-600 text-white rounded-br-md shadow-xs'
                              : 'bg-white text-elppa-obsidian border border-elppa-gray-border/60 rounded-bl-md shadow-xs'
                          }`}
                        >
                          {!isMe && (
                            <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-[0.24em] text-elppa-gray font-semibold">
                              <Headphones size={11} className="text-elppa-blue" />
                              <span>Hỗ trợ viên ({msg.userName || 'Admin'})</span>
                            </div>
                          )}
                          
                          {msg.messageType === 'image' && msg.attachments?.[0]?.url && (
                            <div className="mb-2 rounded-lg overflow-hidden border border-elppa-gray-border/30 max-w-[240px]">
                              <img 
                                src={msg.attachments[0].url} 
                                alt="Sent attachment" 
                                className="max-w-full h-auto object-cover cursor-zoom-in"
                                onClick={() => window.open(msg.attachments[0].url, '_blank')}
                              />
                            </div>
                          )}
                          {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                        </div>

                        <p className={`mt-1.5 text-[9px] ${isMe ? 'text-right text-elppa-gray/80' : 'text-elppa-gray'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicators */}
              {activeTab === 'ai' && isAiTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-elppa-gray-border/60 shadow-xs rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-elppa-blue" />
                    <span className="text-xs text-elppa-gray font-medium">Đang suy nghĩ...</span>
                  </div>
                </div>
              )}

              {activeTab === 'admin' && isAdminTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-elppa-gray-border/60 shadow-xs rounded-2xl px-4 py-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-elppa-blue rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-elppa-blue rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-elppa-blue rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    <span className="text-xs text-elppa-gray font-medium ml-1">Hỗ trợ viên đang nhập...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar Area */}
            <div className="border-t border-elppa-gray-border/70 bg-white px-4 py-4 relative flex-none">
              {showEmoji && activeTab === 'admin' && (
                <div className="absolute bottom-full right-4 mb-2 z-[10001]">
                  <div className="shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden border border-elppa-gray-border/50 bg-white">
                    <EmojiPicker 
                      onEmojiClick={onEmojiClick}
                      width={300}
                      height={360}
                      previewConfig={{ showPreview: false }}
                    />
                  </div>
                </div>
              )}

              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleAdminImageUpload}
                accept="image/*"
                className="hidden"
              />

              {activeTab === 'ai' ? (
                <div className="space-y-3">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {suggestedQuestions.map((question) => (
                      <button
                        key={question}
                        onClick={() => handleSuggestionClick(question)}
                        className="whitespace-nowrap rounded-full border border-elppa-gray-border bg-elppa-gray-subtle/80 px-3 py-2 text-[11px] font-medium text-elppa-obsidian transition-colors hover:border-elppa-blue hover:text-elppa-blue shadow-xs"
                      >
                        {question}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); sendAiMessage(aiInputValue); }} className="flex items-center gap-2 bg-elppa-gray-subtle rounded-2xl px-4 py-2">
                    <Sparkles size={16} className="text-purple-500 animate-pulse" />
                    <input
                      type="text"
                      placeholder="Hỏi về sản phẩm, giá hoặc tồn kho..."
                      className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-sm py-2 placeholder:text-elppa-gray"
                      value={aiInputValue}
                      onChange={(e) => setAiInputValue(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={!aiInputValue.trim() || isAiTyping}
                      className={`p-2 rounded-xl transition-all ${
                        aiInputValue.trim() && !isAiTyping
                          ? 'bg-linear-to-r from-purple-600 to-elppa-blue text-white shadow-md hover:brightness-110'
                          : 'bg-white text-elppa-gray border border-elppa-gray-border cursor-not-allowed'
                      }`}
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-elppa-gray-subtle rounded-2xl px-4 py-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-elppa-gray hover:text-elppa-blue transition-colors p-1"
                    title="Gửi ảnh"
                  >
                    <ImageIcon size={18} />
                  </button>
                  <input 
                    type="text"
                    placeholder="Nhập tin nhắn hỗ trợ..."
                    className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-sm py-2 placeholder:text-elppa-gray"
                    value={adminInputValue}
                    onChange={handleAdminTyping}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendAdminMessage()}
                  />
                  <button 
                    onClick={() => setShowEmoji(!showEmoji)}
                    className={`p-1 transition-colors ${showEmoji ? 'text-elppa-blue' : 'text-elppa-gray hover:text-elppa-blue'}`}
                    title="Thêm biểu cảm"
                  >
                    <Smile size={18} />
                  </button>
                  <button 
                    onClick={handleSendAdminMessage}
                    disabled={!adminInputValue.trim()}
                    className={`p-2 rounded-xl transition-all ${
                      adminInputValue.trim() 
                      ? 'bg-elppa-blue text-white shadow-md hover:brightness-110' 
                      : 'bg-white text-elppa-gray border border-elppa-gray-border cursor-not-allowed'
                    }`}
                  >
                    <Send size={16} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-linear-to-br from-elppa-blue to-[#004d99] text-white rounded-full shadow-2xl flex items-center justify-center hover:brightness-110 transition-all border-4 border-white"
        aria-label="Open support widget"
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </motion.button>
    </div>
  );
};

export default ChatWidget;