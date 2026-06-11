import { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';

export default function AdminLogin() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user is in admins collection OR is the bootstrapped email
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      const IS_BOOTSTRAPPED_ADMIN = user.email === 'yasseralayub@gmail.com';

      if (adminDoc.exists() || IS_BOOTSTRAPPED_ADMIN) {
        navigate('/admin');
      } else {
        await auth.signOut();
        setError('عذراً، هذا الحساب ليس لديه صلاحيات المسؤول.');
      }
    } catch (err: any) {
      console.error(err);
      setError('فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white/5 border border-white/10 p-10 rounded-3xl text-center"
      >
        <div className="w-16 h-16 bg-yellow/10 border border-yellow/20 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow">
          <Lock size={32} />
        </div>
        <h1 className="text-3xl font-black mb-2 uppercase tracking-tight">لوحة التحكم</h1>
        <p className="text-white/40 mb-8">يرجى تسجيل الدخول للوصول إلى إدارة المنيو</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-yellow text-black font-black py-4 rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-3 disabled:opacity-50"
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
      </motion.div>
    </div>
  );
}
