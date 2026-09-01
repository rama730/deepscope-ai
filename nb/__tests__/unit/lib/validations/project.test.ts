import { createProjectSchema, updateProjectSchema } from '@/lib/validations/project';

describe('Project Validation', () => {
    describe('createProjectSchema', () => {
        it('should validate a valid project', () => {
            const valid = {
                title: 'Test Project',
                description: 'A test project description',
                short_description: 'Short desc',
                project_type: 'web_app',
                visibility: 'public',
                status: 'open',
                tags: ['test'],
                technologies_used: ['jest'],
                metadata: {}
            };
            const result = createProjectSchema.safeParse(valid);
            if (!result.success) {
                console.log(JSON.stringify(result.error, null, 2));
            }
            expect(result.success).toBe(true);
        });

        it('should fail on missing title', () => {
            const invalid = {
                description: 'Missing title'
            };
            const result = createProjectSchema.safeParse(invalid);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].path).toContain('title');
            }
        });

        it('should enforce min length on title', () => {
             const invalid = {
                title: 'A', // Too short
                description: 'Desc'
            };
            const result = createProjectSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });
    });

    describe('updateProjectSchema', () => {
        it('should allow partial updates', () => {
            const update = {
                title: 'Updated Title'
            };
            const result = updateProjectSchema.safeParse(update);
            expect(result.success).toBe(true);
        });
    });
});
