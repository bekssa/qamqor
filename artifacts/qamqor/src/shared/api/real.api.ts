import { IKamkorApi } from './IKamkorApi';
import { User, ServiceRequest, Review } from './types';

export class RealKamkorApi implements IKamkorApi {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    async getRequests(): Promise<ServiceRequest[]> {
        return this.fetchApi<ServiceRequest[]>('/requests');
    }

    async getRequestById(id: string): Promise<ServiceRequest | null> {
        return this.fetchApi<ServiceRequest | null>(`/requests/${id}`);
    }

    async createRequest(data: Omit<ServiceRequest, 'id' | 'createdAt' | 'status'>): Promise<ServiceRequest> {
        return this.fetchApi<ServiceRequest>('/requests', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateRequestStatus(id: string, status: ServiceRequest['status']): Promise<ServiceRequest> {
        return this.fetchApi<ServiceRequest>(`/requests/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    }

    async getVolunteers(): Promise<User[]> {
        return this.fetchApi<User[]>('/users?role=volunteer');
    }

    async getUserById(id: string): Promise<User | null> {
        return this.fetchApi<User | null>(`/users/${id}`);
    }

    async getReviewsByUserId(userId: string): Promise<Review[]> {
        return this.fetchApi<Review[]>(`/reviews?targetId=${userId}`);
    }

    async submitReview(data: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
        return this.fetchApi<Review>('/reviews', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
}
