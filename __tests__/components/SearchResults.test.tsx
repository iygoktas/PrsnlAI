import React from 'react';
import { render, screen } from '@testing-library/react';
import { SearchResults } from '@/components/SearchResults';
import type { SearchResult } from '@/search/semantic';

describe('SearchResults (AnswerBlock)', () => {
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
    it('should render answer text', () => {
      const answer = 'This is the answer to your query';
      render(<SearchResults answer={answer} sources={[]} />);

      expect(screen.getByText(answer)).toBeInTheDocument();
    });

    it('should render SOURCES label when sources exist', () => {
      render(<SearchResults answer="Answer" sources={mockSources} />);

      expect(screen.getByText('SOURCES')).toBeInTheDocument();
    });

    it('should render all source titles', () => {
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
    it('should not render SOURCES section when no sources', () => {
      render(<SearchResults answer="Answer" sources={[]} />);

      expect(screen.queryByText('SOURCES')).not.toBeInTheDocument();
    });

    it('should not render source cards when no sources', () => {
      render(<SearchResults answer="Answer" sources={[]} />);

      expect(screen.queryByText('Introduction to RAG')).not.toBeInTheDocument();
    });
  });

  describe('source card display', () => {
    it('should display citation numbers in source cards', () => {
      const { container } = render(<SearchResults answer="Answer" sources={mockSources} />);

      // Citation numbers should be displayed in the source cards as [1], [2], [3]
      const citationNumbers = container.querySelectorAll('a span');
      expect(citationNumbers.length).toBeGreaterThan(0);

      // Check that at least some spans contain citation numbers
      let hasCitationNumbers = false;
      citationNumbers.forEach((span) => {
        if (span.textContent?.match(/\[\d+\]/)) {
          hasCitationNumbers = true;
        }
      });
      expect(hasCitationNumbers).toBe(true);
    });

    it('should display similarity score as percentage', () => {
      render(<SearchResults answer="Answer" sources={mockSources} />);

      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('87%')).toBeInTheDocument();
      expect(screen.getByText('82%')).toBeInTheDocument();
    });

    it('should truncate long source titles', () => {
      const longTitleSource: SearchResult[] = [
        {
          ...mockSources[0],
          title: 'This is a very long title that should be truncated to 40 characters',
        },
      ];
      render(<SearchResults answer="Answer" sources={longTitleSource} />);

      // Title should be truncated to 40 chars + ellipsis
      expect(screen.getByText(/This is a very long title that should be…/)).toBeInTheDocument();
    });

    it('should render source cards as clickable links for URL sources', () => {
      render(<SearchResults answer="Answer" sources={[mockSources[0]]} />);

      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute('href', 'https://example.com/rag-intro');
      expect(links[0]).toHaveAttribute('target', '_blank');
    });

    it('should not set href to blank link for non-URL sources', () => {
      render(<SearchResults answer="Answer" sources={[mockSources[1]]} />);

      const links = screen.getAllByRole('link');
      expect(links[0]).toHaveAttribute('href', '#');
    });
  });

  describe('citation markers in answer', () => {
    it('should split answer by citation markers and create superscripts', () => {
      const answerWithCitations = 'This is part 1 [1] and part 2 [2] and part 3 [3]';
      const { container } = render(
        <SearchResults answer={answerWithCitations} sources={mockSources} />
      );

      const superscripts = container.querySelectorAll('sup');
      // Should have citation numbers for each source
      expect(superscripts.length).toBeGreaterThan(0);
    });
  });

  describe('styling', () => {
    it('should apply amber left border to answer zone', () => {
      const { container } = render(<SearchResults answer="Answer" sources={[]} />);

      const answerZone = container.querySelector('.border-l-2');
      expect(answerZone).toBeInTheDocument();
      expect(answerZone).toHaveStyle({ borderColor: 'var(--color-accent)' });
    });

    it('should use serif font for answer text', () => {
      const { container } = render(<SearchResults answer="Answer" sources={[]} />);

      const answerParagraph = container.querySelector('p');
      expect(answerParagraph).toHaveStyle({ fontFamily: 'var(--font-serif)' });
    });

    it('should use mono font for source cards', () => {
      const { container } = render(<SearchResults answer="Answer" sources={mockSources} />);

      const sourceCards = container.querySelectorAll('a');
      expect(sourceCards.length).toBeGreaterThan(0);
      // Source cards should have mono font
      sourceCards.forEach((card) => {
        const inner = card.querySelector('div');
        expect(inner).toHaveStyle({ fontFamily: 'var(--font-mono)' });
      });
    });

    it('should apply fade-in animation', () => {
      const { container } = render(<SearchResults answer="Answer" sources={[]} />);

      const mainDiv = container.querySelector('.w-full.mt-8');
      expect(mainDiv).toHaveStyle({ animation: 'fadeIn 0.2s ease forwards' });
    });
  });

  describe('hover effects', () => {
    it('should have transition effect on source cards', () => {
      const { container } = render(<SearchResults answer="Answer" sources={mockSources} />);

      const sourceCards = container.querySelectorAll('a');
      expect(sourceCards.length).toBeGreaterThan(0);
      sourceCards.forEach((card) => {
        expect(card).toHaveClass('transition-all', 'duration-150');
      });
    });
  });
});
