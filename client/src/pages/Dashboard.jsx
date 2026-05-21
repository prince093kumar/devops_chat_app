import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { NotificationContext } from '../context/NotificationContext';
import api from '../services/api';
import { 
  MessageSquare, Hash, Users, Bell, LogOut, Send, 
  Plus, Check, MessageCircle, AlertCircle, Search, 
  Smile, Paperclip, Activity, Image, Menu, Info,
  X, Shield, Clock, ChevronRight, Globe
} from 'lucide-react';

const getAvatarGradient = (username) => {
  if (!username) return 'bg-violet-600';
  const colors = [
    'bg-violet-600', 'bg-emerald-600', 'bg-blue-600', 
    'bg-rose-600', 'bg-amber-600', 'bg-cyan-600', 'bg-pink-600'
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const LANGUAGES = [
  { code: 'original', name: 'Original 🌐' },
  { code: 'en', name: 'English 🇺🇸' },
  { code: 'es', name: 'Spanish 🇪🇸' },
  { code: 'fr', name: 'French 🇫🇷' },
  { code: 'de', name: 'German 🇩🇪' },
  { code: 'hi', name: 'Hindi 🇮🇳' },
  { code: 'zh-CN', name: 'Chinese 🇨🇳' },
  { code: 'ja', name: 'Japanese 🇯🇵' }
];

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const { notifications, unreadCount, markAsRead, clearAllNotifications } = useContext(NotificationContext);

  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [visibleUsernameMsgId, setVisibleUsernameMsgId] = useState(null);
  
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomIsPrivate, setNewRoomIsPrivate] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedLanguage, setSelectedLanguage] = useState('original');
  const [translatedMessages, setTranslatedMessages] = useState({});

  const [roomMembers, setRoomMembers] = useState({ admin: null, authorized: [] });
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/api/rooms');
      setRooms(res.data);
      if (res.data.length > 0 && !activeRoom) setActiveRoom(res.data[0]);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchRooms(); }, []);

  useEffect(() => {
    if (!activeRoom) return;
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/api/messages/${activeRoom._id}`);
        setMessages(res.data);
      } catch (err) { console.error(err); }
    };
    const fetchMembers = async () => {
      try {
        const res = await api.get(`/api/rooms/${activeRoom._id}/members`);
        setRoomMembers(res.data);
      } catch (err) { console.error(err); }
    };

    fetchMessages();
    fetchMembers();

    if (socket) socket.emit('joinRoom', activeRoom._id);
    setTypingUsers({});
    setInviteError(''); setInviteSuccess(''); setInviteUsername('');
  }, [activeRoom, socket]);

  useEffect(() => {
    if (!socket) return;
    const handleReceiveMessage = (message) => {
      if (activeRoom && message.roomId === activeRoom._id) {
        setMessages(prev => [...prev, message]);
      }
    };
    const handleOnlineUsersList = (users) => setOnlineUsers(users);
    const handleTyping = ({ username, isTyping }) => {
      setTypingUsers(prev => {
        const updated = { ...prev };
        if (isTyping) updated[username] = true;
        else delete updated[username];
        return updated;
      });
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('onlineUsersList', handleOnlineUsersList);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('onlineUsersList', handleOnlineUsersList);
      socket.off('typing', handleTyping);
    };
  }, [socket, activeRoom]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeRoom || !socket) return;
    socket.emit('sendMessage', { roomId: activeRoom._id, message: inputText.trim() });
    setInputText('');
    socket.emit('typing', { roomId: activeRoom._id, isTyping: false });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!socket || !activeRoom) return;
    socket.emit('typing', { roomId: activeRoom._id, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { roomId: activeRoom._id, isTyping: false });
    }, 2000);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setRoomError('');
    if (!newRoomName.trim()) return;
    try {
      const res = await api.post('/api/rooms', {
        name: newRoomName.trim(), description: newRoomDesc.trim(), isPrivate: newRoomIsPrivate
      });
      setRooms(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setActiveRoom(res.data);
      setShowCreateRoomModal(false);
      setNewRoomName(''); setNewRoomDesc(''); setNewRoomIsPrivate(false);
    } catch (err) { setRoomError(err.response?.data?.message || 'Failed to create room'); }
  };

  const handleAuthorizeUser = async (e) => {
    e.preventDefault();
    setInviteError(''); setInviteSuccess('');
    if (!inviteUsername.trim() || !activeRoom) return;
    try {
      const res = await api.post(`/api/rooms/${activeRoom._id}/authorize`, { username: inviteUsername.trim() });
      setInviteSuccess(res.data.message);
      setInviteUsername('');
      const updatedMembers = await api.get(`/api/rooms/${activeRoom._id}/members`);
      setRoomMembers(updatedMembers.data);
    } catch (err) { setInviteError(err.response?.data?.message || 'Failed to authorize user'); }
  };

  const filteredMessages = messages.filter(msg => 
    msg.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.senderUsername.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (selectedLanguage === 'original' || messages.length === 0) return;
    const translateMessages = async () => {
      const newTranslations = { ...translatedMessages };
      let updated = false;
      for (const msg of messages) {
        const cacheKey = `${msg._id || msg.timestamp}_${selectedLanguage}`;
        if (!newTranslations[cacheKey]) {
          try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${selectedLanguage}&dt=t&q=${encodeURIComponent(msg.message)}`);
            if (res.ok) {
              const data = await res.json();
              const translatedText = data[0].map(item => item[0]).join('');
              if (translatedText) { newTranslations[cacheKey] = translatedText; updated = true; }
            }
          } catch (err) {}
        }
      }
      if (updated) setTranslatedMessages(newTranslations);
    };
    translateMessages();
  }, [messages, selectedLanguage]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      
      {/* 1. LEFT SIDEBAR (Rooms & Navigation) */}
      {isLeftSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-slate-950/80 z-30 backdrop-blur-sm" onClick={() => setIsLeftSidebarOpen(false)} />
      )}
      <div className={`w-72 lg:w-72 h-full bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-40 fixed lg:relative transition-transform duration-300 ${isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Brand */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 text-violet-400">
            <MessageSquare className="w-6 h-6" />
            <span className="font-bold text-lg text-slate-100 tracking-tight">ChatPulse</span>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto px-2 space-y-5 scrollbar-thin">
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Channels</span>
              <button onClick={() => setShowCreateRoomModal(true)} className="text-slate-400 hover:text-violet-400 transition-colors p-1 rounded hover:bg-slate-800">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-0.5">
              {rooms.map(room => {
                const isActive = activeRoom?._id === room._id;
                return (
                  <button
                    key={room._id}
                    onClick={() => { setActiveRoom(room); setIsLeftSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive ? 'bg-violet-500/10 text-violet-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {room.adminId ? <Shield className="w-4 h-4 shrink-0 opacity-70" /> : <Hash className="w-4 h-4 shrink-0 opacity-70" />}
                    <span className="truncate flex-1 text-left">{room.name}</span>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`w-9 h-9 rounded-lg ${getAvatarGradient(user?.username)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
              {user?.username?.substring(0, 2).toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.username}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role || 'Member'}</p>
            </div>
          </div>
          <button onClick={logout} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative z-10">
        
        {/* Header */}
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4 lg:px-6 bg-slate-950/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <button onClick={() => setIsLeftSidebarOpen(true)} className="lg:hidden p-1.5 -ml-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            {activeRoom && (
              <div className="truncate">
                <h1 className="font-semibold text-slate-100 flex items-center gap-2 truncate text-sm md:text-base">
                  {activeRoom.adminId ? <Shield className="w-4 h-4 text-violet-400" /> : <Hash className="w-4 h-4 text-slate-400" />}
                  {activeRoom.name}
                </h1>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
            {/* Language Selector */}
            <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 md:py-1.5 hover:border-slate-700 transition-colors">
              <Globe className="w-3.5 h-3.5 text-slate-400 mr-2 hidden sm:block" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-transparent text-slate-300 text-[10px] md:text-xs font-medium focus:outline-none cursor-pointer w-20 md:w-auto"
              >
                {LANGUAGES.map(lang => <option key={lang.code} value={lang.code} className="bg-slate-900">{lang.name}</option>)}
              </select>
            </div>

            {/* Right Sidebar Toggle (Room Info) */}
            <button 
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className={`p-1.5 md:p-2 rounded-lg transition-colors border ${isRightSidebarOpen ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              title="Room Info"
            >
              <Info className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6 scrollbar-thin">
          {filteredMessages.map((msg, index) => {
            const isSelf = msg.senderId === (user?.id || user?._id);
            const msgKey = msg._id || index;
            return (
              <div key={msgKey} className={`flex gap-3 max-w-[90%] lg:max-w-[75%] group ${isSelf ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                <div 
                  onClick={() => setVisibleUsernameMsgId(visibleUsernameMsgId === msgKey ? null : msgKey)}
                  className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-xs cursor-pointer hover:opacity-80 transition-opacity ${getAvatarGradient(msg.senderUsername)}`}
                  title="Click to show username"
                >
                  {msg.senderUsername ? msg.senderUsername.substring(0, 2).toUpperCase() : '??'}
                </div>
                <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                  {!isSelf && visibleUsernameMsgId === msgKey && (
                    <span className="text-[11px] text-slate-400 font-medium mb-1 ml-1 animate-in fade-in slide-in-from-bottom-1 duration-200">
                      {msg.senderUsername}
                    </span>
                  )}
                  
                  <div className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed transition-all relative group-hover:shadow-md ${
                    isSelf 
                      ? 'bg-violet-600 text-white rounded-tr-sm' 
                      : 'bg-slate-800 border border-slate-700/50 text-slate-200 rounded-tl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap font-medium">
                      {selectedLanguage !== 'original' && translatedMessages[`${msg._id || msg.timestamp}_${selectedLanguage}`]
                        ? translatedMessages[`${msg._id || msg.timestamp}_${selectedLanguage}`]
                        : msg.message
                      }
                    </p>
                    {selectedLanguage !== 'original' && translatedMessages[`${msg._id || msg.timestamp}_${selectedLanguage}`] && (
                      <div className="text-[9px] text-violet-300 font-bold mt-1 opacity-80 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Translated
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 mx-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          {filteredMessages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800">
                <MessageCircle className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm">No messages yet. Say hello!</p>
            </div>
          )}
          <div ref={messageEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-slate-950 shrink-0">
          <div className="max-w-5xl mx-auto">
            {/* Typing Indicator */}
            <div className="h-5 flex items-center pl-2 mb-1.5">
              {Object.keys(typingUsers).length > 0 && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span className="font-semibold text-violet-400">{Object.keys(typingUsers).join(', ')}</span> is typing
                  <span className="flex gap-0.5 ml-1">
                    <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </span>
              )}
            </div>
            
            <form onSubmit={handleSendMessage} className="bg-slate-900 border border-slate-800 focus-within:border-violet-500/50 rounded-xl transition-colors shadow-sm flex items-center gap-2 p-1.5 md:p-2">
              <div className="hidden sm:flex items-center gap-1 pl-1">
                <button type="button" className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"><Paperclip className="w-4 h-4" /></button>
                <button type="button" className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"><Image className="w-4 h-4" /></button>
              </div>
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder={activeRoom ? `Message #${activeRoom.name}...` : 'Select a channel'}
                disabled={!activeRoom}
                className="flex-1 bg-transparent border-none text-slate-200 placeholder-slate-500 focus:outline-none text-sm px-2 py-2"
              />
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors hidden sm:block"><Smile className="w-4 h-4" /></button>
                <button
                  type="submit"
                  disabled={!inputText.trim() || !activeRoom}
                  className="p-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:hover:bg-violet-600 text-white rounded-lg transition-colors flex items-center justify-center"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 3. RIGHT SIDEBAR (Room Details) */}
      {isRightSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-slate-950/80 z-30 backdrop-blur-sm" onClick={() => setIsRightSidebarOpen(false)} />
      )}
      <div className={`w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 z-40 fixed right-0 lg:relative transition-transform duration-300 ${isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full'} ${!isRightSidebarOpen ? 'lg:hidden' : 'lg:flex'}`}>
        
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 shrink-0">
          <span className="font-semibold text-slate-200">Room Details</span>
          <button onClick={() => setIsRightSidebarOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {activeRoom ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
            
            {/* Room Overview */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center">
                {activeRoom.adminId ? <Shield className="w-8 h-8 text-violet-400" /> : <Hash className="w-8 h-8 text-slate-400" />}
              </div>
              <div>
                <h2 className="font-bold text-slate-100 text-lg">{activeRoom.name}</h2>
                <p className="text-xs text-slate-400 mt-1">{activeRoom.description || 'No description provided.'}</p>
              </div>
            </div>

            {/* Manage Access Section (Admin only) */}
            {activeRoom.adminId && (
              <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" /> Manage Access
                </h3>
                
                {activeRoom.adminId === (user?.id || user?._id) ? (
                  <form onSubmit={handleAuthorizeUser} className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inviteUsername}
                        onChange={(e) => setInviteUsername(e.target.value)}
                        placeholder="Username"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                        required
                      />
                      <button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors">
                        Add
                      </button>
                    </div>
                    {inviteError && <div className="text-[10px] text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{inviteError}</div>}
                    {inviteSuccess && <div className="text-[10px] text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" />{inviteSuccess}</div>}
                  </form>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">Only the channel admin can manage access.</p>
                )}
              </div>
            )}

            {/* Member List */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                Members
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[10px]">{roomMembers.authorized?.length + (roomMembers.admin ? 1 : 0) || 0}</span>
              </h3>
              <div className="space-y-2">
                {roomMembers.admin && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-950/30 border border-slate-800/50">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white ${getAvatarGradient(roomMembers.admin.username)}`}>
                      {roomMembers.admin.username.substring(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{roomMembers.admin.username}</p>
                      <p className="text-[10px] text-violet-400 font-semibold">Admin</p>
                    </div>
                  </div>
                )}
                {roomMembers.authorized && roomMembers.authorized.map(member => (
                  <div key={member.id || member._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors cursor-default">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white ${getAvatarGradient(member.username)}`}>
                      {member.username.substring(0,2).toUpperCase()}
                    </div>
                    <p className="text-sm font-medium text-slate-300 truncate">{member.username}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="p-5 text-center text-sm text-slate-500">Select a room to view details</div>
        )}
      </div>

      {/* CREATE ROOM MODAL */}
      {showCreateRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-bold text-slate-100 mb-1">Create Channel</h2>
            <p className="text-xs text-slate-400 mb-5">Start a new discussion space.</p>
            {roomError && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg">{roomError}</div>}
            
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">Channel Name</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-violet-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">Description</label>
                <input
                  type="text"
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="privateCheck"
                  checked={newRoomIsPrivate}
                  onChange={(e) => setNewRoomIsPrivate(e.target.checked)}
                  className="w-4 h-4 rounded text-violet-500 bg-slate-950 border-slate-700 focus:ring-violet-500"
                />
                <label htmlFor="privateCheck" className="text-sm text-slate-300 cursor-pointer">Private Group Channel 🔒</label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-2">
                <button type="button" onClick={() => setShowCreateRoomModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
