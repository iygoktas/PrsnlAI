import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/app/page';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Helper to create a mock response
const createMockResponse = (data: any, status: number) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(data),
});

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('rendering', () => {
    it('should render the SearchBar component', () => {
      render(<Home />);

      expect(screen.getByPlaceholderText('Ask anything about your sources…')).toBeInTheDocument();
      expect(screen.getByLabelText('Search query')).toBeInTheDocument();
    });

    it('should display empty state initially', () => {
      render(<Home />);

      expect(screen.getByText('Start searching your knowledge base')).toBeInTheDocument();
    });

    it('should render Sidebar component', () => {
      render(<Home />);

      // Sidebar should contain "memex" or a similar title
      // Since Sidebar renders sources list, check for the structure
      const sidebar = screen.getByRole('button', { hidden: true }); // The + button in sidebar
      expect(sidebar).toBeTruthy();
    });
  });

  describe('search functionality', () => {
    it('should submit search on Enter key', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {
            answer: 'This is the answer',
            sources: [],
          },
          200
        )
      );

      render(<Home />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…');
      await userEvent.type(input, 'test query{Enter}');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/search',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ query: 'test query' }),
          })
        );
      });
    });

    it('should not submit on other keys', async () => {
      render(<Home />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…');
      await userEvent.type(input, 'test query');
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not submit empty or whitespace-only queries', async () => {
      render(<Home />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…');
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should disable SearchBar input during loading', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve(
                createMockResponse(
                  {
                    answer: 'Answer',
                    sources: [],
                  },
                  200
                )
              );
            }, 100);
          })
      );

      render(<Home />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…') as HTMLInputElement;

      await userEvent.type(input, 'test{Enter}');

      await waitFor(() => {
        expect(input).toBeDisabled();
      });
    });
  });

  describe('search results', () => {
    it('should display results after successful search', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {
            answer: 'This is the generated answer',
            sources: [
              {
                sourceId: 'src-1',
                title: 'Test Source',
                url: 'https://example.com',
                type: 'URL' as const,
                excerpt: 'Test excerpt',
                score: 0.95,
                chunkIndex: 0,
                pageNumber: null,
                createdAt: new Date(),
              },
            ],
          },
          200
        )
      );

      render(<Home />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…');

      await userEvent.type(input, 'test query{Enter}');

      await waitFor(() => {
        expect(screen.getByText('This is the generated answer')).toBeInTheDocument();
        expect(screen.getByText('Test Source')).toBeInTheDocument();
      });
    });

    it('should display answer even when no relevant sources found', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {
            answer: 'I cannot find information about that.',
            sources: [],
          },
          200
        )
      );

      render(<Home />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…');

      await userEvent.type(input, 'obscure topic{Enter}');

      await waitFor(() => {
        expect(screen.getByText('I cannot find information about that.')).toBeInTheDocument();
      });
    });

    it('should update results on new search', async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse(
            {
              answer: 'First answer',
              sources: [],
            },
            200
          )
        )
        .mockResolvedValueOnce(
          createMockResponse(
            {
              answer: 'Second answer',
              sources: [],
            },
            200
          )
        );

      render(<Home />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…');

      // First search
      await userEvent.type(input, 'first query{Enter}');

      await waitFor(() => {
        expect(screen.getByText('First answer')).toBeInTheDocument();
      });

      // Clear and second search
      await userEvent.clear(input);
      await userEvent.type(input, 'second query{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Second answer')).toBeInTheDocument();
        expect(screen.queryByText('First answer')).not.toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should display error message on failed search', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {
            error: 'Search failed: connection error',
          },
          500
        )
      );

      render(<Home />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…');

      await userEvent.type(input, 'test{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/Error|Search failed/)).toBeInTheDocument();
      });
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<Home />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…');

      await userEvent.type(input, 'test{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/Error|failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('state management', () => {
    it('should maintain query in input after search', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {
            answer: 'Answer',
            sources: [],
          },
          200
        )
      );

      render(<Home />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…') as HTMLInputElement;

      await userEvent.type(input, 'test query{Enter}');

      await waitFor(() => {
        expect(input.value).toBe('test query');
      });
    });
  });
});
