import React from 'react';
import { Cpu, HardDrive, User, Server, Layers, Laptop } from 'lucide-react';
import { getUserColor } from '../lib/utils';

interface Workstation {
    id: number;
    name: string;
    room: string;
    status: 'idle' | 'busy' | 'offline';
    cpu_info?: string;
    memory_gb?: number;
    gpu_info?: string;
    os_info?: string;
    current_user_name?: string;
    admin_name?: string;
    core_count?: string;
    type?: 'workstation' | 'cluster' | 'laptop';
    contact_method?: string;
    seat_location?: string;
    last_user_name?: string;
    last_contact_method?: string;
}

interface Props {
    workstation: Workstation;
    onClick: () => void;
    compact?: boolean;
    userColor?: string;
    isMine?: boolean;
}

export function WorkstationCard({ workstation, onClick, compact = false, isMine = false }: Props) {
    const isBusy = workstation.status === 'busy';
    const activeUserColor = isBusy && workstation.current_user_name ? getUserColor(workstation.current_user_name) : undefined;

    // Dynamic Styles
    let borderColor = 'border-green-500/30';
    let bgColor = 'bg-green-950/10';
    let glowClass = 'shadow-green-950/10 shadow-lg';

    if (isMine) {
        borderColor = 'border-blue-500/60';
        bgColor = 'bg-gradient-to-br from-blue-950/30 to-indigo-950/20';
        glowClass = 'shadow-[0_0_15px_rgba(59,130,246,0.35)]';
    } else if (isBusy) {
        borderColor = activeUserColor ? `border-opacity-60` : 'border-red-500/40';
        bgColor = 'bg-red-950/10';
        glowClass = 'shadow-red-950/10';
    }

    return (
        <div
            onClick={onClick}
            className={`
                relative group cursor-pointer 
                border ${borderColor} ${bgColor} 
                rounded-xl transition-all duration-75 
                hover:scale-[1.02] hover:shadow-xl hover:border-opacity-80
                flex flex-col backdrop-blur-md
                ${compact ? 'p-2.5' : 'p-3'} ${glowClass}
            `}
            style={isBusy && !isMine && activeUserColor ? { borderColor: activeUserColor, boxShadow: `0 0 12px -3px ${activeUserColor}` } : {}}
        >
            {/* Header: Name & Status */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0 pr-2">
                    <h3 className={`font-bold text-white truncate leading-tight flex items-center gap-1 ${compact ? 'text-xs' : 'text-sm'}`} title={workstation.name}>
                        {workstation.type === 'laptop' && <Laptop size={12} className="text-blue-300 shrink-0" />}
                        <span className="truncate">{workstation.name}</span>
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] text-white/50 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 truncate">
                            {workstation.room}
                        </span>
                        {workstation.admin_name && (
                            <span className="text-[10px] text-blue-300 font-bold flex items-center gap-0.5 truncate" title={workstation.type === 'laptop' ? "责任保管人" : "管理员"}>
                                <User size={10} /> {workstation.type === 'laptop' ? `保管人: ${workstation.admin_name}` : workstation.admin_name}
                            </span>
                        )}
                    </div>
                </div>

                {/* Status Badge */}
                <div className={`
                    flex-shrink-0 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider
                    ${isMine ? 'bg-blue-600 text-white shadow-sm' : isBusy ? 'bg-red-500 text-white shadow-sm' : 'bg-green-500/20 text-green-400 border border-green-500/30'}
                `} style={isBusy && !isMine && activeUserColor ? { backgroundColor: activeUserColor } : {}}>
                    {isMine ? 'MINE' : isBusy ? (workstation.current_user_name || 'BUSY') : 'IDLE'}
                </div>
            </div>

            {/* Hardware Grid - Very Compact */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] text-white/60 mt-auto bg-black/30 rounded p-1.5 border border-white/5">
                <div className="flex items-center gap-1 truncate" title={workstation.cpu_info}>
                    <Cpu size={11} className="text-white/40 flex-shrink-0" />
                    <span className="truncate">{workstation.cpu_info?.split(' ')[0] || 'CPU'}</span>
                </div>

                <div className="flex items-center gap-1 truncate">
                    <Layers size={11} className="text-white/40 flex-shrink-0" />
                    <span className="truncate">{workstation.core_count?.replace('核心', 'C').replace('核', 'C') || '-'}</span>
                </div>

                <div className="flex items-center gap-1 truncate">
                    <HardDrive size={11} className="text-white/40 flex-shrink-0" />
                    <span>{workstation.memory_gb ? `${workstation.memory_gb}G` : '-'}</span>
                </div>

                <div className="flex items-center gap-1 truncate" title={workstation.os_info}>
                    <Server size={11} className="text-white/40 flex-shrink-0" />
                    <span className="truncate">{workstation.os_info?.includes('Windows') ? 'Win' : 'Linux'}</span>
                </div>
            </div>

            {/* 一键微信联系与工位卡 (2.0 物理实用核心) */}
            {isMine ? (
                <div className="mt-2 pt-1.5 border-t border-blue-500/20 text-[9px] text-blue-300 font-medium text-center">
                    ✨ 正在被你预约使用
                </div>
            ) : isBusy && (workstation.contact_method || workstation.seat_location) ? (
                <div className="mt-2 pt-1.5 border-t border-white/5 text-[9px] text-white/50 flex flex-col gap-0.5 animate-in fade-in duration-200">
                    {workstation.seat_location && (
                        <div className="flex items-center gap-1">
                            <span className="shrink-0 text-white/40">📍 座位:</span>
                            <span className="text-white/80 font-medium truncate">{workstation.seat_location}</span>
                        </div>
                    )}
                    {workstation.contact_method && (
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span className="truncate text-white/40">💬 微信: <b className="text-blue-300 font-mono select-all text-[11px]">{workstation.contact_method}</b></span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(workstation.contact_method || '');
                                    alert(`微信号 [${workstation.contact_method}] 已成功复制！(WeChat Copied!)`);
                                }}
                                className="px-1.5 py-0.5 bg-blue-500/10 hover:bg-blue-500/30 text-blue-300 rounded border border-blue-400/20 cursor-pointer active:scale-95 transition-transform text-[8px] shrink-0"
                            >
                                复制
                            </button>
                        </div>
                    )}
                </div>
            ) : !isBusy && workstation.last_user_name ? (
                <div className="mt-2 pt-1.5 border-t border-white/5 text-[9px] text-white/50 flex flex-col gap-0.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between gap-1">
                        <span className="truncate flex items-center gap-1 text-white/40">
                            <span>⏮️ 最近使用:</span>
                            <span 
                                className="font-bold px-1.5 py-0.5 rounded text-[8px] text-white shadow-sm" 
                                style={{ backgroundColor: getUserColor(workstation.last_user_name) }}
                            >
                                {workstation.last_user_name}
                            </span>
                        </span>
                        {workstation.last_contact_method && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(workstation.last_contact_method || '');
                                    alert(`最近使用人 [${workstation.last_user_name}] 的微信号 [${workstation.last_contact_method}] 已成功复制！`);
                                }}
                                className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded border border-white/10 cursor-pointer active:scale-95 transition-all text-[8px] shrink-0"
                                title={`复制微信: ${workstation.last_contact_method}`}
                            >
                                复制微信
                            </button>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
