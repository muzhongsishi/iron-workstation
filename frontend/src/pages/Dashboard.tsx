import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { WorkstationCard } from '../components/WorkstationCard';
import { ReservationModal } from '../components/ReservationModal';
import AdminPanel from '../components/AdminPanel';
import { LogOut, RefreshCw, Calendar, Heart } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface WorkstationsByRoom {
    [room: string]: any[];
}

// Color Palette for users (Bright & Distinct)
const USER_COLORS = [
    '#F472B6', // Pink 400
    '#A78BFA', // Violet 400
    '#34D399', // Emerald 400
    '#60A5FA', // Blue 400
    '#FBBF24', // Amber 400
    '#F87171', // Red 400
    '#2DD4BF', // Teal 400
    '#FB923C', // Orange 400
    '#818CF8', // Indigo 400
    '#E879F9', // Fuchsia 400
    '#A3E635', // Lime 400
    '#22D3EE', // Cyan 400
];

function ActiveReservations({ user, refreshTrigger }: { user: any, refreshTrigger: any }) {
    const [reservations, setReservations] = useState<any[]>([]);

    const fetchMyRes = () => {
        if (!user) return;
        api.get(`/reservations/my/${user.id}`).then(res => setReservations(res.data));
    };

    useEffect(() => {
        fetchMyRes();
    }, [user, refreshTrigger]);

    const handleRenew = async (id: number) => {
        try {
            await api.post(`/reservations/${id}/renew`);
            alert('续活成功！(Renewed Successfully)');
            fetchMyRes();
        } catch (e) {
            alert('Failed to renew');
        }
    };

    if (reservations.length === 0) return null;

    return (
        <div className="space-y-4">
            {reservations.map(res => {
                const daysLeft = differenceInDays(parseISO(res.end_date), new Date()) + 1;
                return (
                    <div key={res.id} className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 animate-in slide-in-from-top-2">
                        <div>
                            <h3 className="font-bold text-blue-200 flex items-center gap-2 text-lg">
                                <Calendar size={20} className="text-blue-400" />
                                正在使用: {res.workstation_name || `ID ${res.workstation_id}`}
                            </h3>
                            <p className="text-sm text-white/70 mt-1">
                                有效期至 <b>{res.end_date}</b> (剩余 {daysLeft} 天)
                            </p>
                        </div>
                        <button
                            onClick={() => handleRenew(res.id)}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95"
                        >
                            <Heart size={16} className="fill-current" />
                            每日续活 (Renew)
                        </button>
                    </div>
                )
            })}
        </div>
    );
}

export default function Dashboard() {
    const { user, logout } = useAuth();
    const [data, setData] = useState<WorkstationsByRoom>({});
    const [loading, setLoading] = useState(true);
    const [selectedWs, setSelectedWs] = useState<any>(null);

    // User Color Mapping
    const [userColorMap, setUserColorMap] = useState<Record<string, string>>({});

    const isAdmin = user?.name === 'admin';

    const fetchData = useCallback(async () => {
        try {
            const res = await api.get('/workstations');
            setData(res.data);

            // Calculate User Colors
            const allStations = Object.values(res.data).flat();
            const busyUsers = Array.from(new Set(allStations
                .filter((ws: any) => ws.status === 'busy' && ws.current_user_name)
                .map((ws: any) => ws.current_user_name as string)
            )).sort(); // Sort to keep colors stable-ish

            const newColorMap: Record<string, string> = {};
            busyUsers.forEach((name, index) => {
                newColorMap[name] = USER_COLORS[index % USER_COLORS.length];
            });
            setUserColorMap(newColorMap);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleReservationSuccess = () => {
        setSelectedWs(null);
        fetchData();
        alert('预约成功！(Reservation Successful)');
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white selection:bg-blue-500/30">
            {/* Navbar - Fixed & Glass */}
            <header className="fixed top-0 left-0 right-0 z-40 bg-[#0f172a]/90 backdrop-blur-md border-b border-white/10 px-6 py-3 flex justify-between items-center shadow-lg h-16">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center font-bold text-base shadow-lg shadow-blue-500/20">
                        IW
                    </div>
                    <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 hidden sm:block">
                        钢铁工作站
                    </h1>
                </div>

                {/* User Legend (Center) - Only show if there are active users */}
                {Object.keys(userColorMap).length > 0 && (
                    <div className="hidden lg:flex items-center gap-4 overflow-x-auto max-w-[40vw] scrollbar-hide">
                        {Object.entries(userColorMap).map(([name, color]) => (
                            <div key={name} className="flex items-center gap-1.5 shrink-0 bg-white/5 px-2 py-1 rounded-full border border-white/5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></div>
                                <span className="text-xs text-white/80 font-medium">{name}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-4 text-sm">
                    <div className="hidden md:block text-right">
                        <p className="font-medium text-white">{user?.name}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">{user?.grade}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-red-300"
                        title="退出登录"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* Mobile Legend (Shown below header on small screens) */}
            {Object.keys(userColorMap).length > 0 && (
                <div className="lg:hidden fixed top-16 left-0 right-0 z-30 bg-[#0f172a]/95 border-b border-white/10 px-4 py-2 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-3">
                    {Object.entries(userColorMap).map(([name, color]) => (
                        <div key={name} className="flex items-center gap-1.5 shrink-0">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                            <span className="text-xs text-white/70">{name}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Main Content - Compact Grid */}
            <main className="pt-20 lg:pt-24 pb-20 px-4 md:px-8 max-w-[1920px] mx-auto space-y-8">
                {!isAdmin && <ActiveReservations user={user} refreshTrigger={data} />}

                {isAdmin ? (
                    <AdminPanel />
                ) : (
                    <>
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <RefreshCw className="animate-spin text-blue-400" size={32} />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 auto-rows-min">
                                {Object.entries(data).map(([room, stations]) => (
                                    <div key={room} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col h-full">
                                        {/* Room Header */}
                                        <div className="bg-white/5 px-6 py-3 border-b border-white/5 flex items-center justify-between">
                                            <h2 className="text-lg font-bold text-white/90 flex items-center gap-2">
                                                <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                                                {room}
                                            </h2>
                                            <span className="text-xs text-white/40 font-mono">
                                                {stations.length} MACHINES
                                            </span>
                                        </div>

                                        {/* Machines Grid - Compact */}
                                        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                                            {stations.map((ws: any) => (
                                                <WorkstationCard
                                                    key={ws.id}
                                                    workstation={ws}
                                                    onClick={() => setSelectedWs(ws)}
                                                    compact={true}
                                                    userColor={ws.status === 'busy' && ws.current_user_name ? userColorMap[ws.current_user_name] : undefined}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Modal */}
            {selectedWs && (
                <ReservationModal
                    workstation={selectedWs}
                    onClose={() => setSelectedWs(null)}
                    onSuccess={handleReservationSuccess}
                />
            )}
        </div>
    );
}
