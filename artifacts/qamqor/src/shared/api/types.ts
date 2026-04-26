export type UserRole = "volunteer" | "elderly" | "admin";

export interface User {
    id: string;
    name: string;
    email?: string;
    role: UserRole;
    avatar?: string;
    avatarUrl?: string;
    phone?: string;
    rating?: number;
}

export type RequestStatus = "open" | "in_progress" | "completed" | "cancelled";

export type ResponseStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export interface ServiceRequest {
    id: string;
    title: string;
    description: string;
    authorId: string;
    authorName?: string;
    authorAvatarUrl?: string;
    executorId?: string;
    executorName?: string;
    status: RequestStatus;
    createdAt: string;
    category: string;
    location: string;
    price?: number;
    scheduledDate?: string;
}

export interface ChatParticipant {
    id: string;
    name: string;
    avatarUrl: string | null;
}

export interface Chat {
    id: string;
    participants: ChatParticipant[];
    createdAt: string;
}

export interface Message {
    id: number;
    chatId: string;
    senderId: string;
    text: string;
    timestamp: string;
}

export interface Review {
    id: string;
    authorId: string;
    targetId: string;
    rating: number;
    comment: string;
    createdAt: string;
}
