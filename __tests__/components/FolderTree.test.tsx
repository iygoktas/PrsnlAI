/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FolderTree, { type FolderNode } from '@/components/FolderTree';

jest.mock('lucide-react', () => ({
  Globe: ({ className }: { className?: string }) => <span data-testid="icon-globe" className={className} />,
  Lock: ({ className }: { className?: string }) => <span data-testid="icon-lock" className={className} />,
  ChevronRight: () => <span />,
  ChevronDown: () => <span />,
  FolderOpen: () => <span />,
  Folder: () => <span />,
  FileText: () => <span />,
  AlignLeft: () => <span />,
  Twitter: () => <span />,
}));

const source1 = { id: 's1', title: 'Doc Alpha', type: 'URL' as const, url: 'https://example.com', createdAt: '2024-01-01T00:00:00Z' };
const source2 = { id: 's2', title: 'Doc Beta', type: 'PDF' as const, url: null, createdAt: '2024-02-01T00:00:00Z' };
const source3 = { id: 's3', title: 'Doc Gamma', type: 'TEXT' as const, url: null, createdAt: '2024-03-01T00:00:00Z' };

const childFolder: FolderNode = {
  id: 'f2', name: 'Child Folder', isPublic: true, parentId: 'f1',
  sources: [source3], children: [],
};

const rootFolder: FolderNode = {
  id: 'f1', name: 'Root Folder', isPublic: true, parentId: null,
  sources: [source1, source2],
  children: [childFolder],
};

const leafFolder: FolderNode = {
  id: 'f4', name: 'Leaf Folder', isPublic: true, parentId: null,
  sources: [source1], children: [],
};

const privateFolder: FolderNode = {
  id: 'f3', name: 'Private Folder', isPublic: false, parentId: null,
  sources: [source1], children: [],
};

