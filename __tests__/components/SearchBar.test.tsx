import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchBar } from '@/components/SearchBar';

describe('SearchBar', () => {
  describe('rendering', () => {
    it('should render input and button', () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      expect(screen.getByPlaceholderText('Search your knowledge base...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit search/i })).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('should initialize with provided query value', () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="initial query" onSubmit={mockOnSubmit} />);

      const input = screen.getByDisplayValue('initial query');
      expect(input).toBeInTheDocument();
    });

    it('should have correct initial button state', () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      const button = screen.getByRole('button', { name: /submit search/i });
      expect(button).toBeDisabled();
    });
  });

  describe('input interactions', () => {
    it('should update input value on change', async () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Search your knowledge base...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'test query' } });

      expect(input.value).toBe('test query');
    });

    it('should enable button when input has value', async () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Search your knowledge base...');
      const button = screen.getByRole('button', { name: /submit search/i });

      expect(button).toBeDisabled();

      fireEvent.change(input, { target: { value: 'search term' } });

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should keep button disabled for whitespace-only input', async () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Search your knowledge base...');
      const button = screen.getByRole('button', { name: /submit search/i });

      fireEvent.change(input, { target: { value: '   ' } });

      expect(button).toBeDisabled();
    });
  });

  describe('submit handling', () => {
    it('should call onSubmit when button is clicked', async () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Search your knowledge base...');
      const button = screen.getByRole('button', { name: /submit search/i });

      fireEvent.change(input, { target: { value: 'search term' } });
      fireEvent.click(button);

      expect(mockOnSubmit).toHaveBeenCalledWith('search term');
    });

    it('should call onSubmit with trimmed query', async () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Search your knowledge base...');
      const button = screen.getByRole('button', { name: /submit search/i });

      fireEvent.change(input, { target: { value: '  search term  ' } });
      fireEvent.click(button);

      expect(mockOnSubmit).toHaveBeenCalledWith('search term');
    });

    it('should call onSubmit when Enter key is pressed', async () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Search your knowledge base...');

      fireEvent.change(input, { target: { value: 'search term' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(mockOnSubmit).toHaveBeenCalledWith('search term');
    });

    it('should not call onSubmit for other keys', async () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Search your knowledge base...');

      fireEvent.change(input, { target: { value: 'search term' } });
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should not submit empty or whitespace-only queries', async () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Search your knowledge base...');
      const button = screen.getByRole('button', { name: /submit search/i });

      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(button);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should display loading indicator when loading is true', () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="test" loading={true} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('should disable input when loading', () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="test" loading={true} onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Search your knowledge base...') as HTMLInputElement;
      expect(input).toBeDisabled();
    });

    it('should disable button when loading', () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="test" loading={true} onSubmit={mockOnSubmit} />);

      const button = screen.getByRole('button', { name: /submit search/i });
      expect(button).toBeDisabled();
    });

    it('should not submit on Enter when loading', async () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="test" loading={true} onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Search your knowledge base...');
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show "Searching..." text instead of "Search"', () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="test" loading={true} onSubmit={mockOnSubmit} />);

      expect(screen.queryByText('Search')).not.toBeInTheDocument();
      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('should display spinner when loading', () => {
      const mockOnSubmit = jest.fn();
      const { container } = render(
        <SearchBar query="test" loading={true} onSubmit={mockOnSubmit} />
      );

      const spinner = container.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('default loading value', () => {
    it('should default loading to false', () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper aria labels', () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText('Search query')).toBeInTheDocument();
      expect(screen.getByLabelText('Submit search')).toBeInTheDocument();
    });

    it('should have placeholder text for guidance', () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      expect(screen.getByPlaceholderText('Search your knowledge base...')).toBeInTheDocument();
    });
  });
});
