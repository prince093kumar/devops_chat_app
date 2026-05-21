import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { MessageSquare, Mail, Lock, AlertCircle, Loader, Sparkles, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleMouseMove = (e) => {
    const cards = document.getElementsByClassName("interactive-bg");
    for(const card of cards) {
      const rect = card.getBoundingClientRect(),
            x = e.clientX - rect.left,
            y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      return setError('Please enter both your email/username and password');
    }

    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans interactive-bg group/page"
      onMouseMove={handleMouseMove}
    >
      <style>{`
        .interactive-bg::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(
            circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
            rgba(124, 58, 237, 0.15) 0%,
            transparent 50%
          );
          pointer-events: none;
          z-index: 0;
          transition: background 0.3s ease;
        }
        .glass-card {
          position: relative;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .glass-card::before {
          content: "";
          position: absolute;
          top: -1px; left: -1px; right: -1px; bottom: -1px;
          border-radius: inherit;
          padding: 1px;
          background: radial-gradient(
            800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
            rgba(139, 92, 246, 0.5),
            transparent 40%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          z-index: -1;
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        .group\\/page:hover .glass-card::before {
          opacity: 1;
        }
      `}</style>

      {/* Floating Animated Orbs in Background */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-violet-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-blue-600/20 rounded-full blur-[100px] mix-blend-screen animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>

      {/* Main Glassmorphic Wrapper */}
      <div className="w-full max-w-md backdrop-blur-3xl rounded-3xl shadow-2xl shadow-black/50 p-8 md:p-10 z-10 glass-card">
        
        {/* Brand/Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3.5 bg-violet-600/20 text-violet-400 rounded-2xl shadow-inner border border-violet-500/20 mb-5 relative group">
            <div className="absolute inset-0 bg-violet-500 rounded-2xl blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <MessageSquare className="w-8 h-8 relative z-10" />
          </div>
          
          <h2 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center justify-center gap-2">
            Welcome Back <Sparkles className="w-5 h-5 text-violet-400" />
          </h2>
          <p className="text-slate-400 mt-2 text-sm font-medium">Log in to your ChatPulse workspace</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Email / Username */}
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Username or Email</label>
            <div className="relative group/input">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within/input:text-violet-400 transition-colors" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com or username"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 focus:border-violet-500/80 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-violet-500/10 transition-all font-medium text-sm"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Password</label>
            <div className="relative group/input">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within/input:text-violet-400 transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 focus:border-violet-500/80 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-violet-500/10 transition-all font-medium text-sm"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 py-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] border border-violet-400/20 focus:outline-none transition-all flex items-center justify-center gap-2 text-sm group/btn"
          >
            {isLoading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              </>
            )}
          </button>
        </form>

        {/* Link back to Register */}
        <div className="mt-8 text-center pt-6">
          <p className="text-slate-400 text-sm font-medium">
            New to ChatPulse?{' '}
            <Link to="/register" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors ml-1">
              Create an Account
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
