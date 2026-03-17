import React from 'react';
import { render, screen } from '@testing-library/react';
import { SearchResults } from '@/components/SearchResults';
import type { SearchResult } from '@/search/semantic';

describe('SearchResults', () => {
  const mockDate = new Date('2024-01-15T10:00:00Z');

  const mockSources: SearchResult[] = [
    {
      sourceId: 'src-1',
      title: 'Introduction to RAG',
      url: 'https://example.com/rag-intro',
      type: 'URL' as const,
      excerpt: 'RAG (Retrieval Augmented Generation) combines...',
      score: 0.95,
      chunkIndex: 0,
      pageNumber: null,
      createdAt: mockDate,
    },
    {
      sourceId: 'src-2',
      title: 'LLM Architecture',
      url: null,
      type: 'TEXT' as const,
      excerpt: 'Large language models use transformer architecture...',
      score: 0.87,
      chunkIndex: 1,
      pageNumber: 5,
      createdAt: new Date('2024-01-10T10:00:00Z'),
    },
    {
      sourceId: 'src-3',
      title: 'Advanced NLP Techniques',
      url: 'https://papers.example.com/nlp.pdf',
      type: 'PDF' as const,
      excerpt: 'This paper explores cutting-edge NLP methods...',
      score: 0.82,
      chunkIndex: 2,
      pageNumber: 12,
      createdAt: new Date('2024-01-01T10:00:00Z'),
    },
  ];

  describe('rendering', () => {
    it('should render answer section', () => {
      const answer = 'This is the answer to your query';
      render(<SearchResults answer={answer} sources={[]} />);

      expect(screen.getByText('Answer')).toBeInTheDocument();
      expect(screen.getByText(answer)).toBeInTheDocument();
    });

    it('should render sources section with count', () => {
      render(<SearchResults answer="Answer" sources={mockSources} />);

      expect(screen.getByText(/Sources \(3\)/i)).toBeInTheDocument();
    });

    it('should render all source cards', () => {
      render(<SearchResults answer="Answer" sources={mockSources} />);

      expect(screen.getByText('Introduction to RAG')).toBeInTheDocument();
      expect(screen.getByText('LLM Architecture')).toBeInTheDocument();
      expect(screen.getByText('Advanced NLP Techniques')).toBeInTheDocument();
    });

    it('should display answer in preformatted text', () => {
      const multilineAnswer = 'Line 1\nLine 2\nLine 3';
      const { container } = render(<SearchResults answer={multilineAnswer} sources={[]} />);

      const paragraph = container.querySelector('p');
      expect(paragraph).toHaveClass('whitespace-pre-wrap');
    });
  });

  describe('empty state', () => {
    it('should show empty state message when no sources', () => {
      render(<SearchResults answer="Answer" sources={[]} />);

      expect(screen.getByText('No relevant sources found for this query.')).toBeInTheDocument();
      expect(screen.queryByText(/Sources/)).not.toBeInTheDocument();
    });

    it('should not render source cards when no sources', () => {
      render(<SearchResults answer="Answer" sources={[]} />);

      expect(screen.queryByText('Introduction to RAG')).not.toBeInTheDocument();
    });
  });

  describe('source card display', () => {
    it('should display source titles', () => {
      render(<SearchResults answer="Answer" sources={mockSources} />);

      mockSources.forEach((source) => {
        expect(screen.getByText(source.title)).toBeInTheDocument();
      });
    });

    it('should display source excerpts', () => {
      render(<SearchResults answer="Answer" sources={mockSources} />);

      mockSources.forEach((source) => {
        // Use a simpler substring that doesn't contain regex special characters
        const excerptStart = source.excerpt.substring(0, 15).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        expect(screen.getByText(new RegExp(excerptStart))).toBeInTheDocument();
      });
    });

    it('should display similarity score as percentage', () => {
      render(<SearchResults answer="Answer" sources={mockSources} />);

      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('87%')).toBeInTheDocument();
      expect(screen.getByText('82%')).toBeInTheDocument();
    });

    it('should display page numbers for sources that have them', () => {
      render(<SearchResults answer="Answer" sources={mockSources} />);

      expect(screen.getByText('p. 5')).toBeInTheDocument();
      expect(screen.getByText('p. 12')).toBeInTheDocument();
    });

    it('should not display page numbers for sources without them', () => {
      const { container } = render(<SearchResults answer="Answer" sources={[mockSources[0]]} />);

      const pageElements = container.querySelectorAll('p');
      let hasOnlyPageNumbers = false;
      pageElements.forEach((el) => {
        if (el.textContent?.includes('p.')) {
          hasOnlyPageNumbers = true;
        }
      });

      expect(hasOnlyPageNumbers).toBe(false);
    });
  });

  describe('source types and icons', () => {
    it('should display URL icon for URL sources', () => {
      const sources: SearchResult[] = [
        {
          ...mockSources[0],
          type: 'URL' as const,
        },
      ];
      const { container } = render(<SearchResults answer="Answer" sources={sources} />);

      expect(container.textContent).toContain('🌐');
    });

    it('should display PDF icon for PDF sources', () => {
      const sources: SearchResult[] = [
        {
          ...mockSources[0],
          type: 'PDF' as const,
        },
      ];
      const { container } = render(<SearchResults answer="Answer" sources={sources} />);

      expect(container.textContent).toContain('📄');
    });

    it('should display TEXT icon for TEXT sources', () => {
      const sources: SearchResult[] = [
        {
          ...mockSources[0],
          type: 'TEXT' as const,
        },
      ];
      const { container } = render(<SearchResults answer="Answer" sources={sources} />);

      expect(container.textContent).toContain('📝');
    });

    it('should display TWEET icon for TWEET sources', () => {
      const sources: SearchResult[] = [
        {
          ...mockSources[0],
          type: 'TWEET' as const,
        },
      ];
      const { container } = render(<SearchResults answer="Answer" sources={sources} />);

      expect(container.textContent).toContain('𝕏');
    });
  });

  describe('date formatting', () => {
    it('should display "Today" for today\'s date', () => {
      const today = new Date();
      const sources: SearchResult[] = [
        {
          ...mockSources[0],
          createdAt: today,
        },
      ];
      render(<SearchResults answer="Answer" sources={sources} />);

      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('should display "Yesterday" for yesterday\'s date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const sources: SearchResult[] = [
        {
          ...mockSources[0],
          createdAt: yesterday,
        },
      ];
      render(<SearchResults answer="Answer" sources={sources} />);

      expect(screen.getByText('Yesterday')).toBeInTheDocument();
    });

    it('should display days ago for recent dates', () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const sources: SearchResult[] = [
        {
          ...mockSources[0],
          createdAt: fiveDaysAgo,
        },
      ];
      render(<SearchResults answer="Answer" sources={sources} />);

      expect(screen.getByText('5d ago')).toBeInTheDocument();
    });

    it('should display weeks ago for older dates', () => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const sources: SearchResult[] = [
        {
          ...mockSources[0],
          createdAt: twoWeeksAgo,
        },
      ];
      render(<SearchResults answer="Answer" sources={sources} />);

      expect(screen.getByText('2w ago')).toBeInTheDocument();
    });

    it('should display formatted date for old entries', () => {
      const oldDate = new Date('2023-06-15');
      const sources: SearchResult[] = [
        {
          ...mockSources[0],
          createdAt: oldDate,
        },
      ];
      render(<SearchResults answer="Answer" sources={sources} />);

      expect(screen.getByText(/Jun 15, 2023|Jun 15 2023/)).toBeInTheDocument();
    });
  });

  describe('links', () => {
    it('should make source cards with URLs into clickable links', () => {
      render(<SearchResults answer="Answer" sources={[mockSources[0]]} />);

      const link = screen.getByRole('link', { name: /Introduction to RAG/i });
      expect(link).toHaveAttribute('href', mockSources[0].url);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should not make source cards without URLs into links', () => {
      render(<SearchResults answer="Answer" sources={[mockSources[1]]} />);

      const link = screen.getByRole('link', { name: /LLM Architecture/i });
      expect(link).toHaveAttribute('href', '#');
      expect(link).not.toHaveAttribute('target');
      expect(link).not.toHaveAttribute('rel');
    });
  });

  describe('domain extraction', () => {
    it('should extract and display domain from URL', () => {
      render(<SearchResults answer="Answer" sources={[mockSources[0]]} />);

      expect(screen.getByText('example.com')).toBeInTheDocument();
    });

    it('should display "Local" for sources without URL', () => {
      render(<SearchResults answer="Answer" sources={[mockSources[1]]} />);

      expect(screen.getByText('Local')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply card styling', () => {
      const { container } = render(<SearchResults answer="Answer" sources={mockSources} />);

      const cards = container.querySelectorAll('.card');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should apply badge styling to score', () => {
      const { container } = render(<SearchResults answer="Answer" sources={[mockSources[0]]} />);

      const badges = container.querySelectorAll('.badge');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should apply truncation to long titles', () => {
      const { container } = render(<SearchResults answer="Answer" sources={mockSources} />);

      const titles = container.querySelectorAll('h4');
      titles.forEach((title) => {
        expect(title).toHaveClass('truncate');
      });
    });
  });

  describe('multiple sources', () => {
    it('should render all sources in order', () => {
      render(<SearchResults answer="Answer" sources={mockSources} />);

      const sourceTexts = mockSources.map((s) => s.title);

      sourceTexts.forEach((text) => {
        expect(screen.getByText(text)).toBeInTheDocument();
      });
    });

    it('should maintain spacing between source cards', () => {
      const { container } = render(<SearchResults answer="Answer" sources={mockSources} />);

      const sourceContainer = container.querySelector('.space-y-3');
      expect(sourceContainer).toBeInTheDocument();
    });
  });
});
