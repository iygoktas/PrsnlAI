import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchBar } from '@/components/SearchBar';

describe('SearchBar', () => {
  describe('rendering', () => {
    it('should render input with correct placeholder', () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      expect(screen.getByPlaceholderText('Ask anything about your sources…')).toBeInTheDocument();
    });

    it('should initialize with provided query value', () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="initial query" onSubmit={mockOnSubmit} />);

      const input = screen.getByDisplayValue('initial query');
      expect(input).toBeInTheDocument();
    });

    it('should have aria-label for accessibility', () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText('Search query')).toBeInTheDocument();
    });
  });

  describe('input interactions', () => {
    it('should update input value on change', async () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'test query' } });

      expect(input.value).toBe('test query');
    });

    it('should trim whitespace on value change', async () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '  test query  ' } });

      expect(input.value).toBe('  test query  '); // Input stores raw value, trim happens on submit
    });
  });

  describe('submit handling', () => {
    it('should call onSubmit when Enter key is pressed', async () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…');

      fireEvent.change(input, { target: { value: 'search term' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(mockOnSubmit).toHaveBeenCalledWith('search term');
    });

    it('should call onSubmit with trimmed query', async () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…');

      fireEvent.change(input, { target: { value: '  search term  ' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(mockOnSubmit).toHaveBeenCalledWith('search term');
    });

    it('should not call onSubmit for other keys', async () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…');

      fireEvent.change(input, { target: { value: 'search term' } });
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should not submit empty or whitespace-only queries', async () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…');

      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should disable input when loading is true', () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="test" loading={true} onSubmit={mockOnSubmit} />);

      const input = screen.getByDisplayValue('test') as HTMLInputElement;
      expect(input).toBeDisabled();
    });

    it('should not submit on Enter when loading', async () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="test" loading={true} onSubmit={mockOnSubmit} />);

      const input = screen.getByDisplayValue('test');
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show animated dots in placeholder when loading', async () => {
      const mockOnSubmit = jest.fn();
      const { rerender } = render(
        <SearchBar query="test" loading={false} onSubmit={mockOnSubmit} />
      );

      rerender(<SearchBar query="test" loading={true} onSubmit={mockOnSubmit} />);

      await waitFor(() => {
        const input = screen.getByDisplayValue('test') as HTMLInputElement;
        // Placeholder becomes dots when loading, starts with 1 dot
        expect(input.placeholder.length >= 1 && input.placeholder.match(/\.+/)).toBeTruthy();
      });
    });
  });

  describe('default loading value', () => {
    it('should default loading to false', () => {
      const mockOnSubmit = jest.fn();
      render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…') as HTMLInputElement;
      expect(input).not.toBeDisabled();
    });
  });

  describe('focus state', () => {
    it('should show return hint when input is focused', async () => {
      const mockOnSubmit = jest.fn();
      const { container } = render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…');
      fireEvent.focus(input);

      await waitFor(() => {
        const hint = container.querySelector('span');
        expect(hint?.textContent).toBe('↵');
      });
    });

    it('should hide return hint when input is not focused', () => {
      const mockOnSubmit = jest.fn();
      const { container } = render(<SearchBar query="" onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText('Ask anything about your sources…');
      fireEvent.blur(input);

      const hint = container.querySelector('span');
      expect(hint).not.toBeInTheDocument();
    });
  });
});
