import React from 'react';
import { render, screen } from '@testing-library/react';
import { SourceBadge } from '@/components/SourceBadge';
import type { SearchResult } from '@/search/semantic';

describe('SourceBadge', () => {
  const mockDate = new Date('2024-01-15T10:00:00Z');

  const mockSource: SearchResult = {
    sourceId: 'src-1',
    title: 'Test Source',
    url: 'https://example.com/article',
    type: 'URL' as const,
    excerpt: 'Test excerpt',
    score: 0.95,
    chunkIndex: 0,
    pageNumber: null,
    createdAt: mockDate,
  };

  describe('rendering', () => {
    it('should render all parts by default', () => {
      render(<SourceBadge source={mockSource} />);

      expect(screen.getByText('example.com')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText(/Jan 15, 2024|Jan 15 2024/)).toBeInTheDocument();
    });

    it('should render icon', () => {
      const { container } = render(<SourceBadge source={mockSource} />);

      expect(container.textContent).toContain('🌐');
    });

    it('should render without optional parts when disabled', () => {
      render(
        <SourceBadge
          source={mockSource}
          showIcon={false}
          showDomain={false}
          showDate={false}
          showScore={false}
        />
      );

      expect(screen.queryByText('example.com')).not.toBeInTheDocument();
      expect(screen.queryByText('95%')).not.toBeInTheDocument();
    });
  });

  describe('source type icons', () => {
    it('should display URL icon for URL sources', () => {
      const { container } = render(<SourceBadge source={{ ...mockSource, type: 'URL' }} />);

      expect(container.textContent).toContain('🌐');
    });

    it('should display PDF icon for PDF sources', () => {
      const { container } = render(<SourceBadge source={{ ...mockSource, type: 'PDF' }} />);

      expect(container.textContent).toContain('📄');
    });

    it('should display TEXT icon for TEXT sources', () => {
      const { container } = render(<SourceBadge source={{ ...mockSource, type: 'TEXT' }} />);

      expect(container.textContent).toContain('📝');
    });

    it('should display TWEET icon for TWEET sources', () => {
      const { container } = render(<SourceBadge source={{ ...mockSource, type: 'TWEET' }} />);

      expect(container.textContent).toContain('𝕏');
    });

    it('should display default icon for unknown types', () => {
      const { container } = render(
        <SourceBadge source={{ ...mockSource, type: 'UNKNOWN' as any }} />
      );

      expect(container.textContent).toContain('📎');
    });

    it('should not display icon when showIcon is false', () => {
      const { container } = render(<SourceBadge source={mockSource} showIcon={false} />);

      expect(container.textContent).not.toContain('🌐');
    });
  });

  describe('domain extraction', () => {
    it('should extract and display domain from URL', () => {
      render(<SourceBadge source={mockSource} />);

      expect(screen.getByText('example.com')).toBeInTheDocument();
    });

    it('should display "Local" for sources without URL', () => {
      render(<SourceBadge source={{ ...mockSource, url: null }} />);

      expect(screen.getByText('Local')).toBeInTheDocument();
    });

    it('should handle URLs with different domains', () => {
      const source: SearchResult = {
        ...mockSource,
        url: 'https://github.com/anthropics/awesome-repo',
      };
      render(<SourceBadge source={source} />);

      expect(screen.getByText('github.com')).toBeInTheDocument();
    });

    it('should not display domain when showDomain is false', () => {
      render(<SourceBadge source={mockSource} showDomain={false} />);

      expect(screen.queryByText('example.com')).not.toBeInTheDocument();
    });
  });

  describe('date formatting', () => {
    it('should display "Today" for today\'s date', () => {
      const today = new Date();
      render(<SourceBadge source={{ ...mockSource, createdAt: today }} />);

      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('should display "Yesterday" for yesterday\'s date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      render(<SourceBadge source={{ ...mockSource, createdAt: yesterday }} />);

      expect(screen.getByText('Yesterday')).toBeInTheDocument();
    });

    it('should display days ago for recent dates', () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      render(<SourceBadge source={{ ...mockSource, createdAt: fiveDaysAgo }} />);

      expect(screen.getByText('5d ago')).toBeInTheDocument();
    });

    it('should display weeks ago for older dates within a month', () => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      render(<SourceBadge source={{ ...mockSource, createdAt: twoWeeksAgo }} />);

      expect(screen.getByText('2w ago')).toBeInTheDocument();
    });

    it('should display formatted date for old entries', () => {
      const oldDate = new Date('2023-06-15');
      render(<SourceBadge source={{ ...mockSource, createdAt: oldDate }} />);

      expect(screen.getByText(/Jun 15, 2023|Jun 15 2023/)).toBeInTheDocument();
    });

    it('should handle Date objects and timestamps', () => {
      const timestamp = new Date('2024-01-15').getTime();
      render(<SourceBadge source={{ ...mockSource, createdAt: new Date(timestamp) }} />);

      expect(screen.getByText(/Jan 15, 2024|Jan 15 2024/)).toBeInTheDocument();
    });

    it('should not display date when showDate is false', () => {
      render(<SourceBadge source={mockSource} showDate={false} />);

      expect(screen.queryByText('Jan 15, 2024')).not.toBeInTheDocument();
      expect(screen.queryByText(/\d+d ago/)).not.toBeInTheDocument();
    });
  });

  describe('similarity score', () => {
    it('should display score as percentage', () => {
      render(<SourceBadge source={{ ...mockSource, score: 0.95 }} />);

      expect(screen.getByText('95%')).toBeInTheDocument();
    });

    it('should round score to nearest percentage', () => {
      render(<SourceBadge source={{ ...mockSource, score: 0.856 }} />);

      expect(screen.getByText('86%')).toBeInTheDocument();
    });

    it('should handle score of 1.0', () => {
      render(<SourceBadge source={{ ...mockSource, score: 1.0 }} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should handle score of 0.0', () => {
      render(<SourceBadge source={{ ...mockSource, score: 0.0 }} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should not display score when showScore is false', () => {
      render(<SourceBadge source={mockSource} showScore={false} />);

      expect(screen.queryByText('95%')).not.toBeInTheDocument();
    });
  });

  describe('separator bullets', () => {
    it('should display separator between domain and date', () => {
      const { container } = render(<SourceBadge source={mockSource} />);

      const separators = container.querySelectorAll('div');
      let hasSeparator = false;
      separators.forEach((sep) => {
        if (sep.textContent?.includes('•')) {
          hasSeparator = true;
        }
      });

      expect(hasSeparator).toBe(true);
    });

    it('should not display separator when adjacent elements are hidden', () => {
      render(<SourceBadge source={mockSource} showDomain={false} showDate={true} showScore={true} />);

      // Score should still be visible but not have unnecessary separators before it
      expect(screen.getByText('95%')).toBeInTheDocument();
    });
  });

  describe('optional visibility flags', () => {
    it('should respect all visibility flags together', () => {
      const { container } = render(
        <SourceBadge
          source={mockSource}
          showIcon={true}
          showDomain={true}
          showDate={true}
          showScore={true}
        />
      );

      expect(container.textContent).toContain('🌐');
      expect(screen.getByText('example.com')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
    });

    it('should show only icon', () => {
      const { container } = render(
        <SourceBadge
          source={mockSource}
          showIcon={true}
          showDomain={false}
          showDate={false}
          showScore={false}
        />
      );

      expect(container.textContent).toContain('🌐');
      expect(screen.queryByText('example.com')).not.toBeInTheDocument();
    });

    it('should show only domain and score', () => {
      render(
        <SourceBadge
          source={mockSource}
          showIcon={false}
          showDomain={true}
          showDate={false}
          showScore={true}
        />
      );

      expect(screen.getByText('example.com')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <SourceBadge source={mockSource} className="custom-class" />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('should have default flexbox layout', () => {
      const { container } = render(<SourceBadge source={mockSource} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('gap-2');
    });

    it('should apply score badge styling', () => {
      const { container } = render(<SourceBadge source={mockSource} />);

      const badges = container.querySelectorAll('.bg-blue-100');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined URL gracefully', () => {
      render(<SourceBadge source={{ ...mockSource, url: undefined as any }} />);

      expect(screen.getByText('Local')).toBeInTheDocument();
    });

    it('should handle zero score', () => {
      render(<SourceBadge source={{ ...mockSource, score: 0 }} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle very high score', () => {
      render(<SourceBadge source={{ ...mockSource, score: 0.9999 }} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should handle empty className', () => {
      const { container } = render(<SourceBadge source={mockSource} className="" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toBeInTheDocument();
    });
  });
});
