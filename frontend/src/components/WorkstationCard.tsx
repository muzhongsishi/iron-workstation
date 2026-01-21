import React from 'react';
import { Cpu, HardDrive, User, Server, Layers } from 'lucide-react';

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
}

interface Props {
    workstation: Workstation;
    onClick: () => void;
    compact?: boolean;
    userColor?: string;
}

export function WorkstationCard({ workstation, onClick, compact = false, userColor }: Props) {
    const isBusy = workstation.status === 'busy';

    // Dynamic Styles
    const borderColor = isBusy
        ? (userColor || 'border-red-500/50')
        : 'border-green-500/30';

    const bgColor = isBusy
        ? (userColor ? `${userColor.replace('text-', 'bg-').replace('500', '900')}/20` : 'bg-red-900/10')
        : 'bg-green-900/10';

    const glowClass = isBusy
        ? (userColor ? `shadow-[0_0_15px_-5px_${userColor.replace('text-', '')}]` : 'shadow-red-900/20')
        : 'shadow-green-900/10 shadow-lg';

    return (
        <div
            onClick={onClick}
            className={`
        relative group cursor-pointer 
        border ${borderColor} ${bgColor} 
        rounded-xl transition-all duration-300 
        hover:scale-[1.02] hover:shadow-xl hover:border-opacity-80
        flex flex-col
        ${compact ? 'p-2' : 'p-3'} ${glowClass}
      `}
            style={isBusy && userColor ? { borderColor: 'currentColor', color: 'inherit' } : {}}
        >
            {/* Header: Name & Status */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0 pr-2">
                    <h3 className={`font-bold text-white truncate leading-tight ${compact ? 'text-xs' : 'text-sm'}`} title={workstation.name}>
                        {workstation.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-white/50 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 truncate">
                            {workstation.room}
                        </span>
                        {workstation.admin_name && (
                            <span className="text-[10px] text-blue-300/80 flex items-center gap-0.5 truncate" title="Admin">
                                <User size={10} /> {workstation.admin_name}
                            </span>
                        )}
                    </div>
                </div>

                {/* Status Badge */}
                <div className={`
          flex-shrink-0 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
          ${isBusy ? 'bg-red-500 text-white shadow-sm' : 'bg-green-500/20 text-green-400 border border-green-500/30'}
        `} style={isBusy && userColor ? { backgroundColor: userColor } : {}}>
                    {isBusy ? (workstation.current_user_name || 'BUSY') : 'IDLE'}
                </div>
            </div>

            {/* Hardware Grid - Very Compact */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-white/60 mt-auto bg-black/20 rounded p-2 border border-white/5">
                <div className="flex items-center gap-1.5 truncate" title={workstation.cpu_info}>
                    <Cpu size={12} className="text-white/40 flex-shrink-0" />
                    <span className="truncate">{workstation.cpu_info?.split(' ')[0] || 'CPU'}</span>
                </div>

                <div className="flex items-center gap-1.5 truncate">
                    <Layers size={12} className="text-white/40 flex-shrink-0" />
                    <span className="truncate">{workstation.core_count?.replace('核心', 'C').replace('核', 'C') || '-'}</span>
                </div>

                <div className="flex items-center gap-1.5 truncate">
                    <HardDrive size={12} className="text-white/40 flex-shrink-0" />
                    <span>{workstation.memory_gb ? `${workstation.memory_gb}G` : '-'}</span>
                </div>

                <div className="flex items-center gap-1.5 truncate" title={workstation.os_info}>
                    <Server size={12} className="text-white/40 flex-shrink-0" />
                    <span className="truncate">{workstation.os_info?.includes('Windows') ? 'Win' : 'Linux'}</span>
                </div>
            </div>
        </div>
    );
}
