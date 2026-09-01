# Contributing to NB

Thank you for your interest in contributing to NB! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Commit Message Guidelines](#commit-message-guidelines)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and considerate in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/nb-s.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js 20.x or higher
- pnpm (recommended) or npm
- A Supabase account and project

### Installation

1. Navigate to the `nb` directory:
   ```bash
   cd nb
   ```

2. Install dependencies:
   ```bash
   pnpm install
   # or
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. Run database migrations:
   - Go to your Supabase Dashboard
   - Navigate to SQL Editor
   - Run migrations from `supabase/migrations/` in order

5. Start the development server:
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

## Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Avoid `any` types - use proper types or `unknown`
- Enable strict mode (already configured)
- Use meaningful variable and function names

### Formatting

- We use Prettier for code formatting
- Run `npm run format` before committing
- Prettier will auto-format on commit via lint-staged

### Linting

- We use ESLint with Next.js configuration
- Run `npm run lint` to check for issues
- Fix auto-fixable issues with `npm run lint:fix`

### File Structure

- Components: `components/`
- Pages: `app/`
- Utilities: `lib/`
- Types: `types/`
- Hooks: `hooks/`
- Tests: `__tests__/` or `tests/`

### Naming Conventions

- Components: PascalCase (e.g., `UserProfile.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- Types/Interfaces: PascalCase (e.g., `UserProfile`)

## Testing Requirements

### Unit Tests

- Write unit tests for utilities, hooks, and business logic
- Place tests in `__tests__/` directory
- Use Jest and React Testing Library
- Run tests: `npm run test`
- Watch mode: `npm run test:watch`

### Integration Tests

- Write integration tests for API routes and complex flows
- Place in `__tests__/integration/`
- Run with: `npm run test`

### E2E Tests

- Write E2E tests for critical user flows
- Use Playwright
- Place in `tests/e2e/`
- Run: `npm run test:e2e`

### Coverage

- Aim for at least 60% code coverage
- Critical paths should have higher coverage
- Run coverage: `npm run test:coverage`
- Coverage reports are generated in `coverage/`

## Pull Request Process

1. **Update Documentation**: Update relevant documentation if your changes affect user-facing features or APIs

2. **Add Tests**: Add tests for new features or bug fixes

3. **Ensure Tests Pass**: All tests must pass before submitting
   ```bash
   npm run test
   npm run type-check
   npm run lint
   ```

4. **Update CHANGELOG**: If applicable, add an entry to CHANGELOG.md

5. **Create Pull Request**:
   - Use a clear, descriptive title
   - Fill out the PR template
   - Link related issues
   - Request review from maintainers

6. **Address Feedback**: Respond to review comments and make requested changes

### PR Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] No console.log statements (use logger instead)

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(messages): add real-time message notifications

fix(auth): resolve token refresh issue

docs(readme): update installation instructions

refactor(components): extract reusable message component
```

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Testing Library](https://testing-library.com/react)

## Questions?

If you have questions, please:
1. Check existing issues and discussions
2. Open a new issue with the `question` label
3. Reach out to maintainers

Thank you for contributing! 🎉

