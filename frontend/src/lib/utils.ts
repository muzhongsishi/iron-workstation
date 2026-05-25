import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getUserColor(name: string): string {
    if (!name) return '#94a3b8'; // Slate 400
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
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
    return colors[Math.abs(hash) % colors.length];
}
