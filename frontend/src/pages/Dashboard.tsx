import { getUserColor } from "../lib/utils";
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { WorkstationCard } from '../components/WorkstationCard';
import { ReservationModal } from '../components/ReservationModal';

import { LogOut, RefreshCw, Calendar, Heart, Map, Laptop, Monitor, Layers } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { ROOMS_CONFIG } from '../lib/building_config';

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
            {/* 💡 每日续活机制说明温馨气泡 */}
            <div className="bg-[#1e293b]/60 border border-blue-500/20 backdrop-blur-md rounded-2xl p-4 flex gap-3 text-xs sm:text-sm text-white/70 leading-relaxed max-w-4xl mx-auto shadow-lg animate-in slide-in-from-top-2">
                <span className="text-lg shrink-0 mt-0.5">💡</span>
                <div>
                    <p className="font-bold text-blue-300">💡 每日续活机制提示 (Heartbeat Tip)</p>
                    <p className="mt-1">
                        为防止公用计算设备被闲置占用，预约设备后每天需点击下方<b>“每日续活”</b>按钮。
                        若<b>当天下午 18:00 仍未续活</b>，系统将通过邮件自动提醒您。
                        请在每天到期前及时续活或主动释放资源，感谢您的配合！
                    </p>
                </div>
            </div>

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
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95 cursor-pointer"
                        >
                            <Heart size={16} className="fill-current animate-pulse" />
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

    // 2.0 State 过滤项
    const [activeFilterRoom, setActiveFilterRoom] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'workstation' | 'cluster' | 'laptop'>('all');



    const isAdmin = user?.name === 'admin';

    const fetchData = useCallback(async () => {
        try {
            const res = await api.get('/workstations');
            setData(res.data);



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

    // 模糊匹配大楼打点房间与数据Key
    const getRoomStations = useCallback((roomKey: string) => {
        const matchedKey = Object.keys(data).find(key => key.toLowerCase().includes(roomKey.toLowerCase()));
        return matchedKey ? data[matchedKey] : [];
    }, [data]);

    // 计算被筛选房间下过滤了 Tab 后的机器列表
    const getFilteredStationsForFilteredRoom = () => {
        if (!activeFilterRoom) return [];
        const stations = getRoomStations(activeFilterRoom);
        return stations.filter((ws: any) => {
            if (activeTab === 'all') return true;
            return ws.type === activeTab;
        });
    };

    const filteredStationsForRoom = getFilteredStationsForFilteredRoom();

    // 获取当前占用设备的用户去重名单
    const activeUsers = Array.from(new Set(
        Object.values(data).flat()
            .filter((ws: any) => ws.status === "busy" && ws.current_user_name)
            .map((ws: any) => ws.current_user_name as string)
    )).sort();

    return (
        <div className="min-h-screen bg-[#0f172a] text-white selection:bg-blue-500/30">
            {/* Navbar - Fixed & Glass */}
            <header className="fixed top-0 left-0 right-0 z-40 bg-[#0f172a]/90 backdrop-blur-md border-b border-white/10 px-6 py-3 flex justify-between items-center shadow-lg h-16">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center font-bold text-base shadow-lg shadow-blue-500/20">
                        IW
                    </div>
                    <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 hidden sm:block">
                        钢铁工作站 2.0
                    </h1>
                </div>

                {/* User Legend (Center) - Only show if there are active users */}
                {activeUsers.length > 0 && (
                    <div className="hidden lg:flex items-center gap-4 overflow-x-auto max-w-[40vw] scrollbar-hide">
                        {activeUsers.map(name => (
                            <div key={name} className="flex items-center gap-1.5 shrink-0 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getUserColor(name) }}></div>
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
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-red-300 cursor-pointer"
                        title="退出登录"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* Mobile Legend */}
            {activeUsers.length > 0 && (
                <div className="lg:hidden fixed top-16 left-0 right-0 z-30 bg-[#0f172a]/95 border-b border-white/10 px-4 py-2 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-3">
                    {activeUsers.map(name => (
                        <div key={name} className="flex items-center gap-1.5 shrink-0">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getUserColor(name) }}></div>
                            <span className="text-xs text-white/70">{name}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Main Content */}
            <main className="pt-20 lg:pt-24 pb-20 px-4 md:px-8 max-w-[1920px] mx-auto space-y-8 animate-in fade-in duration-300">
                <ActiveReservations user={user} refreshTrigger={data} />
                <>
                        {/* 🏢 船池大楼正视图物理空间导航 */}
                        {!loading && Object.keys(data).length > 0 && (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 max-w-4xl mx-auto shadow-2xl backdrop-blur-xl">
                                <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                                    <h3 className="font-bold text-sm sm:text-base text-blue-200 flex items-center gap-2">
                                        <Map size={18} className="text-blue-400" />
                                        船池大楼物理中控看板 (Building Control Map)
                                    </h3>
                                    {activeFilterRoom && (
                                        <button
                                            onClick={() => setActiveFilterRoom(null)}
                                            className="text-[10px] sm:text-xs px-3 py-1 bg-blue-500/10 hover:bg-blue-500/30 text-blue-300 rounded-full border border-blue-400/20 active:scale-95 transition-all cursor-pointer"
                                        >
                                            重置筛选 (显示全楼)
                                        </button>
                                    )}
                                </div>

                                <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950/40">
                                    <img
                                        src="https://vgmvurrbwotenkpulqjh.supabase.co/storage/v1/object/public/assets/chuanchiloutupian.png"
                                        alt="船池大楼"
                                        className="w-full h-auto opacity-75"
                                    />


                                    {/* 渲染高饱和度、带常驻名字坐标点 */}
                                    {ROOMS_CONFIG.map((config) => {
                                        const roomStations = getRoomStations(config.room);
                                        const total = roomStations.length;
                                        
                                        const busy = roomStations.filter((ws: any) => ws.status === 'busy').length;
                                        const idle = total - busy;
                                        const isSelected = activeFilterRoom === config.room;

                                        // 智能计算高饱和度发光颜色与发光阴影
                                        let beaconColor = "bg-green-400 neon-green";
                                        if (total === 0) {
                                            
                                            beaconColor = "bg-slate-500 neon-slate";
                                        } else if (busy === total) {
                                            // 全忙
                                            beaconColor = "bg-red-500 neon-red";
                                        } else if (busy > 0) {
                                            // 部分空闲
                                            beaconColor = "bg-yellow-400 neon-yellow";
                                        }

                                        const roomFullName = /^\d+$/.test(config.room) ? `${config.room}室` : config.room;

                                        return (
                                            <div
                                                key={config.room}
                                                onClick={() => {
                                                    setActiveFilterRoom(isSelected ? null : config.room);
                                                    if (activeTab === 'laptop') {
                                                        setActiveTab('all');
                                                    }
                                                    document.getElementById("rooms-grid")?.scrollIntoView({ behavior: 'smooth' });
                                                }}
                                                className={`absolute w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full cursor-pointer z-20 group -translate-x-1/2 -translate-y-1/2 transition-all duration-300 hover:scale-125
                                                    ${isSelected ? 'ring-4 ring-blue-400 scale-125' : ''}
                                                `}
                                                style={{ top: `${config.top}%`, left: `${config.left}%` }}
                                            >
                                                {/* 发光中心点 */}
                                                <div className={`w-full h-full rounded-full ${beaconColor}`} />

                                                {/* 🏷️ 2.0 永久常驻的加粗物理名字小气泡标签 (全称 + 字体加大二倍) */}
                                                <div className={`absolute top-6 left-1/2 -translate-x-1/2 px-2 py-1 rounded-xl border-2 text-xs sm:text-sm font-black tracking-wide shadow-lg whitespace-nowrap z-20 pointer-events-none transition-all duration-300
                                                    ${isSelected 
                                                        ? 'bg-blue-600 border-blue-400 text-white font-extrabold scale-110 shadow-blue-500/30' 
                                                        : 'bg-slate-900/95 border-white/20 text-white/90'}`}
                                                >
                                                    {roomFullName}
                                                </div>

                                                {/* 悬浮更详尽气泡框 (Hover 时展现电脑状态) */}
                                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-md border border-white/20 px-2.5 py-1.5 rounded-lg text-[10px] text-white font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 shadow-xl whitespace-nowrap z-30 flex flex-col gap-0.5">
                                                    <span className="text-blue-300 font-extrabold">{roomFullName} / 区域</span>
                                                    {total === 0 ? (
                                                        <span className="text-[9px] text-white/50">暂无计算设备</span>
                                                    ) : (
                                                        <span className="text-[9px] text-white/60">空闲: {idle} | 占用: {busy}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex gap-4 items-center justify-center mt-4 text-[10px] text-white/50">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_#22c55e]" />
                                        全空闲 (Idle)
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_8px_#f59e0b]" />
                                        部分使用 (Busy)
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                                        全部爆满 (Full)
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2.5 h-2.5 rounded-full bg-slate-500 neon-slate" />
                                        未部署设备 (Empty)
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 💻 分类选项卡 Tabs */}
                        <div className="flex justify-center gap-2 mb-6 max-w-lg mx-auto flex-wrap px-4">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer
                                    ${activeTab === 'all'
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'}`}
                            >
                                全部资源
                            </button>
                            <button
                                onClick={() => setActiveTab('workstation')}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer flex items-center gap-1.5
                                    ${activeTab === 'workstation'
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'}`}
                            >
                                <Monitor size={12} />
                                台式工作站
                            </button>
                            <button
                                onClick={() => setActiveTab('cluster')}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer flex items-center gap-1.5
                                    ${activeTab === 'cluster'
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'}`}
                            >
                                <Layers size={12} />
                                共享集群
                            </button>
                            <button
                                onClick={() => setActiveTab('laptop')}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer flex items-center gap-1.5
                                    ${activeTab === 'laptop'
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'}`}
                            >
                                <Laptop size={12} />
                                公用笔记本
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-20">
                                <RefreshCw className="animate-spin text-blue-400" size={32} />
                            </div>
                        ) : (
                            <div id="rooms-grid" className="scroll-mt-20">
                                {/* 💡 3.0 重构：当点击对应房间筛选时，直接平铺罗列设备，摒弃冗余的“房间大包围框” */}
                                {activeTab === 'laptop' ? (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/5 pb-4 mb-6">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-5 bg-blue-500 rounded-full" />
                                                <span className="text-sm sm:text-base text-blue-200 font-semibold flex items-baseline gap-1">
                                                    正在查看：<b className="text-white text-lg font-black">💻 公用共享笔记本</b>
                                                </span>
                                                <span className="text-[10px] bg-blue-500/20 border border-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full font-mono">
                                                    {Object.values(data).flat().filter((ws: any) => ws.type === 'laptop').length} DEVICES
                                                </span>
                                            </div>
                                        </div>

                                        {Object.values(data).flat().filter((ws: any) => ws.type === 'laptop').length === 0 ? (
                                            <div className="text-center py-16 text-white/40 text-sm font-medium">
                                                暂无公用共享笔记本设备
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                                                {Object.values(data).flat().filter((ws: any) => ws.type === 'laptop').map((ws: any) => (
                                                    <WorkstationCard
                                                        key={ws.id}
                                                        workstation={ws}
                                                        onClick={() => setSelectedWs(ws)}
                                                        compact={false}
                                                        
                                                        isMine={ws.current_user_name === user?.name}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : activeFilterRoom ? (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/5 pb-4 mb-6">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-5 bg-blue-500 rounded-full" />
                                                <span className="text-sm sm:text-base text-blue-200 font-semibold flex items-baseline gap-1">
                                                    正在查看：<b className="text-white text-lg font-black">{/^\d+$/.test(activeFilterRoom) ? `${activeFilterRoom}室` : activeFilterRoom}</b>
                                                </span>
                                                <span className="text-[10px] bg-blue-500/20 border border-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full font-mono">
                                                    {filteredStationsForRoom.length} DEVICES
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setActiveFilterRoom(null)}
                                                className="text-xs px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 cursor-pointer active:scale-95 transition-all self-start sm:self-auto"
                                            >
                                                清除过滤 (查看全楼房间)
                                            </button>
                                        </div>

                                        {filteredStationsForRoom.length === 0 ? (
                                            <div className="text-center py-16 text-white/40 text-sm font-medium">
                                                该区域下暂无此类型的计算设备
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                                                {filteredStationsForRoom.map((ws: any) => (
                                                    <WorkstationCard
                                                        key={ws.id}
                                                        workstation={ws}
                                                        onClick={() => setSelectedWs(ws)}
                                                        compact={false} /* 筛选平铺后可以显示更大更精致的卡片 */
                                                        
                                                        isMine={ws.current_user_name === user?.name}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* 全楼状态下：依然按房间分组大框包围展示 */
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 auto-rows-min">
                                        {Object.entries(data).map(([room, stations]) => {
                                            const filteredStations = stations.filter((ws: any) => {
                                                if (activeTab === 'all') return true;
                                                return ws.type === activeTab;
                                            });

                                            if (filteredStations.length === 0) return null;

                                            return (
                                                <div key={room} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col h-full animate-in slide-in-from-bottom-2">
                                                    {/* Room Header */}
                                                    <div className="bg-white/5 px-6 py-3 border-b border-white/5 flex items-center justify-between">
                                                        <h2 className="text-lg font-bold text-white/90 flex items-center gap-2">
                                                            <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                                                            {room}
                                                        </h2>
                                                        <span className="text-xs text-white/40 font-mono">
                                                            {filteredStations.length} DEVICES
                                                        </span>
                                                    </div>

                                                    {/* Machines Grid - Compact */}
                                                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                                                        {filteredStations.map((ws: any) => (
                                                            <WorkstationCard
                                                                key={ws.id}
                                                                workstation={ws}
                                                                onClick={() => setSelectedWs(ws)}
                                                                compact={true}
                                                                
                                                                isMine={ws.current_user_name === user?.name}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
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
