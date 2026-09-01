/**
 * @jest-environment node
 */
import { POST } from '@/app/api/v1/projects/route';
import { NextRequest } from 'next/server';

// Mock Supabase Server Client
const mockSupabase = {
    auth: {
        getUser: jest.fn()
    },
    from: jest.fn(() => ({
        insert: jest.fn(() => ({
            select: jest.fn(() => ({
                single: jest.fn()
            }))
        })),
        select: jest.fn(() => ({
             eq: jest.fn(() => ({
                 maybeSingle: jest.fn() // For duplicate check
             }))
        }))
    }))
};

jest.mock('@/lib/supabase/server', () => ({
    createSupabaseServerClient: jest.fn(() => mockSupabase)
}));

describe('Integration: POST /api/v1/projects', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 401 if user is not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

        const req = new NextRequest('http://localhost:3000/api/v1/projects', {
            method: 'POST',
            body: JSON.stringify({})
        });

        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('should create a project successfully with valid data', async () => {
        const user = { id: 'user-123', email: 'test@example.com' };
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });

        // Mock Insert Success
        const newProject = { id: 'proj-123', title: 'New Project' };
        // @ts-ignore
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'projects') {
                return {
                    insert: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: newProject, error: null })
                        })
                    }),
                     select: jest.fn().mockReturnValue({
                        // Mock explicit select if any
                    })
                };
            }
             // Mock duplicate check if any? The route does basic insert.
             // If validation logic checks uniqueness, I need to mock that.
             // Usually schemas handle format.
             return {
                 select: jest.fn(() => ({
                     maybeSingle: jest.fn().mockResolvedValue({ data: null })
                 })),
                 insert: jest.fn().mockResolvedValue({ error: null })
             };
        });


        const payload = {
            title: 'My New Project',
            description: 'A description longer than 10 chars',
            project_type: 'web_app',
            visibility: 'public'
        };

        const req = new NextRequest('http://localhost:3000/api/v1/projects', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const res = await POST(req);
        const body = await res.json();
        if (res.status !== 201) {
             console.log('Test Failure Body:', body);
        }
        expect(res.status).toBe(201);
        expect(body.data).toEqual(newProject);
    });
    
     it('should return 400 for validation errors', async () => {
        const user = { id: 'user-123' };
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });

        const payload = {
            title: 'Co' // Too short
        };

        const req = new NextRequest('http://localhost:3000/api/v1/projects', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });
});
