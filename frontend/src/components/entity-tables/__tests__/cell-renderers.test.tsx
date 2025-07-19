import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { 
  StatusCellRenderer,
  DateCellRenderer,
  UrlCellRenderer,
  CheckboxCellRenderer,
  ThumbnailsCellRenderer,
  FileListCellRenderer,
  VersionsCellRenderer,
  PriorityCellRenderer,
  NotesCellRenderer
} from '../cell-renderers';
import { ShotStatus, FileReference, VersionReference } from '@shared/types';

describe('Cell Renderers', () => {
  // Helper function to create mock params
  const createMockParams = (value: any) => ({
    value,
    id: 'test-id',
    field: 'test-field',
    row: {},
    colDef: {},
    api: {},
    formattedValue: value,
  });

  describe('StatusCellRenderer', () => {
    it('renders status chip with correct color', () => {
      render(<StatusCellRenderer {...createMockParams(ShotStatus.IN_PROGRESS)} />);
      const chip = screen.getByText('In Progress');
      expect(chip).toBeInTheDocument();
    });

    it('returns null for empty status', () => {
      const { container } = render(<StatusCellRenderer {...createMockParams(null)} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('DateCellRenderer', () => {
    it('formats date correctly', () => {
      render(<DateCellRenderer {...createMockParams('2025-07-18')} />);
      expect(screen.getByText('Jul 18, 2025')).toBeInTheDocument();
    });

    it('returns null for empty date', () => {
      const { container } = render(<DateCellRenderer {...createMockParams(null)} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('UrlCellRenderer', () => {
    it('renders URL with hostname', () => {
      render(<UrlCellRenderer {...createMockParams('https://example.com/test')} />);
      const link = screen.getByText('example.com');
      expect(link).toBeInTheDocument();
      expect(link.getAttribute('href')).toBe('https://example.com/test');
    });

    it('returns null for empty URL', () => {
      const { container } = render(<UrlCellRenderer {...createMockParams(null)} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('CheckboxCellRenderer', () => {
    it('renders checked checkbox for true value', () => {
      render(<CheckboxCellRenderer {...createMockParams(true)} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();
      expect(checkbox).toBeDisabled();
    });

    it('renders unchecked checkbox for false value', () => {
      render(<CheckboxCellRenderer {...createMockParams(false)} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
      expect(checkbox).toBeDisabled();
    });
  });

  describe('ThumbnailsCellRenderer', () => {
    it('renders thumbnails grid', () => {
      const files: FileReference[] = [
        {
          id: 'file1',
          name: 'file1.jpg',
          size: 1000,
          mimeType: 'image/jpeg',
          path: '/path/to/file1.jpg',
          url: 'https://example.com/file1.jpg',
          createdAt: new Date(),
        },
        {
          id: 'file2',
          name: 'file2.jpg',
          size: 2000,
          mimeType: 'image/jpeg',
          path: '/path/to/file2.jpg',
          url: 'https://example.com/file2.jpg',
          createdAt: new Date(),
        },
      ];
      
      render(<ThumbnailsCellRenderer {...createMockParams(files)} />);
      const images = screen.getAllByRole('img');
      expect(images.length).toBe(2);
      expect(images[0].getAttribute('src')).toBe('https://example.com/file1.jpg');
      expect(images[1].getAttribute('src')).toBe('https://example.com/file2.jpg');
    });

    it('shows count for additional files', () => {
      const files: FileReference[] = Array(5).fill(null).map((_, i) => ({
        id: `file${i}`,
        name: `file${i}.jpg`,
        size: 1000,
        mimeType: 'image/jpeg',
        path: `/path/to/file${i}.jpg`,
        url: `https://example.com/file${i}.jpg`,
        createdAt: new Date(),
      }));
      
      render(<ThumbnailsCellRenderer {...createMockParams(files)} />);
      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    it('returns null for empty files', () => {
      const { container } = render(<ThumbnailsCellRenderer {...createMockParams(null)} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('FileListCellRenderer', () => {
    it('renders file count', () => {
      const files: FileReference[] = Array(3).fill(null).map((_, i) => ({
        id: `file${i}`,
        name: `file${i}.jpg`,
        size: 1000,
        mimeType: 'image/jpeg',
        path: `/path/to/file${i}.jpg`,
        url: `https://example.com/file${i}.jpg`,
        createdAt: new Date(),
      }));
      
      render(<FileListCellRenderer {...createMockParams(files)} />);
      expect(screen.getByText('3 files')).toBeInTheDocument();
    });

    it('uses singular form for single file', () => {
      const files: FileReference[] = [{
        id: 'file1',
        name: 'file1.jpg',
        size: 1000,
        mimeType: 'image/jpeg',
        path: '/path/to/file1.jpg',
        url: 'https://example.com/file1.jpg',
        createdAt: new Date(),
      }];
      
      render(<FileListCellRenderer {...createMockParams(files)} />);
      expect(screen.getByText('1 file')).toBeInTheDocument();
    });

    it('returns null for empty files', () => {
      const { container } = render(<FileListCellRenderer {...createMockParams(null)} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('VersionsCellRenderer', () => {
    it('renders version count and latest file name', () => {
      const versions: VersionReference = {
        latest: {
          id: 'file3',
          name: 'latest.jpg',
          size: 3000,
          mimeType: 'image/jpeg',
          path: '/path/to/latest.jpg',
          url: 'https://example.com/latest.jpg',
          createdAt: new Date(),
        },
        versions: Array(3).fill(null).map((_, i) => ({
          id: `file${i}`,
          name: `file${i}.jpg`,
          size: 1000,
          mimeType: 'image/jpeg',
          path: `/path/to/file${i}.jpg`,
          url: `https://example.com/file${i}.jpg`,
          createdAt: new Date(),
        })),
      };
      
      render(<VersionsCellRenderer {...createMockParams(versions)} />);
      expect(screen.getByText('v3 - latest.jpg')).toBeInTheDocument();
    });

    it('returns null for empty versions', () => {
      const { container } = render(<VersionsCellRenderer {...createMockParams(null)} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('PriorityCellRenderer', () => {
    it('renders high priority with correct color', () => {
      render(<PriorityCellRenderer {...createMockParams(1)} />);
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('renders medium priority with correct color', () => {
      render(<PriorityCellRenderer {...createMockParams(2)} />);
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('renders low priority with correct color', () => {
      render(<PriorityCellRenderer {...createMockParams(3)} />);
      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('returns null for empty priority', () => {
      const { container } = render(<PriorityCellRenderer {...createMockParams(null)} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('NotesCellRenderer', () => {
    it('renders notes with tooltip', () => {
      render(<NotesCellRenderer {...createMockParams('This is a test note')} />);
      expect(screen.getByText('This is a test note')).toBeInTheDocument();
    });

    it('returns null for empty notes', () => {
      const { container } = render(<NotesCellRenderer {...createMockParams(null)} />);
      expect(container.firstChild).toBeNull();
    });
  });
});