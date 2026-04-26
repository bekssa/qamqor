import { User, ServiceRequest, Review, Chat, Message, ResponseStatus } from './types';

export interface IKamkorApi {
    // Requests API
    getRequests(): Promise<ServiceRequest[]>;
    getMyRequests(): Promise<ServiceRequest[]>;
    getAssignedRequests(): Promise<ServiceRequest[]>;
    getAvailableRequests(): Promise<ServiceRequest[]>;
    getRequestById(id: string): Promise<ServiceRequest | null>;
    createRequest(data: Omit<ServiceRequest, 'id' | 'createdAt' | 'status' | 'authorId' | 'executorId'>): Promise<ServiceRequest>;
    updateRequestStatus(id: string, status: ServiceRequest['status'], price?: number): Promise<ServiceRequest>;
    respondToRequest(id: string): Promise<void>;
    getMyResponses(): Promise<{ requestId: string; status: ResponseStatus }[]>;
    acceptResponse(responseId: string): Promise<void>;
    declineResponse(responseId: string): Promise<void>;
    getNotifications(): Promise<{ id: string; type: string; requestId: string; requestTitle: string; actorName: string | null; responseId: string | null; createdAt: string }[]>;

    // Users / Volunteers API
    getVolunteers(): Promise<User[]>;
    getUserById(id: string): Promise<User | null>;

    // Profile API
    getMe(): Promise<{ user: import('./types').User & { firstName?: string; lastName?: string; birthDate?: string; city?: string } }>;
    updateUserProfile(data: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        city?: string;
        role?: string;
    }): Promise<{ user: import('./types').User & { firstName?: string; lastName?: string; birthDate?: string; city?: string } }>;
    uploadAvatar(file: File): Promise<{ user: import('./types').User & { firstName?: string; lastName?: string; birthDate?: string; city?: string; categories?: string[] } }>;
    deleteAvatar(): Promise<{ user: import('./types').User & { firstName?: string; lastName?: string; birthDate?: string; city?: string; categories?: string[] } }>;
    updateUserCategories(keys: string[]): Promise<{ user: import('./types').User & { firstName?: string; lastName?: string; birthDate?: string; city?: string; categories?: string[] } }>;
    getCategories(): Promise<{ key: string; label: string; description?: string }[]>;
    deleteAccount(): Promise<void>;

    // Auth / Verification API
    sendOtp(email: string): Promise<boolean>;
    verifyOtp(email: string, code: string, password?: string, regData?: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        role?: string;
        birthDate?: string;
        city?: string;
    }): Promise<{ user: User; token: string }>;
    loginWithPassword(email: string, password: string): Promise<{ user: User; token: string }>;

    // Reviews API
    getReviewsByUserId(userId: string): Promise<Review[]>;
    submitReview(data: Omit<Review, 'id' | 'createdAt'>): Promise<Review>;

    // Chat API
    getChats(): Promise<Chat[]>;
    openChat(otherUserId: string): Promise<Chat>;
    getMessages(chatId: string): Promise<Message[]>;
    getWsUrl(): string;
}
