import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FileConflictDialog from './FileConflictDialog';

describe('FileConflictDialog', () => {
  const mockProps = {
    isOpen: true,
    fileName: 'test-file.pdf',
    existingFileInfo: {
      size: '2.5 MB',
      uploadedAt: 'Jan 15, 2:30 PM',
      url: 'https://example.com/test-file.pdf'
    },
    onResolve: jest.fn(),
    onCancel: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<FileConflictDialog {...mockProps} />);
    
    expect(screen.getByText('File Already Exists')).toBeInTheDocument();
    expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
    expect(screen.getByText('2.5 MB')).toBeInTheDocument();
    expect(screen.getByText('Jan 15, 2:30 PM')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<FileConflictDialog {...mockProps} isOpen={false} />);
    
    expect(screen.queryByText('File Already Exists')).not.toBeInTheDocument();
  });

  it('calls onResolve with correct action when use existing is clicked', () => {
    render(<FileConflictDialog {...mockProps} />);
    
    const useExistingButton = screen.getByText('Use existing file');
    fireEvent.click(useExistingButton);
    
    expect(mockProps.onResolve).toHaveBeenCalledWith('use-existing');
  });

  it('calls onResolve with correct action when overwrite is clicked', () => {
    render(<FileConflictDialog {...mockProps} />);
    
    const overwriteButton = screen.getByText('Replace with new version');
    fireEvent.click(overwriteButton);
    
    expect(mockProps.onResolve).toHaveBeenCalledWith('overwrite');
  });

  it('calls onResolve with correct action when rename is clicked', () => {
    render(<FileConflictDialog {...mockProps} />);
    
    const renameButton = screen.getByText(/Save as "test-file \(2\)\.pdf"/);
    fireEvent.click(renameButton);
    
    expect(mockProps.onResolve).toHaveBeenCalledWith('rename');
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<FileConflictDialog {...mockProps} />);
    
    const cancelButton = screen.getByText('Cancel upload');
    fireEvent.click(cancelButton);
    
    expect(mockProps.onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when X button is clicked', () => {
    render(<FileConflictDialog {...mockProps} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(mockProps.onCancel).toHaveBeenCalled();
  });
}); 