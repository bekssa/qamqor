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

export interface ServiceRequest {
    id: string;
    title: string;
    description: string;
    authorId: string;
    authorName?: string;
    authorAvatarUrl?: string;
    executorId?: string;
    status: RequestStatus;
    createdAt: string;
    category: string;
    location: string;
    price?: number;
    scheduledDate?: string;
}

export interface Review {
    id: string;
    authorId: string;
    targetId: string;
    rating: number;
    comment: string;
    createdAt: string;
}
