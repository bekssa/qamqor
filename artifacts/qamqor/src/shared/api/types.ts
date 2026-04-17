export type UserRole = "volunteer" | "elderly";

export interface User {
    id: string;
    name: string;
    role: UserRole;
    avatar?: string;
    phone?: string;
    rating?: number;
}

export type RequestStatus = "open" | "in_progress" | "completed" | "cancelled";

export interface ServiceRequest {
    id: string;
    title: string;
    description: string;
    authorId: string;
    executorId?: string;
    status: RequestStatus;
    createdAt: string;
    category: string;
    location: string;
}

export interface Review {
    id: string;
    authorId: string;
    targetId: string;
    rating: number;
    comment: string;
    createdAt: string;
}
