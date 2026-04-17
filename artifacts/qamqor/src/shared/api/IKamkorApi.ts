import { User, ServiceRequest, Review } from './types';

export interface IKamkorApi {
    // Requests API
    getRequests(): Promise<ServiceRequest[]>;
    getRequestById(id: string): Promise<ServiceRequest | null>;
    createRequest(data: Omit<ServiceRequest, 'id' | 'createdAt' | 'status'>): Promise<ServiceRequest>;
    updateRequestStatus(id: string, status: ServiceRequest['status']): Promise<ServiceRequest>;

    // Users / Volunteers API
    getVolunteers(): Promise<User[]>;
    getUserById(id: string): Promise<User | null>;

    // Reviews API
    getReviewsByUserId(userId: string): Promise<Review[]>;
    submitReview(data: Omit<Review, 'id' | 'createdAt'>): Promise<Review>;
}
