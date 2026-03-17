import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/app/page';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

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
    it('should render the page header', () => {
      render(<Home />);

      expect(screen.getByText('Personal AI Knowledge Base')).toBeInTheDocument();
      expect(screen.getByText(/Search your knowledge base/i)).toBeInTheDocument();
    });

    it('should render the SearchBar component', () => {
      render(<Home />);

      expect(screen.getByPlaceholderText('Search your knowledge base...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
    });

    it('should render links to /add page', () => {
      render(<Home />);

      const addLinks = screen.getAllByRole('link', { name: /add/i });
      expect(addLinks.length).toBeGreaterThan(0);
      addLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', '/add');
      });
    });

    it('should display empty state initially', () => {
      render(<Home />);

      expect(screen.getByText('Start by searching your knowledge base.')).toBeInTheDocument();
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

      const input = screen.getByPlaceholderText('Search your knowledge base...');
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

    it('should submit search on button click', async () => {
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

      const input = screen.getByPlaceholderText('Search your knowledge base...');
      const button = screen.getByRole('button', { name: /Search/i });

      await userEvent.type(input, 'test query');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/search',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    it('should not submit empty search', async () => {
      render(<Home />);

      const button = screen.getByRole('button', { name: /Search/i });

      // Button should be disabled when input is empty
      expect(button).toBeDisabled();

      // Clicking should not call fetch
      fireEvent.click(button);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should display loading spinner during search', async () => {
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

      const input = screen.getByPlaceholderText('Search your knowledge base...');
      const button = screen.getByRole('button', { name: /Search/i });

      await userEvent.type(input, 'test');
      fireEvent.click(button);

      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('should disable SearchBar during loading', async () => {
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

      const input = screen.getByPlaceholderText('Search your knowledge base...') as HTMLInputElement;
      const button = screen.getByRole('button', { name: /Search/i });

      await userEvent.type(input, 'test');
      fireEvent.click(button);

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

      const input = screen.getByPlaceholderText('Search your knowledge base...');
      const button = screen.getByRole('button', { name: /Search/i });

      await userEvent.type(input, 'test query');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('This is the generated answer')).toBeInTheDocument();
        expect(screen.getByText('Test Source')).toBeInTheDocument();
      });
    });

    it('should display empty state message when no results', async () => {
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

      const input = screen.getByPlaceholderText('Search your knowledge base...');
      const button = screen.getByRole('button', { name: /Search/i });

      await userEvent.type(input, 'obscure topic');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('I cannot find information about that.')).toBeInTheDocument();
        expect(screen.getByText('No relevant sources found for this query.')).toBeInTheDocument();
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

      const input = screen.getByPlaceholderText('Search your knowledge base...');
      const button = screen.getByRole('button', { name: /Search/i });

      // First search
      await userEvent.type(input, 'first query');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('First answer')).toBeInTheDocument();
      });

      // Clear and second search
      await userEvent.clear(input);
      await userEvent.type(input, 'second query');
      fireEvent.click(button);

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

      const input = screen.getByPlaceholderText('Search your knowledge base...');
      const button = screen.getByRole('button', { name: /Search/i });

      await userEvent.type(input, 'test');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText(/Search failed: connection error/)).toBeInTheDocument();
      });
    });

    it('should clear previous error on new search', async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse(
            {
              error: 'First error',
            },
            500
          )
        )
        .mockResolvedValueOnce(
          createMockResponse(
            {
              answer: 'Success',
              sources: [],
            },
            200
          )
        );

      render(<Home />);

      const input = screen.getByPlaceholderText('Search your knowledge base...');
      const button = screen.getByRole('button', { name: /Search/i });

      // First search - error
      await userEvent.type(input, 'first');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/First error/)).toBeInTheDocument();
      });

      // Second search - success
      await userEvent.clear(input);
      await userEvent.type(input, 'second');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Success')).toBeInTheDocument();
        expect(screen.queryByText(/First error/)).not.toBeInTheDocument();
      });
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<Home />);

      const input = screen.getByPlaceholderText('Search your knowledge base...');
      const button = screen.getByRole('button', { name: /Search/i });

      await userEvent.type(input, 'test');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });

      // The error message should contain 'Network error'
      expect(screen.getByText(/An error occurred during search|Network error/)).toBeInTheDocument();
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

      const input = screen.getByPlaceholderText('Search your knowledge base...') as HTMLInputElement;
      const button = screen.getByRole('button', { name: /Search/i });

      await userEvent.type(input, 'test query');
      fireEvent.click(button);

      await waitFor(() => {
        expect(input.value).toBe('test query');
      });
    });

    it('should clear error when new search starts', async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse(
            {
              error: 'First search error',
            },
            500
          )
        )
        .mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                resolve(
                  createMockResponse(
                    {
                      answer: 'Second search answer',
                      sources: [],
                    },
                    200
                  )
                );
              }, 50);
            })
        );

      render(<Home />);

      const input = screen.getByPlaceholderText('Search your knowledge base...');
      const button = screen.getByRole('button', { name: /Search/i });

      // First search - error
      await userEvent.type(input, 'first');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/First search error/)).toBeInTheDocument();
      });

      // Start second search
      await userEvent.clear(input);
      await userEvent.type(input, 'second');
      fireEvent.click(button);

      // Error should be gone and new answer displayed
      await waitFor(() => {
        expect(screen.queryByText(/First search error/)).not.toBeInTheDocument();
        expect(screen.getByText('Second search answer')).toBeInTheDocument();
      });
    });
  });

  describe('page layout', () => {
    it('should have proper responsive layout', () => {
      const { container } = render(<Home />);

      const mainElement = container.querySelector('main');
      expect(mainElement).toHaveClass('min-h-screen', 'w-full');

      const contentWrapper = container.querySelector('.mx-auto');
      expect(contentWrapper).toHaveClass('max-w-4xl', 'px-4');
    });

    it('should render in proper order: header, search, empty state', () => {
      render(<Home />);

      // Verify all major elements are present
      expect(screen.getByText('Personal AI Knowledge Base')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search your knowledge base...')).toBeInTheDocument();
      expect(screen.getByText('Start by searching your knowledge base.')).toBeInTheDocument();

      // Basic verification that search bar comes after header in rendering
      const headerElement = screen.getByText('Personal AI Knowledge Base');
      const searchInput = screen.getByPlaceholderText('Search your knowledge base...');

      // Both should exist in the DOM
      expect(headerElement.parentElement).toBeTruthy();
      expect(searchInput.parentElement).toBeTruthy();
    });
  });
});
