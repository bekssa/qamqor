import { IKamkorApi } from './IKamkorApi';
import { User, ServiceRequest, Review, Chat, Message } from './types';

const TOKEN_KEY = 'qamqor-token';

export class RealKamkorApi implements IKamkorApi {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private getToken(): string | null {
        return localStorage.getItem(TOKEN_KEY);
    }

    private getMyId(): string | null {
        const token = this.getToken();
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.sub ?? null;
        } catch { return null; }
    }

    getWsUrl(): string {
        const httpBase = this.baseUrl.replace(/\/api\/v1\/?$/, '');
        const wsBase = httpBase
            .replace(/^https:\/\//, 'wss://')
            .replace(/^http:\/\//, 'ws://');
        return wsBase + '/ws-native';
    }

    private async fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const token = this.getToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options?.headers as Record<string, string>),
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`API Error ${response.status}: ${body || response.statusText}`);
        }

        const text = await response.text();
        return (text ? JSON.parse(text) : undefined) as T;
    }

    // ── Profile ───────────────────────────────────────────────────────────────

    async getMe() {
        const response = await this.fetchApi<{
            id: string; email: string; name: string; firstName?: string; lastName?: string;
            phone: string; avatarUrl: string; role: string; rating: number; birthDate?: string; city?: string;
        }>('/users/me');
        return { user: this.mapUser(response) };
    }

    async updateUserProfile(data: {
        firstName?: string; lastName?: string; phone?: string;
        city?: string; role?: string;
    }) {
        const response = await this.fetchApi<{
            id: string; email: string; name: string; firstName?: string; lastName?: string;
            phone: string; avatarUrl: string; role: string; rating: number; birthDate?: string; city?: string;
        }>('/users/me', {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
        return { user: this.mapUser(response) };
    }

    async uploadAvatar(file: File) {
        const token = this.getToken();
        const form = new FormData();
        form.append('file', file);
        const response = await fetch(`${this.baseUrl}/users/me/avatar`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: form,
        });
        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`API Error ${response.status}: ${body}`);
        }
        const data = await response.json();
        return { user: this.mapUser(data) };
    }

    async deleteAvatar() {
        const data = await this.fetchApi<any>('/users/me/avatar', { method: 'DELETE' });
        return { user: this.mapUser(data) };
    }

    async updateUserCategories(keys: string[]) {
        const data = await this.fetchApi<any>('/users/me/categories', {
            method: 'PUT',
            body: JSON.stringify(keys),
        });
        return { user: { ...this.mapUser(data), categories: data.categories ?? keys } };
    }

    async getCategories(): Promise<{ key: string; label: string; description?: string }[]> {
        return this.fetchApi('/categories');
    }

    async deleteAccount(): Promise<void> {
        await this.fetchApi<void>('/users/me', { method: 'DELETE' });
    }

    private mapUser(r: {
        id: string; email: string; name: string; firstName?: string; lastName?: string;
        phone: string; avatarUrl: string; role: string; rating: number;
        birthDate?: string; city?: string; categories?: string[];
    }) {
        return {
            id: r.id,
            email: r.email,
            name: r.firstName || r.name || r.email,
            firstName: r.firstName,
            lastName: r.lastName,
            phone: r.phone,
            avatarUrl: r.avatarUrl,
            role: (r.role as User['role']) || 'elderly',
            rating: r.rating,
            birthDate: r.birthDate,
            city: r.city,
            categories: r.categories ?? [],
        };
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    async sendOtp(email: string): Promise<boolean> {
        const res = await this.fetchApi<{ message: string; dev_code?: string }>('/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
        // DEV: auto-fill OTP input when backend returns code directly
        if (res.dev_code) {
            sessionStorage.setItem('dev_otp', res.dev_code);
        }
        return true;
    }

    async verifyOtp(email: string, code: string, password?: string, regData?: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        role?: string;
        birthDate?: string;
        city?: string;
    }): Promise<{ user: User; token: string }> {
        const body: Record<string, string> = { email, code };
        if (password) body['password'] = password;
        if (regData?.firstName) body['firstName'] = regData.firstName;
        if (regData?.lastName) body['lastName'] = regData.lastName;
        if (regData?.phone) body['phone'] = regData.phone;
        if (regData?.role) body['role'] = regData.role;
        if (regData?.birthDate) body['birthDate'] = regData.birthDate;
        if (regData?.city) body['city'] = regData.city;

        const response = await this.fetchApi<{
            token: string;
            user: {
                id: string; email: string; name: string; firstName?: string; lastName?: string;
                phone: string; avatarUrl: string; role: string; rating: number; birthDate?: string; city?: string;
            };
        }>('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify(body),
        });

        localStorage.setItem(TOKEN_KEY, response.token);
        return { user: this.mapUser(response.user), token: response.token };
    }

    async loginWithPassword(email: string, password: string): Promise<{ user: User; token: string }> {
        const response = await this.fetchApi<{
            token: string;
            user: {
                id: string; email: string; name: string; firstName?: string; lastName?: string;
                phone: string; avatarUrl: string; role: string; rating: number; birthDate?: string; city?: string;
            };
        }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        localStorage.setItem(TOKEN_KEY, response.token);
        return { user: this.mapUser(response.user), token: response.token };
    }

    async updatePassword(password: string): Promise<void> {
        try {
            await this.fetchApi<void>('/auth/password', {
                method: 'PATCH',
                body: JSON.stringify({ password }),
            });
        } catch (e: any) {
            console.warn("Ignoring updatePassword error (backend might not have this endpoint yet):", e);
        }
    }

    // ── Service Requests ─────────────────────────────────────────────────────

    async getRequests(): Promise<ServiceRequest[]> {
        return this.fetchApi<ServiceRequest[]>('/requests');
    }

    async getMyRequests(): Promise<ServiceRequest[]> {
        return this.fetchApi<ServiceRequest[]>('/requests/my');
    }

    async getAssignedRequests(): Promise<ServiceRequest[]> {
        return this.fetchApi<ServiceRequest[]>('/requests/assigned');
    }

    async getAvailableRequests(): Promise<ServiceRequest[]> {
        return this.fetchApi<ServiceRequest[]>('/requests/available');
    }

    async getRequestById(id: string): Promise<ServiceRequest | null> {
        return this.fetchApi<ServiceRequest | null>(`/requests/${id}`);
    }

    async createRequest(data: Omit<ServiceRequest, 'id' | 'createdAt' | 'status' | 'authorId' | 'executorId'>): Promise<ServiceRequest> {
        return this.fetchApi<ServiceRequest>('/requests', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateRequestStatus(id: string, status: ServiceRequest['status'], price?: number): Promise<ServiceRequest> {
        const body: Record<string, unknown> = { status: status.toUpperCase() };
        if (price !== undefined) body['price'] = price;
        return this.fetchApi<ServiceRequest>(`/requests/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
    }

    async respondToRequest(id: string): Promise<void> {
        await this.fetchApi<void>(`/requests/${id}/respond`, { method: 'POST' });
    }

    async getMyResponses() {
        return this.fetchApi<{ requestId: string; status: import('./types').ResponseStatus }[]>('/my-responses');
    }

    async acceptResponse(responseId: string): Promise<void> {
        await this.fetchApi<void>(`/responses/${responseId}/accept`, { method: 'POST' });
    }

    async declineResponse(responseId: string): Promise<void> {
        await this.fetchApi<void>(`/responses/${responseId}/decline`, { method: 'POST' });
    }

    async getNotifications() {
        return this.fetchApi<{ id: string; type: string; requestId: string; requestTitle: string; actorName: string | null; responseId: string | null; createdAt: string }[]>('/notifications');
    }

    // ── Users ────────────────────────────────────────────────────────────────

    async getVolunteers(): Promise<User[]> {
        return this.fetchApi<User[]>('/users?role=volunteer');
    }

    async getUserById(id: string): Promise<User | null> {
        return this.fetchApi<User | null>(`/users/${id}`);
    }

    // ── Reviews ──────────────────────────────────────────────────────────────

    async getReviewsByUserId(userId: string): Promise<Review[]> {
        return this.fetchApi<Review[]>(`/users/${userId}/reviews`);
    }

    async submitReview(data: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
        return this.fetchApi<Review>('/reviews', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // ── Chat ─────────────────────────────────────────────────────────────────

    async getChats(): Promise<Chat[]> {
        const myId = this.getMyId();
        if (!myId) return [];
        return this.fetchApi<Chat[]>(`/chats?userId=${myId}`);
    }

    async openChat(otherUserId: string): Promise<Chat> {
        const myId = this.getMyId();
        if (!myId) throw new Error('Not authenticated');
        return this.fetchApi<Chat>('/chats', {
            method: 'POST',
            body: JSON.stringify({ participantIds: [myId, otherUserId] }),
        });
    }

    async getMessages(chatId: string): Promise<Message[]> {
        return this.fetchApi<Message[]>(`/chats/${chatId}/messages`);
    }
}