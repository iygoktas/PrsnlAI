/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

jest.mock('lucide-react', () => ({
  Globe: () => <span />,
  Lock: () => <span />,
  ChevronRight: () => <span />,
  ChevronDown: () => <span />,
  FolderOpen: () => <span />,
  Folder: () => <span />,
  FileText: () => <span />,
  AlignLeft: () => <span />,
  Twitter: () => <span />,
  Search: () => <span />,
  X: () => <span />,
  LayoutList: () => <span />,
}));

const mockFolders = [
  {
    id: 'f1', name: 'Public Docs', isPublic: true, parentId: null, orgId: 'org-1',
    sources: [
      { id: 's1', title: 'Alpha', type: 'URL', url: 'https://a.com', createdAt: '2024-01-01T00:00:00Z' },
      { id: 's2', title: 'Beta', type: 'PDF', url: null, createdAt: '2024-02-01T00:00:00Z' },
    ],
  },
  {
    id: 'f2', name: 'Private', isPublic: false, parentId: null, orgId: 'org-1',
    sources: [
      { id: 's3', title: 'Gamma', type: 'TEXT', url: null, createdAt: '2024-03-01T00:00:00Z' },
    ],
  },
];

import SourceSelector from '@/components/SourceSelector';

function setupFetch(folders = mockFolders) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ folders }),
  } as unknown as Response);
}

beforeEach(() => jest.clearAllMocks());

describe('SourceSelector', () => {
  describe('loading and rendering', () => {
    it('shows loading state initially', () => {
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {})); // never resolves

      render(<SourceSelector orgId="org-1" onSelectionChange={jest.fn()} />);

      expect(screen.getByText('Loading folders…')).toBeInTheDocument();
    });

    it('renders folders after loading', async () => {
      setupFetch();

      await act(async () => {
        render(<SourceSelector orgId="org-1" onSelectionChange={jest.fn()} />);
      });

      await waitFor(() => expect(screen.getByText('Public Docs')).toBeInTheDocument());
      expect(screen.getByText('Private')).toBeInTheDocument();
    });

    it('shows error state on fetch failure', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await act(async () => {
        render(<SourceSelector orgId="org-1" onSelectionChange={jest.fn()} />);
      });

      await waitFor(() => expect(screen.getByText(/Failed to load folders/)).toBeInTheDocument());
    });
  });

  describe('selection', () => {
    it('calls onSelectionChange when source selected', async () => {
      setupFetch();
      const onSelectionChange = jest.fn();

      await act(async () => {
        render(<SourceSelector orgId="org-1" onSelectionChange={onSelectionChange} />);
      });

      // Folders at level 0 start expanded — documents should be immediately visible
      await waitFor(() => screen.getByLabelText('Select Alpha'));

      await act(async () => {
        fireEvent.click(screen.getByLabelText('Select Alpha'));
      });

      expect(onSelectionChange).toHaveBeenCalledWith(expect.arrayContaining(['s1']));
    });

    it('shows selected count badge when documents selected', async () => {
      setupFetch();

      await act(async () => {
        render(<SourceSelector orgId="org-1" onSelectionChange={jest.fn()} />);
      });

      await waitFor(() => screen.getByLabelText('Select Alpha'));
      await act(async () => { fireEvent.click(screen.getByLabelText('Select Alpha')); });

      await waitFor(() => expect(screen.getByText(/1 document selected/)).toBeInTheDocument());
    });

    it('updates count for multiple selections', async () => {
      setupFetch();

      await act(async () => {
        render(<SourceSelector orgId="org-1" onSelectionChange={jest.fn()} />);
      });

      await waitFor(() => screen.getByLabelText('Select Alpha'));

      await act(async () => { fireEvent.click(screen.getByLabelText('Select Alpha')); });
      await act(async () => { fireEvent.click(screen.getByLabelText('Select Beta')); });

      await waitFor(() => expect(screen.getByText(/2 documents selected/)).toBeInTheDocument());
    });

    it('clears selection when clear button clicked', async () => {
      setupFetch();

      await act(async () => {
        render(<SourceSelector orgId="org-1" onSelectionChange={jest.fn()} />);
      });

      await waitFor(() => screen.getByLabelText('Select Alpha'));
      await act(async () => { fireEvent.click(screen.getByLabelText('Select Alpha')); });
      await waitFor(() => screen.getByText(/1 document selected/));

      const clearBtn = screen.getByText('Clear');
      await act(async () => { fireEvent.click(clearBtn); });

      await waitFor(() => expect(screen.queryByText(/document selected/)).not.toBeInTheDocument());
    });
  });

  describe('search filter', () => {
    it('filters documents by search query in flat view', async () => {
      setupFetch();

      await act(async () => {
        render(<SourceSelector orgId="org-1" onSelectionChange={jest.fn()} />);
      });

      await waitFor(() => screen.getByText('Public Docs'));

      // Switch to flat view
      const toggleBtn = screen.getByLabelText('Toggle view mode');
      await act(async () => { fireEvent.click(toggleBtn); });

      // Type in search
      const searchInput = screen.getByLabelText('Search documents');
      await act(async () => { fireEvent.change(searchInput, { target: { value: 'Alpha' } }); });

      await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
      expect(screen.queryByText('Beta')).not.toBeInTheDocument();
    });
  });

  describe('folder selection', () => {
    it('selects all sources when folder checkbox clicked', async () => {
      setupFetch();
      const onSelectionChange = jest.fn();

      await act(async () => {
        render(<SourceSelector orgId="org-1" onSelectionChange={onSelectionChange} />);
      });

      await waitFor(() => screen.getByLabelText('Select all in Public Docs'));

      const folderCheckbox = screen.getByLabelText('Select all in Public Docs');
      await act(async () => { fireEvent.click(folderCheckbox); });

      // Should have s1 and s2
      expect(onSelectionChange).toHaveBeenCalledWith(
        expect.arrayContaining(['s1', 's2']),
      );
    });
  });
});
