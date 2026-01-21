import { useState, useEffect } from 'react';
import { X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isBefore, startOfDay, addDays, getDay } from 'date-fns';
import { cn } from '../lib/utils';
import { zhCN } from 'date-fns/locale';

interface Props {
    workstation: any;
    onClose: () => void;
    onSuccess: () => void;
}

interface DayStatus {
    date: string; // YYYY-MM-DD
    status: 'available' | 'busy';
    user: string | null;
    purpose: string | null;
}

export function ReservationModal({ workstation, onClose, onSuccess }: Props) {
    const { user } = useAuth();

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [availability, setAvailability] = useState<DayStatus[]>([]);

    // Selection State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [purpose, setPurpose] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    // Fetch when month changes
    useEffect(() => {
        setFetching(true);
        // Fetch 40 days to cover surrounding (naive but works for prototype)
        // Or fetch specifically for this month range
        // Let's rely on the existing API (next 30 days) and adapt it, 
        // BUT user wants Month Navigation. The existing API `get_workstation_availability` takes `days`.
        // We should probably modify backend to accept start/end, but for now let's just fetch 60 days to cover more ground
        // OR just use what we have. 
        // Actually, "get_workstation_availability" calculates from TODAY. 
        // If I look at next month, I need to fetch from today + X. 
        // Let's assume the API returns enough data or we modify API.
        // Ideally we should modify API. Let's modify the frontend to request `days=90` to cover 3 months.
        api.get(`/reservations/availability/${workstation.id}?days=90`)
            .then(res => setAvailability(res.data))
            .catch(console.error)
            .finally(() => setFetching(false));
    }, [workstation.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate) {
            setError("请选择日期 (Please select date)");
            return;
        }
        setLoading(true);
        setError('');

        // If single day selected
        const finalEnd = endDate || startDate;

        try {
            const res = await api.post('/reservations', {
                user_id: user?.id,
                workstation_id: workstation.id,
                start_date: startDate,
                end_date: finalEnd,
                purpose
            });

            if (res.data.success) {
                onSuccess();
            } else {
                setError(res.data.message);
            }
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.message || 'Failed';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleDateClick = (dateStr: string) => {
        if (!startDate || (startDate && endDate)) {
            // Start new selection (reset)
            setStartDate(dateStr);
            setEndDate('');
        } else {
            // Second click
            if (isSameDay(new Date(dateStr), new Date(startDate))) {
                // Clicked same day -> just unselect end? or keep as single day
                setEndDate('');
            } else if (isBefore(new Date(dateStr), new Date(startDate))) {
                // Clicked before start -> new start
                setStartDate(dateStr);
                setEndDate('');
            } else {
                // Clicked after start -> Set range
                // Check for busy slots in between? Backend checks, but nice to check here too.
                setEndDate(dateStr);
            }
        }
    };

    // Calendar Grid Generation
    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    // Padding for start of week (Mon start: 1, Sun start: 0. let's use Mon start)
    const startPadding = Array(getDay(startOfMonth(currentMonth)) === 0 ? 6 : getDay(startOfMonth(currentMonth)) - 1).fill(null);

    const getDayStatus = (d: Date) => {
        const dateStr = format(d, 'yyyy-MM-dd');
        return availability.find(s => s.date === dateStr);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e293b] border border-white/20 rounded-2xl w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[600px]">

                {/* Left: Hardware Info - Darker */}
                <div className="w-full md:w-80 bg-black/20 p-6 border-b md:border-b-0 md:border-r border-white/10 flex flex-col shrink-0">
                    <h2 className="text-xl font-bold text-white mb-1">{workstation.name}</h2>
                    <div className="text-blue-300 mb-6 font-mono text-xs bg-blue-500/10 px-2 py-1 rounded w-fit">
                        {workstation.room}
                    </div>

                    <div className="space-y-4 flex-1 overflow-auto text-sm">
                        <div className="space-y-3 pb-4 border-b border-white/10">
                            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">配置 (Specs)</h3>
                            <div className="group">
                                <div className="text-[10px] text-white/40 mb-0.5">processor</div>
                                <div className="text-white/80 font-mono">{workstation.cpu_info}</div>
                            </div>
                            <div className="group">
                                <div className="text-[10px] text-white/40 mb-0.5">memory</div>
                                <div className="text-white/80 font-mono">{workstation.memory_gb} GB</div>
                            </div>
                            <div className="group">
                                <div className="text-[10px] text-white/40 mb-0.5">administrator</div>
                                <div className="text-white/80">{workstation.admin_name || 'N/A'}</div>
                            </div>
                        </div>

                        <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                            <h3 className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1">
                                <Check size={12} /> 预约须知
                            </h3>
                            <ul className="text-[10px] text-emerald-100/60 space-y-1 list-disc pl-3">
                                <li>点击日历格子选择日期</li>
                                <li>再次点击后续日期可选择范围</li>
                                <li>红色区域已被他人占用</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Right: Calendar & Form */}
                <div className="flex-1 flex flex-col bg-[#1e293b]">
                    {/* Calendar Header */}
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-white/10 rounded">
                                <ChevronLeft size={16} className="text-white/70" />
                            </button>
                            <span className="text-sm font-bold text-white w-32 text-center">
                                {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
                            </span>
                            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-white/10 rounded">
                                <ChevronRight size={16} className="text-white/70" />
                            </button>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="p-6 flex-1 overflow-auto flex flex-col">
                        <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                            {['一', '二', '三', '四', '五', '六', '日'].map(d => (
                                <div key={d} className="text-xs text-white/30 font-bold py-1">{d}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1 auto-rows-[1fr]">
                            {startPadding.map((_, i) => <div key={`pad-${i}`} />)}

                            {daysInMonth.map(day => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const status = getDayStatus(day);
                                const isBusy = status?.status === 'busy';

                                const isSelectedStart = startDate === dateStr;
                                const isSelectedEnd = endDate === dateStr;
                                const isInRange = startDate && endDate && dateStr > startDate && dateStr < endDate;
                                const isSelected = isSelectedStart || isSelectedEnd || isInRange;

                                return (
                                    <button
                                        key={dateStr}
                                        onClick={() => !isBusy && handleDateClick(dateStr)}
                                        disabled={isBusy}
                                        className={cn(
                                            "aspect-square rounded-md flex flex-col items-center justify-center relative group transition-all text-sm",
                                            isBusy
                                                ? "bg-red-500/10 text-red-500/50 cursor-not-allowed border border-transparent"
                                                : isSelected
                                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105 z-10 font-bold"
                                                    : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/5",
                                            isSameDay(day, new Date()) && !isSelected && !isBusy && "border-blue-400/50 text-blue-400"
                                        )}
                                    >
                                        {format(day, 'd')}

                                        {isBusy && (
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-black/90 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-20 border border-white/20">
                                                {status?.user}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer Form */}
                    <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-black/20 shrink-0 flex items-center gap-4">
                        <div className="flex-1">
                            <input
                                required
                                placeholder="在此输入您的用途 (Purpose)..."
                                className="w-full bg-transparent border-b border-white/20 py-2 px-1 text-sm text-white focus:border-blue-500 outline-none placeholder-white/30"
                                value={purpose}
                                onChange={e => setPurpose(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <div className="text-[10px] text-white/40 uppercase">Selected Range</div>
                                <div className="text-sm font-mono text-blue-300">
                                    {startDate ? `${startDate} ${endDate ? '→ ' + endDate : ''}` : 'No Info'}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !startDate}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                            >
                                {loading ? '...' : '确认预约'}
                            </button>
                        </div>
                    </form>

                    {error && (
                        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-xs bg-red-500 text-white px-4 py-1 rounded-full shadow-lg animate-in slide-in-from-bottom-2">
                            ! {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
