import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { MessageSquare, Mail, Lock, User, AlertCircle, Loader, Sparkles, ArrowRight } from 'lucide-react';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !email || !password) {
      return setError('Please fill in all fields');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setIsLoading(true);
    try {
      await register(username, email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      
      {/* Dynamic Ambient Background Light Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute top-[35%] left-[25%] w-[350px] h-[350px] bg-pink-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Main Glassmorphic Wrapper */}
      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-2xl border border-slate-800/80 hover:border-indigo-500/20 transition-all duration-500 rounded-3xl shadow-2xl p-8 md:p-10 relative z-10 group">
        
        {/* Glow corner accent */}
        <div className="absolute -top-px -left-px w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-tl-3xl pointer-events-none"></div>
        <div className="absolute -bottom-px -right-px w-20 h-20 bg-gradient-to-tl from-purple-500/20 to-transparent rounded-br-3xl pointer-events-none"></div>

        {/* Brand/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-xl shadow-indigo-500/15 text-white mb-4 transition-transform group-hover:scale-105 duration-300">
            <MessageSquare className="w-7 h-7" />
          </div>
          
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-200 via-purple-300 to-pink-300 bg-clip-text text-transparent flex items-center justify-center gap-2">
            Create Account <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          </h2>
          <p className="text-slate-400 mt-2 text-xs font-semibold uppercase tracking-wider">JOIN CHATPULSE WORKSPACE</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs rounded-xl flex items-start gap-3 animate-headShake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="font-semibold leading-normal">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Username */}
          <div>
            <label className="block text-slate-300 text-xs font-bold mb-2 uppercase tracking-wide">Username</label>
            <div className="relative group/input">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="john_doe"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950/65 border border-slate-800/80 hover:border-slate-700/80 focus:border-indigo-500/80 rounded-2xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 font-medium text-sm"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-slate-300 text-xs font-bold mb-2 uppercase tracking-wide">Email Address</label>
            <div className="relative group/input">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950/65 border border-slate-800/80 hover:border-slate-700/80 focus:border-indigo-500/80 rounded-2xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 font-medium text-sm"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-slate-300 text-xs font-bold mb-2 uppercase tracking-wide">Password</label>
            <div className="relative group/input">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••• (Min 6 chars)"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950/65 border border-slate-800/80 hover:border-slate-700/80 focus:border-indigo-500/80 rounded-2xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 font-medium text-sm"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-3 py-3.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/35 border border-white/5 focus:outline-none transition-all duration-300 flex items-center justify-center gap-2 text-sm relative overflow-hidden group/btn cursor-pointer"
          >
            {isLoading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              </>
            )}
          </button>
        </form>

        {/* Link back to Login */}
        <div className="mt-8 text-center border-t border-slate-800/60 pt-6">
          <p className="text-slate-400 text-xs font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-bold transition-all ml-1 underline decoration-indigo-500/30 hover:decoration-indigo-500">
              Sign In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Register;
