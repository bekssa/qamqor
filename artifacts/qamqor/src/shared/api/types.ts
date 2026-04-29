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
    aboutMe?: string;
    categories?: string[];
    firstName?: string;
    lastName?: string;
    city?: string;
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
    lastMessage?: {
        text: string;
        senderId: string;
        timestamp: string;
    } | null;
}

export interface ModerationReport {
    id: string;
    senderId: string;
    senderName: string;
    senderEmail: string;
    senderPhone: string;
    senderAvatarUrl: string | null;
    chatId: string;
    messageText: string;
    violations: string;
    explanation: string;
    status: "PENDING" | "REVIEWED" | "DISMISSED";
    adminChatId: string | null;
    createdAt: string;
}

export interface Message {
    id: number;
    chatId: string;
    senderId: string;
    text: string;
    timestamp: string;
    flagged?: boolean;
}

export interface Review {
    id: string;
    authorId: string;
    targetId: string;
    rating: number;
    comment: string;
    createdAt: string;
}

export type DocStatus = "PENDING" | "APPROVED" | "REJECTED";
export type DocType = "NARCO_CERT" | "PSYCH_CERT" | "NO_CRIMINAL";

export interface UserDocument {
    id: string;
    userId: string;
    documentType: DocType;
    fileName: string;
    fileUrl: string;
    status: DocStatus;
    rejectReason: string | null;
    uploadedAt: string;
    reviewedAt: string | null;
}
