import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ExportButton } from '@/components/common/ExportButton';
//checking test case
// Mock sonner toast
jest.mock('sonner', () => ({
    toast: {
        info: jest.fn(),
        success: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test'])),
        headers: {
            get: () => 'attachment; filename="test.csv"'
        }
    })
) as jest.Mock;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'http://localhost/test.csv');
global.URL.revokeObjectURL = jest.fn();

// Mock ResizeObserver for Radix UI (if needed, though standard buttons might okay)
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

describe('ExportButton', () => {
    it('renders correctly', () => {
        render(<ExportButton entity="tasks" projectId="123" />);
        expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('opens dropdown on click', async () => {
        const user = userEvent.setup();
        render(<ExportButton entity="tasks" projectId="123" />);

        const button = screen.getByText('Export');
        await user.click(button);

        expect(await screen.findByText('Export as CSV')).toBeInTheDocument();
        expect(screen.getByText('Export as JSON')).toBeInTheDocument();
    });
});
