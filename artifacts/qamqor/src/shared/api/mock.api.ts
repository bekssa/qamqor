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

    async getMyRequests(): Promise<ServiceRequest[]> {
        await delay();
        return [...mockRequests];
    }

    async getRequestById(id: string): Promise<ServiceRequest | null> {
        await delay();
        return mockRequests.find(r => r.id === id) || null;
    }

    async createRequest(data: Omit<ServiceRequest, 'id' | 'createdAt' | 'status' | 'authorId' | 'executorId'>): Promise<ServiceRequest> {
        await delay();
        const newRequest: ServiceRequest = {
            ...data,
            id: `req${Date.now()}`,
            authorId: 'u1',
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

    async deleteAvatar() {
        await delay();
        return { user: { ...mockUsers[0], avatarUrl: undefined, firstName: 'Анна', lastName: 'Иванова', birthDate: undefined, city: undefined, categories: [] } };
    }

    async updateUserCategories(keys: string[]) {
        await delay();
        return { user: { ...mockUsers[0], firstName: 'Анна', lastName: 'Иванова', birthDate: undefined, city: undefined, categories: keys } };
    }

    async getCategories() {
        await delay();
        return [
            { key: 'household', label: 'Бытовая помощь',    description: 'уборка, приготовление еды' },
            { key: 'medical',   label: 'Медицинская помощь', description: 'покупка лекарств, сопровождение' },
            { key: 'escort',    label: 'Сопровождение',      description: 'поход в больницу, прогулка' },
            { key: 'homework',  label: 'Домашние работы',    description: 'починка, мелкий ремонт' },
            { key: 'shopping',  label: 'Покупки',            description: 'продукты, хозяйственные товары' },
        ];
    }

    async deleteAccount(): Promise<void> {
        await delay();
    }

    async getMe() {
        await delay();
        return { user: { ...mockUsers[0], firstName: 'Анна', lastName: 'Иванова', birthDate: undefined, city: undefined } };
    }

    async uploadAvatar(_file: File) {
        await delay();
        return { user: { ...mockUsers[0], firstName: 'Анна', lastName: 'Иванова', birthDate: undefined, city: undefined } };
    }

    async updateUserProfile(data: {
        firstName?: string; lastName?: string; phone?: string;
        city?: string; role?: string;
    }) {
        await delay();
        const updated = { ...mockUsers[0], ...data, name: `${data.lastName ?? ''} ${data.firstName ?? ''}`.trim() };
        mockUsers[0] = updated;
        return { user: { ...updated, birthDate: undefined, city: data.city } };
    }

    async sendOtp(email: string): Promise<boolean> {
        await delay();
        console.log(`[МОК АПИ] 📧 Имитация отправки кода на почту ${email}. Реальная отправка будет после внедрения Spring Boot бэкенда.`);
        return true;
    }

    async verifyOtp(email: string, code: string, _password?: string, _regData?: {
        firstName?: string; lastName?: string; phone?: string;
        role?: string; birthDate?: string; city?: string;
    }): Promise<{ user: User, token: string }> {
        await delay();
        if (code === "1234") {
            return { token: "mock_token_abc123", user: mockUsers[0] };
        }
        throw new Error("Неверный СМС код");
    }

    async loginWithPassword(_email: string, _password: string): Promise<{ user: User; token: string }> {
        await delay();
        return { token: "mock_token_abc123", user: mockUsers[0] };
    }
}
