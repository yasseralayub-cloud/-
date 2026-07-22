import { useState, useEffect, FormEvent } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, KeyRound, Globe, ArrowRight } from 'lucide-react';

export default function AdminLogin() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pin' | 'google'>('pin');
  const [pinCode, setPinCode] = useState('');
  const navigate = useNavigate();

  // Handle redirect result if user chose redirect authentication
  useEffect(() => {
    async function checkRedirect() {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const user = result.user;
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          const IS_BOOTSTRAPPED_ADMIN = user.email === 'yasseralayub@gmail.com';

          if (adminDoc.exists() || IS_BOOTSTRAPPED_ADMIN) {
            sessionStorage.setItem('admin_authenticated', 'true');
            navigate('/admin');
          } else {
            await auth.signOut();
            setError('عذراً، هذا الحساب (' + (user.email || '') + ') ليس لديه صلاحيات المسؤول.');
          }
        }
      } catch (err: any) {
        console.error('Redirect login error:', err);
      }
    }
    checkRedirect();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Try popup first
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      const IS_BOOTSTRAPPED_ADMIN = user.email === 'yasseralayub@gmail.com';

      if (adminDoc.exists() || IS_BOOTSTRAPPED_ADMIN) {
        sessionStorage.setItem('admin_authenticated', 'true');
        navigate('/admin');
      } else {
        await auth.signOut();
        setError('عذراً، هذا الحساب (' + (user.email || '') + ') ليس لديه صلاحيات المسؤول.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err?.code === 'auth/unauthorized-domain') {
        setError('رابط موقعك الحالي غير معتمد في Firebase. يمكنك استخدام "رمز الدخول السريع" بالأسفل مباشرة، أو إضافة نطاق Vercel في Firebase Console.');
      } else if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user') {
        // Fallback to redirect mode if popup failed/closed
        try {
          const provider = new GoogleAuthProvider();
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr: any) {
          setError('تم إغلاق نافذة تسجيل الدخول. يمكنك استخدام "رمز الدخول السريع (PIN)" بالأسفل للدخول مباشرة.');
        }
      } else {
        setError(err?.message || 'فشل تسجيل الدخول بواسطة جوجل. جرب استخدام رمز الدخول السريع.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Default allowed PIN codes
    const VALID_PINS = ['1234', '123456', 'admin', 'admin123', '2026'];
    
    if (VALID_PINS.includes(pinCode.trim())) {
      sessionStorage.setItem('admin_authenticated', 'true');
      navigate('/admin');
    } else {
      setError('رمز الدخول غير صحيح. الرمز الافتراضي هو: 1234');
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white/5 border border-white/10 p-8 sm:p-10 rounded-3xl text-center shadow-2xl backdrop-blur-md"
      >
        <div className="w-16 h-16 bg-yellow/10 border border-yellow/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-yellow">
          <Lock size={32} />
        </div>
        <h1 className="text-3xl font-black mb-2 uppercase tracking-tight">لوحة التحكم</h1>
        <p className="text-white/50 text-sm mb-6">إدارة أصناف المنيو والأقسام والموقع</p>

        {/* Tab Selector */}
        <div className="flex bg-white/5 p-1 rounded-xl mb-6 border border-white/10">
          <button
            onClick={() => { setActiveTab('pin'); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'pin' ? 'bg-yellow text-black shadow-md' : 'text-white/60 hover:text-white'
            }`}
          >
            رمز الدخول السريع (PIN)
          </button>
          <button
            onClick={() => { setActiveTab('google'); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'google' ? 'bg-yellow text-black shadow-md' : 'text-white/60 hover:text-white'
            }`}
          >
            حساب جوجل
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-xs text-right leading-relaxed">
            {error}
          </div>
        )}

        {activeTab === 'pin' ? (
          <form onSubmit={handlePinLogin} className="space-y-4">
            <div className="text-right">
              <label className="block text-xs font-medium text-white/60 mb-2">
                أدخل رمز المسؤول (رمز الدخول الافتراضي: <span className="text-yellow font-bold">1234</span>)
              </label>
              <div className="relative flex items-center">
                <input
                  type="password"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="1234"
                  className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3.5 text-center text-lg tracking-widest text-white placeholder-white/20 focus:outline-none focus:border-yellow transition-all"
                  autoFocus
                />
                <KeyRound size={20} className="absolute left-4 text-white/40" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-yellow text-black font-black py-4 rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              الدخول للوحة التحكم
              <ArrowRight size={18} className="rotate-180" />
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white text-black font-black py-4 rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer shadow-lg"
            >
              {loading ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                  تسجيل الدخول بواسطة جوجل
                </>
              )}
            </button>

            <p className="text-[11px] text-white/40 leading-relaxed text-right pt-2 border-t border-white/5">
              💡 ملاحظة: إذا ظهرت لك استجابة برفض النطاق على Vercel، يمكنك التبديل لتبويب <span className="text-yellow font-bold">"رمز الدخول السريع"</span> واستخدام الرمز <span className="text-yellow font-bold">1234</span> للدخول فوراً.
            </p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
          <a href="/" className="hover:text-yellow transition-colors flex items-center gap-1.5">
            <Globe size={14} />
            العودة للمنيو الرئيسي
          </a>
          <span>رابط التحكم: <code className="text-yellow font-mono">/admin</code></span>
        </div>
      </motion.div>
    </div>
  );
}
