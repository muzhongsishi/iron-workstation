import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { User, Lock, ArrowRight, Mail, Settings } from 'lucide-react';

interface UserGroup {
    [grade: string]: {
        id: number;
        name: string;
        grade: string;
        has_pin: boolean;
        email: string | null;
    }[];
}

export default function Login() {
    const { login, setup } = useAuth();
    const [users, setUsers] = useState<UserGroup>({});
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [pin, setPin] = useState('');
    const [email, setEmail] = useState('');
    const [mode, setMode] = useState<'login' | 'setup'>('login');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isAdminLogin, setIsAdminLogin] = useState(false);

    useEffect(() => {
        api.get('/users').then((res) => setUsers(res.data));
    }, []);

    const selectedUserInfo = Object.values(users)
        .flat()
        .find((u) => u.id.toString() === selectedUser);

    useEffect(() => {
        if (selectedUserInfo) {
            setMode(selectedUserInfo.has_pin ? 'login' : 'setup');
            setError('');
        }
    }, [selectedUserInfo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isAdminLogin) {
                await login('admin', pin);
            } else {
                if (!selectedUserInfo) return;
                if (mode === 'login') {
                    await login(selectedUserInfo.name, pin);
                } else {
                    if (!email) {
                        setError('首次设置必须填写邮箱 (First time setup requires an email)');
                        setLoading(false);
                        return;
                    }
                    await setup(selectedUserInfo.name, pin, email);
                }
            }
        } catch (err: any) {
            setError(err.message || '认证失败 (Authentication failed)');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-white">
            <div className="w-full max-w-md p-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl relative">
                <button
                    onClick={() => { setIsAdminLogin(!isAdminLogin); setError(''); setPin(''); setSelectedUser(''); }}
                    className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
                    title="Admin Login"
                >
                    <Settings size={20} />
                </button>

                <div className="flex flex-col items-center mb-10 float-anim">
                    <div className="h-20 w-20 bg-blue-500/10 rounded-2xl rotate-3 flex items-center justify-center mb-6 border border-blue-400/20 shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)] backdrop-blur-sm">
                        <Lock className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-100 via-blue-300 to-indigo-200" style={{ textShadow: '0 0 20px rgba(59, 130, 246, 0.3)' }}>
                        钢铁工作站
                    </h1>
                    <p className="text-blue-300/40 mt-3 text-sm font-mono tracking-widest uppercase">Iron Workstation System</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {!isAdminLogin ? (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-blue-100 flex items-center gap-2">
                                <User size={16} /> 身份选择 (Identity)
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none text-white placeholder-white/50"
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    required
                                >
                                    <option value="" className="bg-slate-800 text-gray-400">请选择您的名字...</option>
                                    {Object.entries(users).map(([grade, groupUsers]) => (
                                        <optgroup key={grade} label={grade} className="bg-slate-900 text-blue-300">
                                            {groupUsers.map((u) => (
                                                <option key={u.id} value={u.id} className="bg-slate-800 text-white">
                                                    {u.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                                    ▼
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-yellow-300 font-bold tracking-wide mb-4">
                            管理员模式 (Admin Mode)
                        </div>
                    )}

                    {(selectedUserInfo || isAdminLogin) && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-blue-100 flex items-center gap-2">
                                    <Lock size={16} />
                                    {mode === 'setup' && !isAdminLogin ? '设置新 PIN 码 (4-6位)' : '输入 PIN 码 (010601)'}
                                </label>
                                <input
                                    type="password"
                                    maxLength={6}
                                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center text-2xl tracking-[0.5em]"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    placeholder="••••"
                                    required
                                />
                            </div>

                            {mode === 'setup' && !isAdminLogin && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-blue-100 flex items-center gap-2">
                                        <Mail size={16} /> 联系邮箱 (Email)
                                    </label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your.email@example.com"
                                        required
                                    />
                                    <p className="text-xs text-yellow-300/80 px-1">
                                        * 首次必须填写，用于接收提醒
                                    </p>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? '处理中...' : (mode === 'setup' && !isAdminLogin ? '设置并登录' : '进入系统')}
                                {!loading && <ArrowRight size={18} />}
                            </button>
                        </div>
                    )}
                </form>
            </div>

            <div className="mt-8 text-white/20 text-sm">
                Iron Workstation System v1.1
            </div>
        </div>
    );
}
