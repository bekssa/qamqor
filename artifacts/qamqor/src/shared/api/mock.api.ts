import { IKamkorApi } from './IKamkorApi';
import { User, ServiceRequest, Review } from './types';

// In-memory mock databases
let mockUsers: User[] = [
    { id: 'u1', name: 'Анна Иванова', role: 'volunteer', phone: '+7 777 123 4567', rating: 4.8 },
    { id: 'u2', name: 'Иван Петров', role: 'volunteer', rating: 5.0 },
    { id: 'u3', name: 'Мария Смирнова', role: 'elderly', phone: '+7 701 000 0000' },
];

let mockRequests: ServiceRequest[] = [
    {
        id: 'req1',
        title: 'Помощь с покупкой продуктов',
        description: 'Нужно купить хлеб, молоко и кефир.',
        authorId: 'u3',
        status: 'open',
        category: 'Покупки',
        location: 'Алматы, Бостандыкский район',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'req2',
        title: 'Сопровождение в поликлинику',
        description: 'Нужно помочь дойти до поликлиники №4.',
        authorId: 'u3',
        executorId: 'u1',
        status: 'in_progress',
        category: 'Медицина',
        location: 'Астана, Есильский район',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
    }
];

let mockReviews: Review[] = [
    {
        id: 'rev1',
        authorId: 'u3',
        targetId: 'u1',
        rating: 5,
        comment: 'Очень отзывчивая и добрая девушка, спасибо за помощь!',
        createdAt: new Date().toISOString(),
    }
];

const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

export class MockKamkorApi implements IKamkorApi {

    async getRequests(): Promise<ServiceRequest[]> {
        await delay();
        return [...mockRequests];
    }

    async getRequestById(id: string): Promise<ServiceRequest | null> {
        await delay();
        return mockRequests.find(r => r.id === id) || null;
    }

    async createRequest(data: Omit<ServiceRequest, 'id' | 'createdAt' | 'status'>): Promise<ServiceRequest> {
        await delay();
        const newRequest: ServiceRequest = {
            ...data,
            id: `req${Date.now()}`,
            status: 'open',
            createdAt: new Date().toISOString(),
        };
        mockRequests.push(newRequest);
        return newRequest;
    }

    async updateRequestStatus(id: string, status: ServiceRequest['status']): Promise<ServiceRequest> {
        await delay();
        const index = mockRequests.findIndex(r => r.id === id);
        if (index === -1) throw new Error('Request not found');

        mockRequests[index] = { ...mockRequests[index], status };
        return mockRequests[index];
    }

    async getVolunteers(): Promise<User[]> {
        await delay();
        return mockUsers.filter(u => u.role === 'volunteer');
    }

    async getUserById(id: string): Promise<User | null> {
        await delay();
        return mockUsers.find(u => u.id === id) || null;
    }

    async getReviewsByUserId(userId: string): Promise<Review[]> {
        await delay();
        return mockReviews.filter(r => r.targetId === userId);
    }

    async submitReview(data: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
        await delay();
        const newReview: Review = {
            ...data,
            id: `rev${Date.now()}`,
            createdAt: new Date().toISOString(),
        };
        mockReviews.push(newReview);
        return newReview;
    }
}