describe('FolderTree', () => {
  describe('rendering', () => {
    it('renders folder name', () => {
      render(
        <FolderTree
          folder={leafFolder}
          selectedSourceIds={new Set()}
          onSelectFolder={jest.fn()}
          onSelectSource={jest.fn()}
        />,
      );
      expect(screen.getByText('Leaf Folder')).toBeInTheDocument();
    });

    it('shows public folder with globe icon', () => {
      render(
        <FolderTree
          folder={leafFolder}
          selectedSourceIds={new Set()}
          onSelectFolder={jest.fn()}
          onSelectSource={jest.fn()}
        />,
      );
      // There is a globe in the folder header
      const globes = screen.getAllByTestId('icon-globe');
      expect(globes.length).toBeGreaterThan(0);
    });

    it('shows private folder with lock icon', () => {
      render(
        <FolderTree
          folder={privateFolder}
          selectedSourceIds={new Set()}
          onSelectFolder={jest.fn()}
          onSelectSource={jest.fn()}
        />,
      );
      expect(screen.getByTestId('icon-lock')).toBeInTheDocument();
    });

    it('shows selected count', () => {
      render(
        <FolderTree
          folder={rootFolder}
          selectedSourceIds={new Set(['s1'])}
          onSelectFolder={jest.fn()}
          onSelectSource={jest.fn()}
        />,
      );
      // root has s1, s2 + child s3 = 3 total, 1 selected
      expect(screen.getByText('1/3')).toBeInTheDocument();
    });

    it('renders documents when expanded at level 0', () => {
      render(
        <FolderTree
          folder={rootFolder}
          selectedSourceIds={new Set()}
          onSelectFolder={jest.fn()}
          onSelectSource={jest.fn()}
        />,
      );
      // Level 0 starts expanded
      expect(screen.getByText('Doc Alpha')).toBeInTheDocument();
      expect(screen.getByText('Doc Beta')).toBeInTheDocument();
    });
  });

  describe('folder checkbox behavior', () => {
    it('calls onSelectFolder with true when checkbox checked', () => {
      const onSelectFolder = jest.fn();
      render(
        <FolderTree
          folder={rootFolder}
          selectedSourceIds={new Set()}
          onSelectFolder={onSelectFolder}
          onSelectSource={jest.fn()}
        />,
      );

      const checkbox = screen.getByLabelText('Select all in Root Folder');
      fireEvent.click(checkbox);
      expect(onSelectFolder).toHaveBeenCalledWith(rootFolder, true);
    });

    it('checkbox is checked when all sources selected', () => {
      render(
        <FolderTree
          folder={rootFolder}
          selectedSourceIds={new Set(['s1', 's2', 's3'])}
          onSelectFolder={jest.fn()}
          onSelectSource={jest.fn()}
        />,
      );

      const checkbox = screen.getByLabelText('Select all in Root Folder') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('checkbox is unchecked when no sources selected', () => {
      render(
        <FolderTree
          folder={rootFolder}
          selectedSourceIds={new Set()}
          onSelectFolder={jest.fn()}
          onSelectSource={jest.fn()}
        />,
      );

      const checkbox = screen.getByLabelText('Select all in Root Folder') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });
  });

  describe('source checkbox behavior', () => {
    it('calls onSelectSource when document checkbox clicked', () => {
      const onSelectSource = jest.fn();
      render(
        <FolderTree
          folder={rootFolder}
          selectedSourceIds={new Set()}
          onSelectFolder={jest.fn()}
          onSelectSource={onSelectSource}
        />,
      );

      const checkbox = screen.getByLabelText('Select Doc Alpha');
      fireEvent.click(checkbox);
      expect(onSelectSource).toHaveBeenCalledWith('s1', true);
    });

    it('calls onSelectSource with false when selected doc unchecked', () => {
      const onSelectSource = jest.fn();
      render(
        <FolderTree
          folder={rootFolder}
          selectedSourceIds={new Set(['s1'])}
          onSelectFolder={jest.fn()}
          onSelectSource={onSelectSource}
        />,
      );

      const checkbox = screen.getByLabelText('Select Doc Alpha') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
      fireEvent.click(checkbox);
      expect(onSelectSource).toHaveBeenCalledWith('s1', false);
    });
  });

  describe('expand/collapse', () => {
    it('collapses on click at non-root level', () => {
      render(
        <FolderTree
          folder={childFolder}
          level={1}
          selectedSourceIds={new Set()}
          onSelectFolder={jest.fn()}
          onSelectSource={jest.fn()}
        />,
      );
      // child starts collapsed (level > 0)
      expect(screen.queryByText('Doc Gamma')).not.toBeInTheDocument();

      // click to expand
      fireEvent.click(screen.getByText('Child Folder'));
      expect(screen.getByText('Doc Gamma')).toBeInTheDocument();
    });

    it('starts expanded at level 0', () => {
      render(
        <FolderTree
          folder={leafFolder}
          level={0}
          selectedSourceIds={new Set()}
          onSelectFolder={jest.fn()}
          onSelectSource={jest.fn()}
        />,
      );
      // level 0 starts expanded — shows Doc Alpha
      expect(screen.getByText('Doc Alpha')).toBeInTheDocument();
    });
  });

  describe('viewer mode', () => {
    it('disables checkboxes for private folders in viewer mode', () => {
      render(
        <FolderTree
          folder={privateFolder}
          selectedSourceIds={new Set()}
          onSelectFolder={jest.fn()}
          onSelectSource={jest.fn()}
          isViewer={true}
        />,
      );

      const checkbox = screen.getByLabelText('Select all in Private Folder') as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    });

    it('enables checkboxes for public folders in viewer mode', () => {
      render(
        <FolderTree
          folder={rootFolder}
          selectedSourceIds={new Set()}
          onSelectFolder={jest.fn()}
          onSelectSource={jest.fn()}
          isViewer={true}
        />,
      );

      const checkbox = screen.getByLabelText('Select all in Root Folder') as HTMLInputElement;
      expect(checkbox.disabled).toBe(false);
    });
  });
});
