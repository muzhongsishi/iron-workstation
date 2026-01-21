import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Trash2, Plus, Monitor, X, Check, Calendar as CalendarIcon, User, AlertCircle, Edit3, LayoutGrid, Cpu, HardDrive, Server, CalendarPlus, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, isSameMonth, startOfDay, addDays, parseISO, areIntervalsOverlapping, isToday, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Workstation {
    id: number;
    name: string;
    room: string;
    status: string;
    admin_name?: string;
    core_count?: string;
    cpu_info?: string;
    memory_gb?: number;
    os_info?: string;
}

interface UserData {
    id: number;
    name: string;
    grade: string;
}

interface ExistingReservation {
    start_date: string;
    end_date: string;
    user_name: string;
    user_id: number;
    purpose: string;
}

type UserGroup = { [grade: string]: UserData[] };

// Add colors for grades or users if we want deeper logic, here generic
const EXISTING_RES_COLOR = "bg-red-500/40 border-red-500/50 text-red-100";
const NEW_SEL_COLOR = "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/50";

export default function AdminPanel() {
    const [stations, setStations] = useState<Workstation[]>([]);
    const [users, setUsers] = useState<UserGroup>({});

    // Assignment State
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignTarget, setAssignTarget] = useState<Workstation | null>(null);
    const [existingRes, setExistingRes] = useState<ExistingReservation[]>([]);
    const [forceOverride, setForceOverride] = useState(false);

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [purpose, setPurpose] = useState('Administrator Assigned');

    // CRUD State
    const [formData, setFormData] = useState({ name: '', room: '', admin_name: '', cpu_info: '', core_count: '', memory_gb: 32, os_info: 'Windows 10' });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchStations();
        fetchUsers();
    }, []);

    const fetchStations = async () => {
        const res = await api.get('/workstations');
        const flat: Workstation[] = Object.values(res.data).flat() as Workstation[];
        flat.sort((a, b) => a.id - b.id);
        setStations(flat);
    };

    const fetchUsers = async () => {
        try { const res = await api.get('/users'); setUsers(res.data); } catch (e) { }
    };

    const fetchReservations = async (wsId: number) => {
        try {
            const res = await api.get(`/admin/reservations/${wsId}`);
            setExistingRes(res.data);
        } catch (e) { console.error(e); }
    };

    // --- CRUD Handlers ---
    const handleRowClick = (ws: Workstation) => {
        setEditingId(ws.id);
        setFormData({
            name: ws.name, room: ws.room, admin_name: ws.admin_name || '', cpu_info: ws.cpu_info || '', core_count: ws.core_count || '', memory_gb: ws.memory_gb || 0, os_info: ws.os_info || 'Windows 10'
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleReset = () => {
        setEditingId(null);
        setFormData({ name: '', room: '', admin_name: '', cpu_info: '', core_count: '', memory_gb: 32, os_info: 'Windows 10' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingId) {
                await api.put(`/admin/workstations/${editingId}`, formData);
                alert('更新成功');
                setEditingId(null);
            } else {
                const res = await api.post('/admin/workstations/add', formData);
                if (res.data.success) alert('添加成功');
                else alert('添加失败: ' + res.data.message);
            }
            handleReset();
            fetchStations();
        } catch (e: any) { alert('Operation failed: ' + (e.response?.data?.message || e.message)); }
        finally { setLoading(false); }
    };

    const handleDelete = async (e: React.MouseEvent, id: number, name: string) => {
        e.stopPropagation(); if (!confirm(`Delete ${name}?`)) return;
        try { await api.delete(`/admin/workstations/${id}`); fetchStations(); if (editingId === id) handleReset(); } catch (e) { alert('Delete failed'); }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'memory_gb' ? parseInt(value) || 0 : value }));
    };

    // --- Assignment Logic ---
    const openAssignModal = async (e: React.MouseEvent, ws: Workstation) => {
        e.stopPropagation();
        setAssignTarget(ws);
        setSelectedDates([]);
        setPurpose('Administrator Assigned');
        setForceOverride(false);
        setExistingRes([]);
        setShowAssignModal(true);
        // Fetch reservations
        await fetchReservations(ws.id);
    };

    const toggleDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        setSelectedDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr].sort());
    };

    const handleBatchAssign = async () => {
        if (!assignTarget || !selectedUserId || selectedDates.length === 0) {
            alert('Please select user and dates'); return;
        }
        // Logic: Group ranges
        const sorted = [...selectedDates].sort();
        const ranges: { start: string, end: string }[] = [];
        let start = sorted[0]; let end = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
            const current = sorted[i];
            const prev = new Date(sorted[i - 1]);
            const currDate = new Date(current);
            const diffDays = Math.ceil(Math.abs(currDate.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) end = current;
            else { ranges.push({ start, end }); start = current; end = current; }
        }
        ranges.push({ start, end });

        setLoading(true);
        try {
            for (const range of ranges) {
                const payload = {
                    workstation_id: assignTarget.id,
                    user_id: parseInt(selectedUserId),
                    start_date: range.start,
                    end_date: range.end,
                    purpose,
                    force: forceOverride
                };
                const res = await api.post('/admin/reservations', payload);
                if (!res.data.success) throw new Error(res.data.message);
            }
            alert('分配成功! (Assigned Successfully)');
            setShowAssignModal(false);
            fetchStations();
        } catch (e: any) {
            alert('Error: ' + (e.message || 'Operation Failed'));
        } finally {
            setLoading(false);
        }
    };

    const renderCalendar = () => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });
        const startDay = start.getDay();
        const pad = Array(startDay === 0 ? 6 : startDay - 1).fill(null);

        return (
            <div className="select-none">
                <div className="flex justify-between items-center mb-2 px-2">
                    <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))} className="p-1 hover:bg-white/10 rounded"><ChevronLeft size={16} /></button>
                    <span className="font-bold">{format(currentMonth, 'yyyy年 MM月')}</span>
                    <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-white/10 rounded"><ChevronRight size={16} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1 opacity-50">
                    <div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div><div>Su</div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {pad.map((_, i) => <div key={`pad-${i}`} />)}
                    {days.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const isSelected = selectedDates.includes(dateStr);

                        // Check existing
                        const occupied = existingRes.find(r =>
                            day >= parseISO(r.start_date) && day <= parseISO(r.end_date)
                        );

                        const isPast = isBefore(day, startOfDay(new Date()));

                        let className = `aspect-square flex flex-col items-center justify-center rounded cursor-pointer transition-all border text-xs relative overflow-hidden `;

                        if (isSelected) className += NEW_SEL_COLOR;
                        else if (occupied) className += EXISTING_RES_COLOR;
                        else className += 'bg-white/5 border-white/5 hover:bg-white/20 text-white/70';

                        if (isPast && !isSelected && !occupied) className += ' opacity-30';

                        return (
                            <div
                                key={dateStr}
                                onClick={() => toggleDate(day)}
                                className={className}
                                title={occupied ? `Reserved by: ${occupied.user_name}` : ''}
                            >
                                <span className="z-10 relative">{format(day, 'd')}</span>
                                {occupied && !isSelected && (
                                    <span className="text-[8px] leading-none absolute bottom-0.5 w-full text-center truncate px-0.5 opacity-80">
                                        {occupied.user_name}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 relative">
            <div className={`border rounded-xl p-6 transition-colors duration-300 ${editingId ? 'bg-blue-900/20 border-blue-500/30' : 'bg-white/5 border-white/10'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {editingId ? <><Edit3 size={24} className="text-yellow-400" /><span className="text-yellow-100">编辑电脑 #{editingId}</span></> : <><Plus size={24} className="text-blue-400" /><span className="text-blue-100">添加新电脑</span></>}
                    </h2>
                    {editingId && <button onClick={handleReset} className="text-xs flex items-center gap-1 text-white/50 hover:text-white"><X size={14} /> Cancel</button>}
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1"><label className="text-xs text-white/50 uppercase font-bold">主机名</label><div className="relative"><Monitor className="absolute left-3 top-2.5 text-white/30" size={16} /><input name="name" value={formData.name} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-blue-500" /></div></div>
                        <div className="space-y-1"><label className="text-xs text-white/50 uppercase font-bold">房间</label><div className="relative"><LayoutGrid className="absolute left-3 top-2.5 text-white/30" size={16} /><input name="room" value={formData.room} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-blue-500" /></div></div>
                        <div className="space-y-1"><label className="text-xs text-white/50 uppercase font-bold">管理员</label><div className="relative"><User className="absolute left-3 top-2.5 text-white/30" size={16} /><input name="admin_name" value={formData.admin_name} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-blue-500" /></div></div>
                        <div className="space-y-1"><label className="text-xs text-white/50 uppercase font-bold">CPU</label><div className="relative"><Cpu className="absolute left-3 top-2.5 text-white/30" size={16} /><input name="cpu_info" value={formData.cpu_info} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-blue-500" /></div></div>
                        <div className="space-y-1"><label className="text-xs text-white/50 uppercase font-bold">核心</label><div className="relative"><Cpu className="absolute left-3 top-2.5 text-white/30" size={16} /><input name="core_count" value={formData.core_count} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-blue-500" /></div></div>
                        <div className="space-y-1"><label className="text-xs text-white/50 uppercase font-bold">内存</label><div className="relative"><HardDrive className="absolute left-3 top-2.5 text-white/30" size={16} /><input name="memory_gb" type="number" value={formData.memory_gb} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-blue-500" /></div></div>
                        <div className="space-y-1"><label className="text-xs text-white/50 uppercase font-bold">OS</label><div className="relative"><Server className="absolute left-3 top-2.5 text-white/30" size={16} /><input name="os_info" value={formData.os_info} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-blue-500" /></div></div>
                    </div>
                    <div className="flex gap-3">
                        <button type="submit" disabled={loading} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 ${editingId ? 'bg-yellow-600' : 'bg-blue-600'}`}>{editingId ? 'Update' : 'Add'}</button>
                    </div>
                </form>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden pb-20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-white/70">
                        <thead className="bg-white/5 text-white/50 uppercase font-bold text-xs">
                            <tr>
                                <th className="p-4">ID</th><th className="p-4">Name</th><th className="p-4">Room</th><th className="p-4">Admin</th><th className="p-4">Cores</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {stations.map(ws => (
                                <tr key={ws.id} onClick={() => handleRowClick(ws)} className={`cursor-pointer transition-colors ${editingId === ws.id ? 'bg-blue-500/20' : 'hover:bg-white/5'}`}>
                                    <td className="p-4 font-mono text-white/30">#{ws.id}</td>
                                    <td className="p-4 font-bold text-white">{ws.name}</td>
                                    <td className="p-4">{ws.room}</td>
                                    <td className="p-4">{ws.admin_name}</td>
                                    <td className="p-4">{ws.core_count}</td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${ws.status === 'busy' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>{ws.status.toUpperCase()}</span></td>
                                    <td className="p-4 text-right flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                        <button onClick={(e) => openAssignModal(e, ws)} className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded"><CalendarPlus size={16} /></button>
                                        <button onClick={(e) => handleDelete(e, ws.id, ws.name)} className="p-2 hover:bg-red-500/20 text-red-400 rounded"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showAssignModal && assignTarget && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(false)}>
                    <div className="bg-gray-900 border border-white/20 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between">
                            <h3 className="text-xl font-bold text-white flex gap-2"><CalendarPlus className="text-blue-400" /> Assign: {assignTarget.name}</h3>
                            <button onClick={() => setShowAssignModal(false)} className="text-white/50 hover:text-white"><X /></button>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-white/50 uppercase font-bold">User</label>
                            <select
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                value={selectedUserId}
                                onChange={e => setSelectedUserId(e.target.value)}
                            >
                                <option value="">-- Select User --</option>
                                {Object.entries(users).map(([grade, gradeUsers]) => (
                                    <optgroup key={grade} label={grade}>
                                        {gradeUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        {/* Force Override Toggle */}
                        <div className="flex items-center gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                            <input
                                type="checkbox"
                                id="force"
                                checked={forceOverride}
                                onChange={e => setForceOverride(e.target.checked)}
                                className="w-4 h-4 rounded bg-white/10 text-yellow-500 border-white/10"
                            />
                            <label htmlFor="force" className="text-sm text-yellow-200 cursor-pointer select-none font-bold flex items-center gap-1">
                                <AlertTriangle size={14} /> 强制覆盖 (Force Override Conflicts)
                            </label>
                        </div>

                        <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                            {renderCalendar()}
                            <div className="flex justify-center gap-4 mt-2 text-[10px] text-white/50">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-600 rounded"></span> Selected</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-900 rounded border border-red-500/50"></span> Occupied</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-600 rounded ring-1 ring-white"></span> Overwrite</span>
                            </div>
                        </div>

                        <button onClick={handleBatchAssign} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
                            {loading ? 'Processing...' : <><CheckCircle /> 确认分配 / Confirm Assign</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
