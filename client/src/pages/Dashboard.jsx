import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { NotificationContext } from '../context/NotificationContext';
import api from '../services/api';
import { 
  MessageSquare, Hash, Users, Bell, LogOut, Send, 
  Plus, Check, MessageCircle, AlertCircle, Sparkles,
  Search, Smile, Paperclip, Mic, Settings, Activity,
  ChevronRight, Image, MoreVertical, ShieldAlert
} from 'lucide-react';

// Premium avatar color generator
const getAvatarGradient = (username) => {
  if (!username) return 'from-indigo-500 to-purple-500';
  const colors = [
    'from-pink-500 via-rose-500 to-red-500',
    'from-indigo-500 via-purple-500 to-fuchsia-500',
    'from-blue-500 via-cyan-500 to-teal-500',
    'from-emerald-400 via-teal-500 to-cyan-500',
    'from-amber-400 via-orange-500 to-rose-500',
    'from-violet-500 via-purple-600 to-indigo-700',
    'from-rose-400 via-pink-500 to-purple-500'
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const LANGUAGES = [
  { code: 'original', name: 'Original Language 🌐' },
  { code: 'en', name: 'English 🇺🇸' },
  { code: 'es', name: 'Spanish 🇪🇸' },
  { code: 'fr', name: 'French 🇫🇷' },
  { code: 'de', name: 'German 🇩🇪' },
  { code: 'hi', name: 'Hindi 🇮🇳' },
  { code: 'zh-CN', name: 'Chinese 🇨🇳' },
  { code: 'ja', name: 'Japanese 🇯🇵' },
  { code: 'ar', name: 'Arabic 🇸🇦' },
  { code: 'ru', name: 'Russian 🇷🇺' }
];

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const { notifications, unreadCount, markAsRead, clearAllNotifications } = useContext(NotificationContext);

  // States
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({}); // { username: true }
  
  // UI States
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomIsPrivate, setNewRoomIsPrivate] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-Translation States
  const [selectedLanguage, setSelectedLanguage] = useState('original');
  const [translatedMessages, setTranslatedMessages] = useState({});

  // Group Authorization States
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [roomMembers, setRoomMembers] = useState({ admin: null, authorized: [] });
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const openManageAccessModal = async () => {
    if (!activeRoom) return;
    setShowAccessModal(true);
    setInviteError('');
    setInviteSuccess('');
    setInviteUsername('');
    
    try {
      const res = await api.get(`/api/rooms/${activeRoom._id}/members`);
      setRoomMembers(res.data);
    } catch (err) {
      console.error('Error fetching room members:', err);
    }
  };

  const handleAuthorizeUser = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    if (!inviteUsername.trim() || !activeRoom) return;

    try {
      const res = await api.post(`/api/rooms/${activeRoom._id}/authorize`, {
        username: inviteUsername.trim()
      });
      setInviteSuccess(res.data.message);
      setInviteUsername('');
      
      const updatedMembers = await api.get(`/api/rooms/${activeRoom._id}/members`);
      setRoomMembers(updatedMembers.data);
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to authorize user.');
    }
  };

  // Refs
  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch Rooms
  const fetchRooms = async () => {
    try {
      const res = await api.get('/api/rooms');
      setRooms(res.data);
      if (res.data.length > 0 && !activeRoom) {
        setActiveRoom(res.data[0]); // default to first room (General)
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  // Fetch initial rooms on mount
  useEffect(() => {
    fetchRooms();
  }, []);

  // Fetch messages when room changes, and handle socket room joining
  useEffect(() => {
    if (!activeRoom) return;

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/api/messages/${activeRoom._id}`);
        setMessages(res.data);
      } catch (err) {
        console.error('Error fetching room messages:', err);
      }
    };

    fetchMessages();

    // Join room in socket
    if (socket) {
      socket.emit('joinRoom', activeRoom._id);
    }

    // Reset typing indicators for new room
    setTypingUsers({});
  }, [activeRoom, socket]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen to messages
    const handleReceiveMessage = (message) => {
      // Append only if message belongs to active room
      if (activeRoom && message.roomId === activeRoom._id) {
        setMessages(prev => [...prev, message]);
      }
    };

    // Listen to online users
    const handleOnlineUsersList = (users) => {
      setOnlineUsers(users);
    };

    // Listen to typing indicators
    const handleTyping = ({ username, isTyping }) => {
      setTypingUsers(prev => {
        const updated = { ...prev };
        if (isTyping) {
          updated[username] = true;
        } else {
          delete updated[username];
        }
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

  // Scroll to bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Handle message send
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeRoom || !socket) return;

    // Emit message to Socket
    socket.emit('sendMessage', {
      roomId: activeRoom._id,
      message: inputText.trim()
    });

    setInputText('');

    // Emit typing stop immediately
    socket.emit('typing', { roomId: activeRoom._id, isTyping: false });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  // Handle typing keypress
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!socket || !activeRoom) return;

    // Emit typing start
    socket.emit('typing', { roomId: activeRoom._id, isTyping: true });

    // Debounce typing stop
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { roomId: activeRoom._id, isTyping: false });
    }, 2000);
  };

  // Handle room creation
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setRoomError('');
    if (!newRoomName.trim()) return;

    try {
      const res = await api.post('/api/rooms', {
        name: newRoomName.trim(),
        description: newRoomDesc.trim(),
        isPrivate: newRoomIsPrivate
      });
      setRooms(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setActiveRoom(res.data);
      setShowCreateRoomModal(false);
      setNewRoomName('');
      setNewRoomDesc('');
      setNewRoomIsPrivate(false);
    } catch (err) {
      setRoomError(err.response?.data?.message || 'Failed to create room.');
    }
  };

  // Filter messages based on search query
  const filteredMessages = messages.filter(msg => 
    msg.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.senderUsername.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic Real-Time Auto-Translation Hook
  useEffect(() => {
    if (selectedLanguage === 'original' || messages.length === 0) return;

    const translateMessages = async () => {
      const newTranslations = { ...translatedMessages };
      let updated = false;

      for (const msg of messages) {
        const cacheKey = `${msg._id || msg.timestamp}_${selectedLanguage}`;
        if (!newTranslations[cacheKey]) {
          try {
            const res = await fetch(
              `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${selectedLanguage}&dt=t&q=${encodeURIComponent(msg.message)}`
            );
            if (res.ok) {
              const data = await res.json();
              const translatedText = data[0].map(item => item[0]).join('');
              if (translatedText) {
                newTranslations[cacheKey] = translatedText;
                updated = true;
              }
            }
          } catch (err) {
            console.error('Translation error for message:', msg._id, err);
          }
        }
      }

      if (updated) {
        setTranslatedMessages(newTranslations);
      }
    };

    translateMessages();
  }, [messages, selectedLanguage]);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100 font-sans relative">
      
      {/* Dynamic Ambient Background Light Blobs */}
      <div className="absolute top-[-100px] right-[-100px] w-[650px] h-[650px] bg-gradient-to-tr from-indigo-500/15 to-purple-500/15 rounded-full blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-100px] left-[15%] w-[550px] h-[550px] bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-[130px] pointer-events-none z-0"></div>
      <div className="absolute top-[35%] left-[-150px] w-[450px] h-[450px] bg-gradient-to-r from-blue-500/8 to-indigo-500/8 rounded-full blur-[110px] pointer-events-none z-0"></div>

      {/* 1. ROOMS SIDEBAR */}
      <div className="w-80 h-full bg-slate-950/80 border-r border-slate-900/60 flex flex-col shrink-0 z-10 backdrop-blur-xl relative">
        
        {/* Workspace Brand / Header */}
        <div className="p-5 border-b border-slate-900/60 flex items-center justify-between bg-slate-900/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-xl text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-300 via-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-1.5">
                ChatPulse <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              </span>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide">ENTERPRISE WORKSPACE</p>
            </div>
          </div>
        </div>

        {/* Sidebar Search Bar */}
        <div className="px-4 pt-4">
          <div className="relative group">
            <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search chat history..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/40 border border-slate-800/80 hover:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/10 focus:bg-slate-950/80 transition-all font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-bold"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Channels & Online Users */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-12 space-y-6 scrollbar-thin min-h-0">
          
          {/* Channels Section */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-500" /> Channels ({rooms.length})
              </span>
              <button 
                onClick={() => setShowCreateRoomModal(true)}
                className="hover:text-indigo-400 transition-all p-1 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800"
                title="Create Channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="space-y-1">
              {rooms.map(room => {
                const isActive = activeRoom?._id === room._id;
                return (
                  <button
                    key={room._id}
                    onClick={() => setActiveRoom(room)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-medium transition-all group ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-pink-500/5 border border-indigo-500/20 text-indigo-200 shadow-md shadow-indigo-500/[0.02]'
                        : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg transition-colors ${
                      isActive ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-900/30 text-slate-500 group-hover:text-slate-400'
                    }`}>
                      {room.adminId ? (
                        <span className="text-xs font-bold leading-none select-none text-indigo-400">🔒</span>
                      ) : (
                        <Hash className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="truncate flex-1">
                      <p className={`font-semibold transition-colors ${isActive ? 'text-slate-100' : 'text-slate-300'}`}>{room.name}</p>
                      {room.description && (
                        <p className="text-[11px] text-slate-500 truncate font-normal mt-0.5">{room.description}</p>
                      )}
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-600 transition-transform ${isActive ? 'translate-x-0.5 text-indigo-400' : 'opacity-0 group-hover:opacity-100'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Online Users Section */}
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Online Now ({onlineUsers.length})</span>
            </div>

            <div className="space-y-2.5 px-2">
              {onlineUsers.map((username, index) => {
                const userGrad = getAvatarGradient(username);
                return (
                  <div key={index} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-900/40 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`w-8 h-8 bg-gradient-to-tr ${userGrad} rounded-xl flex items-center justify-center font-extrabold text-[11px] text-white shadow-md`}>
                          {username.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-[2.5px] border-slate-950 rounded-full animate-pulse"></div>
                      </div>
                      <span className="text-xs font-semibold text-slate-300 group-hover:text-slate-100 transition-colors truncate max-w-40">{username}</span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/20 border border-emerald-400/30 group-hover:scale-125 transition-transform"></div>
                  </div>
                );
              })}
              {onlineUsers.length === 0 && (
                <div className="py-4 text-center border border-dashed border-slate-900 rounded-xl bg-slate-900/10">
                  <p className="text-xs text-slate-600 italic">No users online</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-900/60 bg-slate-950 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${getAvatarGradient(user?.username)} flex items-center justify-center text-white font-extrabold text-xs shadow-lg shadow-indigo-500/10 border border-white/10`}>
              {user?.username?.substring(0, 2).toUpperCase()}
            </div>
            <div className="truncate w-32">
              <p className="text-sm font-bold text-slate-100 truncate">{user?.username}</p>
              <span className="inline-flex items-center gap-1 mt-0.5 text-[9px] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-wide">
                <Activity className="w-2.5 h-2.5" /> {user?.role || 'User'}
              </span>
            </div>
          </div>
          <button 
            onClick={logout}
            className="p-2.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-xl transition-all border border-transparent hover:border-rose-500/10 flex items-center justify-center shrink-0"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* 2. MAIN CHAT AREA */}
      <div className="flex-1 h-full flex flex-col bg-slate-950/20 backdrop-blur-2xl z-10 overflow-hidden">
        
        {/* Chat Header */}
        <div className="h-20 border-b border-slate-900/60 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-xl relative shrink-0">
          
          <div className="flex items-center gap-3">
            {activeRoom ? (
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-900/80 border border-slate-800/80 rounded-xl text-indigo-400 shadow-sm flex items-center justify-center">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-extrabold text-slate-100 text-base tracking-tight">{activeRoom.name}</h1>
                    {activeRoom.adminId ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-500/15 border border-indigo-500/30 rounded-full text-[10px] text-indigo-400 font-bold shadow-md shadow-indigo-500/5">
                        <span>🔒 PRIVATE GROUP</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-900/80 border border-slate-800/85 rounded-full text-[10px] text-slate-400 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>PUBLIC CHANNEL</span>
                      </div>
                    )}
                  </div>
                  {activeRoom.description && (
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{activeRoom.description}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 font-medium">Select a room to start chatting</p>
            )}
          </div>

          {/* Right Header Operations (Notifications & Actions) */}
          <div className="flex items-center gap-3 relative">
            
            {/* Manage Access Button for Private Groups */}
            {activeRoom?.adminId && (
              <button
                onClick={openManageAccessModal}
                className="flex items-center gap-2 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-500/5 cursor-pointer mr-1"
                title="Manage Group Members"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Manage Access</span>
              </button>
            )}

            {/* Search Result Status */}
            {searchQuery && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] text-indigo-400 font-bold">
                <span>FOUND {filteredMessages.length} RESULTS</span>
              </div>
            )}

            {/* Real-time Language Selector Dropdown */}
            <div className="relative flex items-center">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 text-slate-300 focus:outline-none focus:border-indigo-500/40 rounded-xl px-2.5 py-2 text-xs font-semibold select-none cursor-pointer transition-all mr-1"
                title="Select Translation Language"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code} className="bg-slate-950 text-slate-350 text-xs">
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Notification Bell */}
            <button 
              onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              className={`relative p-2.5 border rounded-xl transition-all flex items-center justify-center ${
                showNotificationDropdown 
                  ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-[-4px] right-[-4px] bg-gradient-to-r from-pink-500 to-rose-600 text-white font-extrabold text-[9px] w-5 h-5 flex items-center justify-center rounded-full border border-slate-950 shadow-md animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Menu */}
            {showNotificationDropdown && (
              <div className="absolute right-0 top-14 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 backdrop-blur-xl">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                  <span className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-indigo-400" /> Notifications
                  </span>
                  {unreadCount > 0 && (
                    <button 
                      onClick={clearAllNotifications}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/40">
                  {notifications.map(notif => (
                    <div 
                      key={notif._id} 
                      onClick={() => markAsRead(notif._id)}
                      className={`p-3.5 cursor-pointer text-xs transition-colors text-left flex gap-3 ${
                        notif.read ? 'bg-transparent text-slate-500' : 'bg-slate-800/30 hover:bg-slate-800/50 text-slate-200'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notif.read ? (
                          <Check className="w-4 h-4 text-slate-600" />
                        ) : (
                          <span className="block w-2 h-2 bg-indigo-400 rounded-full animate-ping"></span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium leading-normal">{notif.message}</p>
                        <p className="text-[9px] text-slate-500 mt-1">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="p-8 text-center text-slate-500 italic text-xs flex flex-col items-center gap-2">
                      <Check className="w-6 h-6 text-slate-700" />
                      <span>All caught up! No notifications.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 scrollbar-thin min-h-0">
          
          {searchQuery && (
            <div className="mb-4 p-3.5 bg-indigo-950/30 border border-indigo-800/30 text-xs rounded-xl flex items-center justify-between">
              <span className="text-indigo-300 font-medium">Filtering messages by query: <strong>"{searchQuery}"</strong></span>
              <button 
                onClick={() => setSearchQuery('')}
                className="text-indigo-400 hover:text-indigo-300 font-bold underline"
              >
                Reset Search
              </button>
            </div>
          )}

          {filteredMessages.map((msg, index) => {
            const isSelf = msg.senderId === (user?.id || user?._id);
            const userGrad = getAvatarGradient(msg.senderUsername);
            return (
              <div 
                key={msg._id || index} 
                className={`flex gap-3 max-w-[75%] items-start group ${
                  isSelf ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'
                }`}
              >
                {/* SENDER AVATAR */}
                <div className="shrink-0">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${userGrad} flex items-center justify-center text-white font-extrabold text-[10px] shadow-sm border border-white/5`}>
                    {msg.senderUsername ? msg.senderUsername.substring(0, 2).toUpperCase() : '??'}
                  </div>
                </div>

                {/* BUBBLE FEED CONTAINER */}
                <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                  
                  {/* Sender Name */}
                  {!isSelf && (
                    <span className="block text-[10px] text-slate-500 font-bold mb-1.5 ml-1 tracking-wide uppercase">
                      {msg.senderUsername}
                    </span>
                  )}
                  
                  {/* Message bubble */}
                  <div 
                    className={`px-5 py-3 rounded-2xl text-[13.5px] leading-relaxed transition-all duration-300 border ${
                      isSelf 
                        ? 'bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 border-white/10 text-white rounded-br-none shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/30 hover:scale-[1.015]' 
                        : 'bg-slate-900/40 border-slate-800/85 backdrop-blur-md text-slate-200 rounded-bl-none shadow-md shadow-black/5 hover:bg-slate-900/60 hover:border-slate-700/50 hover:scale-[1.015]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap select-text font-medium tracking-wide">
                      {selectedLanguage !== 'original' && translatedMessages[`${msg._id || msg.timestamp}_${selectedLanguage}`]
                        ? translatedMessages[`${msg._id || msg.timestamp}_${selectedLanguage}`]
                        : msg.message
                      }
                    </p>
                    {selectedLanguage !== 'original' && translatedMessages[`${msg._id || msg.timestamp}_${selectedLanguage}`] && (
                      <span className="inline-flex items-center gap-1 text-[9px] text-indigo-400 font-bold mt-1 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                        ✨ Translated
                      </span>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="text-[9px] text-slate-500/80 mt-1 mx-1 font-bold tracking-wider uppercase opacity-80 group-hover:opacity-100 transition-opacity">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {filteredMessages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none my-auto">
              <div className="p-4 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400 mb-4 animate-pulse">
                <MessageCircle className="w-10 h-10" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-200">
                {searchQuery ? 'No search results found' : `Welcome to #${activeRoom?.name || 'Workspace'}`}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                {searchQuery 
                  ? 'We couldn\'t find any messages that match your search. Try adjusting your query keywords.'
                  : 'This is the very beginning of the channel. Send a message to start the real-time discussion.'
                }
              </p>
            </div>
          )}

          <div ref={messageEndRef} />
        </div>

        {/* Message Input panel */}
        <div className="p-6 bg-transparent shrink-0">
          <div className="max-w-4xl mx-auto w-full">
            
            {/* Typing Indicator view */}
            <div className="h-6 flex items-center pl-4 mb-1">
              {Object.keys(typingUsers).length > 0 && (
                <div className="flex items-center gap-2 text-[10px] text-slate-500 italic mr-auto">
                  <div className="flex gap-1.5 py-1 px-3 bg-slate-900/60 border border-slate-800/80 rounded-full items-center">
                    <span className="font-bold text-slate-400 truncate max-w-28 mr-0.5">
                      {Object.keys(typingUsers).join(', ')}
                    </span>
                    <span>is typing</span>
                    <span className="inline-flex gap-1 ml-1">
                      <span className="w-1 h-1 bg-slate-500 rounded-full typing-dot"></span>
                      <span className="w-1 h-1 bg-slate-500 rounded-full typing-dot"></span>
                      <span className="w-1 h-1 bg-slate-500 rounded-full typing-dot"></span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Gorgeous Floating Input Pod */}
            <form 
              onSubmit={handleSendMessage} 
              className="bg-slate-950/40 backdrop-blur-2xl border border-slate-800/80 focus-within:border-indigo-500/80 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:bg-slate-900/60 focus-within:shadow-xl focus-within:shadow-indigo-500/[0.03] rounded-2xl transition-all shadow-2xl p-2.5 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-1.5 pl-1 text-slate-500 shrink-0">
                <button 
                  type="button" 
                  className="p-2 hover:bg-slate-800/80 hover:text-slate-300 rounded-xl transition-all flex items-center justify-center border border-transparent hover:border-slate-800"
                  title="Attach Files"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button 
                  type="button" 
                  className="p-2 hover:bg-slate-800/80 hover:text-slate-300 rounded-xl transition-all flex items-center justify-center border border-transparent hover:border-slate-800"
                  title="Share Image"
                >
                  <Image className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder={activeRoom ? `Message #${activeRoom.name}...` : 'Select a room to type'}
                disabled={!activeRoom}
                className="flex-1 bg-transparent border-none text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-0 disabled:opacity-50 text-[13.5px] px-2 py-2"
              />

              <div className="flex items-center gap-2 shrink-0">
                <button 
                  type="button" 
                  className="p-2 hover:bg-slate-800/80 hover:text-slate-300 rounded-xl transition-all flex items-center justify-center border border-transparent hover:border-slate-800"
                  title="Emoji Menu"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={!inputText.trim() || !activeRoom}
                  className="p-3 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 disabled:opacity-30 disabled:hover:scale-100 disabled:hover:shadow-none text-white font-bold rounded-2xl transition-all duration-300 shadow-md shadow-indigo-500/15 hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 border border-white/10 flex items-center justify-center relative overflow-hidden group/btn cursor-pointer"
                >
                  <Send className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>

      {/* 3. CREATE ROOM MODAL */}
      {showCreateRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative backdrop-blur-xl">
            
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-100">Create a New Channel</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Add a channel for custom real-time discussions</p>
              </div>
            </div>

            {roomError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>{roomError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="space-y-4 mt-4">
              <div>
                <label className="block text-slate-300 text-xs font-bold mb-1.5 uppercase tracking-wide">Channel Name</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g. cloud-architecture"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-slate-100 placeholder-slate-600 text-xs focus:outline-none transition-all focus:ring-1 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-bold mb-1.5 uppercase tracking-wide">Description (Optional)</label>
                <input
                  type="text"
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  placeholder="e.g. Talk about Kubernetes and multi-cloud systems"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-slate-100 placeholder-slate-600 text-xs focus:outline-none transition-all focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>

              {/* Private Channel Toggle */}
              <div className="flex items-center gap-3 py-1 px-0.5">
                <input
                  type="checkbox"
                  id="isPrivateCheckbox"
                  checked={newRoomIsPrivate}
                  onChange={(e) => setNewRoomIsPrivate(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-500 bg-slate-950 border-slate-800 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                />
                <div>
                  <label htmlFor="isPrivateCheckbox" className="block text-slate-200 text-xs font-bold uppercase tracking-wide cursor-pointer select-none">
                    Private Group Channel 🔒
                  </label>
                  <p className="text-[10px] text-slate-500">Only authorized members invited by the admin can see and chat</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateRoomModal(false);
                    setRoomError('');
                    setNewRoomIsPrivate(false);
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700/80 text-slate-300 text-xs font-bold rounded-xl transition-all border border-slate-750 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-indigo-500/20 transition-all border border-white/5"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MANAGE ACCESS MODAL */}
      {showAccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative backdrop-blur-xl">
            
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-100">Manage Access</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Control members of #{activeRoom?.name}</p>
              </div>
            </div>

            {/* Error & Success States */}
            {inviteError && (
              <div className="my-3 p-3 bg-rose-500/10 border border-rose-500/25 text-rose-250 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-450" />
                <span>{inviteError}</span>
              </div>
            )}
            {inviteSuccess && (
              <div className="my-3 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-450" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            {/* Current Members List */}
            <div className="my-4">
              <h3 className="text-slate-300 text-xs font-bold uppercase tracking-wide mb-2">Current Members</h3>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {/* Admin */}
                {roomMembers.admin && (
                  <div className="flex items-center justify-between p-2 bg-slate-950/60 border border-slate-850 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${getAvatarGradient(roomMembers.admin.username)} flex items-center justify-center text-white font-extrabold text-[9px]`}>
                        {roomMembers.admin.username.substring(0,2).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-slate-350">{roomMembers.admin.username}</span>
                    </div>
                    <span className="text-[9px] font-bold bg-indigo-500/25 border border-indigo-500/30 text-indigo-400 px-2 py-0.5 rounded-full uppercase">Creator & Admin 👑</span>
                  </div>
                )}
                
                {/* Members list */}
                {roomMembers.authorized.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-2 bg-slate-950/20 border border-slate-900 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${getAvatarGradient(member.username)} flex items-center justify-center text-white font-bold text-[9px]`}>
                        {member.username.substring(0,2).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-slate-300">{member.username}</span>
                    </div>
                    <span className="text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase">Authorized Member ✅</span>
                  </div>
                ))}
                {roomMembers.authorized.length === 0 && (
                  <div className="py-2 text-center text-xs text-slate-500 italic">No invited members yet</div>
                )}
              </div>
            </div>

            {/* Invite Form (Visible only to Admin) */}
            {activeRoom?.adminId === (user?.id || user?._id) ? (
              <form onSubmit={handleAuthorizeUser} className="space-y-3 pt-2 border-t border-slate-800/40">
                <div>
                  <label className="block text-slate-300 text-xs font-bold mb-1.5 uppercase tracking-wide">Invite New Member</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      placeholder="Enter username to authorize..."
                      className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-slate-100 placeholder-slate-600 text-xs focus:outline-none transition-all focus:ring-1 focus:ring-indigo-500/20"
                      required
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-indigo-500/20 transition-all border border-white/5 cursor-pointer shrink-0"
                    >
                      Authorize
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="p-3 bg-slate-950/40 border border-slate-850 text-slate-500 text-[11px] italic rounded-xl text-center">
                🔒 You are viewing the member list. Only the channel admin can authorize new users.
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/40 mt-4">
              <button
                type="button"
                onClick={() => setShowAccessModal(false)}
                className="px-4 py-2.5 w-full bg-slate-800 hover:bg-slate-700/80 text-slate-300 text-xs font-bold rounded-xl transition-all border border-slate-750 cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
