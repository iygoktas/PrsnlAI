import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddContentForm } from '@/components/AddContentForm';

// Mock fetch with proper response handling
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Helper to create a mock response
const createMockResponse = (data: any, status: number) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(data),
});

describe('AddContentForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('tab navigation', () => {
    it('should render all three tabs', () => {
      render(<AddContentForm />);

      expect(screen.getByRole('button', { name: /🌐 URL/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /📝 Text/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /📄 PDF/i })).toBeInTheDocument();
    });

    it('should start with URL tab active', () => {
      render(<AddContentForm />);

      const urlInput = screen.getByPlaceholderText('https://example.com/article');
      expect(urlInput).toBeInTheDocument();
    });

    it('should switch to Text tab when clicked', async () => {
      render(<AddContentForm />);

      const textTab = screen.getByRole('button', { name: /📝 Text/i });
      fireEvent.click(textTab);

      const textInput = screen.getByPlaceholderText('Paste your text or markdown here...');
      expect(textInput).toBeInTheDocument();
    });

    it('should switch to PDF tab when clicked', async () => {
      render(<AddContentForm />);

      const pdfTab = screen.getByRole('button', { name: /📄 PDF/i });
      fireEvent.click(pdfTab);

      const fileInput = screen.getByLabelText('PDF File');
      expect(fileInput).toBeInTheDocument();
    });

    it('should disable tabs during upload', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve(
                createMockResponse(
                  {
                    sourceId: 'src-1',
                    title: 'Test',
                    chunksCreated: 5,
                    processingTimeMs: 100,
                  },
                  200
                )
              );
            }, 100);
          })
      );

      render(<AddContentForm />);

      const urlInput = screen.getByPlaceholderText('https://example.com/article');
      const submitButton = screen.getByRole('button', { name: /Add URL/i });
      const textTab = screen.getByRole('button', { name: /📝 Text/i });

      await userEvent.type(urlInput, 'https://example.com');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(textTab).toBeDisabled();
      });
    });
  });

  describe('URL form', () => {
    it('should render URL form inputs', () => {
      render(<AddContentForm />);

      expect(screen.getByPlaceholderText('https://example.com/article')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Custom title.../i)).toBeInTheDocument();
    });

    it('should disable submit button when URL is empty', () => {
      render(<AddContentForm />);

      const button = screen.getByRole('button', { name: /Add URL/i });
      expect(button).toBeDisabled();
    });

    it('should enable submit button when URL is provided', async () => {
      render(<AddContentForm />);

      const input = screen.getByPlaceholderText('https://example.com/article');
      const button = screen.getByRole('button', { name: /Add URL/i });

      await userEvent.type(input, 'https://example.com');

      expect(button).not.toBeDisabled();
    });

    it('should submit URL form successfully', async () => {
      const mockOnSuccess = jest.fn();
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {
            sourceId: 'src-1',
            title: 'Example Article',
            chunksCreated: 5,
            processingTimeMs: 100,
          },
          200
        )
      );

      render(<AddContentForm onSuccess={mockOnSuccess} />);

      const input = screen.getByPlaceholderText('https://example.com/article');
      const button = screen.getByRole('button', { name: /Add URL/i });

      await userEvent.type(input, 'https://example.com');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            sourceId: 'src-1',
            title: 'Example Article',
            chunksCreated: 5,
          })
        );
      });
    });

    it('should show error toast on failed URL submission', async () => {
      const mockOnError = jest.fn();
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Invalid URL' }, 400)
      );

      render(<AddContentForm onError={mockOnError} />);

      const input = screen.getByPlaceholderText('https://example.com/article');
      const button = screen.getByRole('button', { name: /Add URL/i });

      await userEvent.type(input, 'https://example.com');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Upload Failed')).toBeInTheDocument();
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    it('should clear form after successful submission', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {
            sourceId: 'src-1',
            title: 'Test',
            chunksCreated: 5,
            processingTimeMs: 100,
          },
          200
        )
      );

      render(<AddContentForm />);

      const input = screen.getByPlaceholderText('https://example.com/article') as HTMLInputElement;
      const button = screen.getByRole('button', { name: /Add URL/i });

      await userEvent.type(input, 'https://example.com');
      fireEvent.click(button);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });
  });

  describe('Text form', () => {
    it('should render Text form inputs', () => {
      render(<AddContentForm />);
      const textTab = screen.getByRole('button', { name: /📝 Text/i });
      fireEvent.click(textTab);

      expect(screen.getByPlaceholderText('Paste your text or markdown here...')).toBeInTheDocument();
    });

    it('should disable submit button when text is empty', () => {
      render(<AddContentForm />);
      const textTab = screen.getByRole('button', { name: /📝 Text/i });
      fireEvent.click(textTab);

      const button = screen.getByRole('button', { name: /Add Text/i });
      expect(button).toBeDisabled();
    });

    it('should enable submit button when text is provided', async () => {
      render(<AddContentForm />);
      const textTab = screen.getByRole('button', { name: /📝 Text/i });
      fireEvent.click(textTab);

      const input = screen.getByPlaceholderText('Paste your text or markdown here...');
      const button = screen.getByRole('button', { name: /Add Text/i });

      await userEvent.type(input, 'Some test content');

      expect(button).not.toBeDisabled();
    });
  });

  describe('PDF form', () => {
    it('should render PDF form inputs', () => {
      render(<AddContentForm />);
      const pdfTab = screen.getByRole('button', { name: /📄 PDF/i });
      fireEvent.click(pdfTab);

      expect(screen.getByLabelText('PDF File')).toBeInTheDocument();
    });

    it('should disable submit button when no file is selected', () => {
      render(<AddContentForm />);
      const pdfTab = screen.getByRole('button', { name: /📄 PDF/i });
      fireEvent.click(pdfTab);

      const button = screen.getByRole('button', { name: /Upload PDF/i });
      expect(button).toBeDisabled();
    });
  });

  describe('loading state', () => {
    it('should display loading indicator during upload', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve(
                createMockResponse(
                  {
                    sourceId: 'src-1',
                    title: 'Test',
                    chunksCreated: 5,
                    processingTimeMs: 100,
                  },
                  200
                )
              );
            }, 100);
          })
      );

      render(<AddContentForm />);

      const input = screen.getByPlaceholderText('https://example.com/article');
      const button = screen.getByRole('button', { name: /Add URL/i });

      await userEvent.type(input, 'https://example.com');
      fireEvent.click(button);

      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });

    it('should disable form inputs during upload', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve(
                createMockResponse(
                  {
                    sourceId: 'src-1',
                    title: 'Test',
                    chunksCreated: 5,
                    processingTimeMs: 100,
                  },
                  200
                )
              );
            }, 50);
          })
      );

      render(<AddContentForm />);

      const input = screen.getByPlaceholderText('https://example.com/article') as HTMLInputElement;
      const button = screen.getByRole('button', { name: /Add URL/i });

      await userEvent.type(input, 'https://example.com');
      fireEvent.click(button);

      await waitFor(() => {
        expect(input).toBeDisabled();
      });
    });
  });

  describe('toast notifications', () => {
    it('should show success toast on successful submission', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {
            sourceId: 'src-1',
            title: 'Test Article',
            chunksCreated: 5,
            processingTimeMs: 100,
          },
          200
        )
      );

      render(<AddContentForm />);

      const input = screen.getByPlaceholderText('https://example.com/article');
      const button = screen.getByRole('button', { name: /Add URL/i });

      await userEvent.type(input, 'https://example.com');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Content Added')).toBeInTheDocument();
        expect(screen.getByText(/Test Article.*5 chunks/)).toBeInTheDocument();
      });
    });

    it('should show error toast on failed submission', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Network error' }, 500)
      );

      render(<AddContentForm />);

      const input = screen.getByPlaceholderText('https://example.com/article');
      const button = screen.getByRole('button', { name: /Add URL/i });

      await userEvent.type(input, 'https://example.com');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Upload Failed')).toBeInTheDocument();
      });
    });
  });

  describe('callbacks', () => {
    it('should call onSuccess when submission succeeds', async () => {
      const mockOnSuccess = jest.fn();
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {
            sourceId: 'src-123',
            title: 'My Content',
            chunksCreated: 7,
            processingTimeMs: 150,
          },
          200
        )
      );

      render(<AddContentForm onSuccess={mockOnSuccess} />);

      const input = screen.getByPlaceholderText('https://example.com/article');
      const button = screen.getByRole('button', { name: /Add URL/i });

      await userEvent.type(input, 'https://example.com');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });
});
