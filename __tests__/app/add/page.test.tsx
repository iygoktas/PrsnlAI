import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddPage from '@/app/add/page';

// Mock the AddContentForm component
jest.mock('@/components/AddContentForm', () => ({
  AddContentForm: ({ onSuccess, onError }: any) => (
    <div data-testid="add-content-form">
      <h2>Mock Add Content Form</h2>
      <button onClick={() => onSuccess({ sourceId: 'src-1', title: 'Test', chunksCreated: 5 })}>
        Simulate Success
      </button>
      <button onClick={() => onError(new Error('Test error'))}>Simulate Error</button>
    </div>
  ),
}));

describe('Add Page', () => {
  describe('rendering', () => {
    it('should render the page header', () => {
      render(<AddPage />);

      expect(screen.getByText('Add Content')).toBeInTheDocument();
      expect(screen.getByText(/Add a URL, paste text, or upload a PDF/i)).toBeInTheDocument();
    });

    it('should render the AddContentForm component', () => {
      render(<AddPage />);

      expect(screen.getByTestId('add-content-form')).toBeInTheDocument();
    });

    it('should display the proper heading hierarchy', () => {
      const { container } = render(<AddPage />);

      const h1 = container.querySelector('h1');
      expect(h1).toBeInTheDocument();
      expect(h1?.textContent).toBe('Add Content');
    });

    it('should have responsive layout', () => {
      const { container } = render(<AddPage />);

      const mainElement = container.querySelector('main');
      expect(mainElement).toHaveClass('min-h-screen', 'w-full');

      const contentWrapper = container.querySelector('.mx-auto');
      expect(contentWrapper).toHaveClass('max-w-2xl', 'px-4');
    });
  });

  describe('success handling', () => {
    it('should display success message on successful content addition', async () => {
      jest.useFakeTimers();

      render(<AddPage />);

      const successButton = screen.getByText('Simulate Success');
      fireEvent.click(successButton);

      await waitFor(() => {
        expect(screen.getByText('Content added successfully!')).toBeInTheDocument();
        // Verify title and chunks count appear in the success message
        expect(screen.getByText(/Test/)).toBeInTheDocument();
        expect(screen.getByText(/chunks/)).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('should display title from success result in message', async () => {
      render(<AddPage />);

      const successButton = screen.getByText('Simulate Success');
      fireEvent.click(successButton);

      await waitFor(() => {
        // Just verify that the title "Test" appears somewhere in the success message
        expect(screen.getByText(/Test/)).toBeInTheDocument();
        expect(screen.getByText(/chunks/)).toBeInTheDocument();
      });
    });

    it('should include link to search page in success message', async () => {
      render(<AddPage />);

      const successButton = screen.getByText('Simulate Success');
      fireEvent.click(successButton);

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /Start searching/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/');
      });
    });

    it('should auto-dismiss success message after 5 seconds', async () => {
      jest.useFakeTimers();

      render(<AddPage />);

      const successButton = screen.getByText('Simulate Success');
      fireEvent.click(successButton);

      await waitFor(() => {
        expect(screen.getByText('Content added successfully!')).toBeInTheDocument();
      });

      // Advance time by 5 seconds
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.queryByText('Content added successfully!')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('should use proper styling for success message', () => {
      render(<AddPage />);

      const successButton = screen.getByText('Simulate Success');
      fireEvent.click(successButton);

      const successDiv = screen.getByText('Content added successfully!').closest('div');
      expect(successDiv).toHaveClass('border-green-200', 'bg-green-50');
    });
  });

  describe('error handling', () => {
    it('should call onError when form submission fails', async () => {
      // We can't directly test onError being called since it just logs,
      // but we can verify that clicking the error button doesn't crash
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<AddPage />);

      const errorButton = screen.getByText('Simulate Error');
      fireEvent.click(errorButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Content ingestion error:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it('should not display success message on error', async () => {
      render(<AddPage />);

      const errorButton = screen.getByText('Simulate Error');
      fireEvent.click(errorButton);

      expect(screen.queryByText('Content added successfully!')).not.toBeInTheDocument();
    });
  });

  describe('form integration', () => {
    it('should pass success callback to AddContentForm', () => {
      render(<AddPage />);

      // Verify that the mock form is rendered with callbacks
      expect(screen.getByTestId('add-content-form')).toBeInTheDocument();

      // The success button should work, proving callbacks are passed
      const successButton = screen.getByText('Simulate Success');
      fireEvent.click(successButton);

      expect(screen.getByText('Content added successfully!')).toBeInTheDocument();
    });

    it('should pass error callback to AddContentForm', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<AddPage />);

      const errorButton = screen.getByText('Simulate Error');
      fireEvent.click(errorButton);

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should render AddContentForm after header', () => {
      const { container } = render(<AddPage />);

      const h1 = container.querySelector('h1');
      const form = screen.getByTestId('add-content-form');

      // Get their positions in the DOM
      const h1Rect = h1?.compareDocumentPosition(form);

      // Check that h1 comes before form in the DOM
      // compareDocumentPosition returns DOCUMENT_POSITION_FOLLOWING (4) if h1 comes before form
      expect(h1Rect).toBe(4);
    });
  });

  describe('multiple submissions', () => {
    it('should handle multiple successful submissions', async () => {
      jest.useFakeTimers();

      render(<AddPage />);

      const successButton = screen.getByText('Simulate Success');

      // First submission
      fireEvent.click(successButton);

      await waitFor(() => {
        expect(screen.getByText('Content added successfully!')).toBeInTheDocument();
      });

      // Wait for auto-dismiss
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.queryByText('Content added successfully!')).not.toBeInTheDocument();
      });

      // Second submission
      fireEvent.click(successButton);

      await waitFor(() => {
        expect(screen.getByText('Content added successfully!')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('should handle error after successful submission', async () => {
      jest.useFakeTimers();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<AddPage />);

      // First - success
      const successButton = screen.getByText('Simulate Success');
      fireEvent.click(successButton);

      await waitFor(() => {
        expect(screen.getByText('Content added successfully!')).toBeInTheDocument();
      });

      // Then - error
      const errorButton = screen.getByText('Simulate Error');
      fireEvent.click(errorButton);

      // Success message should still be visible (not replaced)
      expect(screen.getByText('Content added successfully!')).toBeInTheDocument();
      expect(consoleErrorSpy).toHaveBeenCalled();

      jest.useRealTimers();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('page layout', () => {
    it('should center content with max-width constraint', () => {
      const { container } = render(<AddPage />);

      const mainDiv = container.querySelector('.mx-auto');
      expect(mainDiv).toHaveClass('max-w-2xl');
    });

    it('should have proper spacing between header and form', () => {
      const { container } = render(<AddPage />);

      const headerDiv = container.querySelector('.mb-8');
      expect(headerDiv).toBeInTheDocument();
      expect(headerDiv).toHaveClass('mb-8');
    });

    it('should have proper dark mode support in success message', async () => {
      render(<AddPage />);

      const successButton = screen.getByText('Simulate Success');
      fireEvent.click(successButton);

      await waitFor(() => {
        const successDiv = screen.getByText('Content added successfully!').closest('div');
        expect(successDiv).toHaveClass('dark:border-green-800', 'dark:bg-green-900/20');
      });
    });
  });
});
