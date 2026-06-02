import React from 'react';
import './Pagination.css';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalElements?: number;
    size?: number;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    totalElements,
    size,
}) => {
    if (totalPages <= 1) return null;

    const handlePrevious = () => {
        if (currentPage > 0) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages - 1) {
            onPageChange(currentPage + 1);
        }
    };

    return (
        <div className="pagination-container">
            <div className="pagination-info">
                {totalElements !== undefined && size !== undefined ? (
                    <span>
                        Showing {currentPage * size + 1} to{' '}
                        {Math.min((currentPage + 1) * size, totalElements)} of {totalElements} entries
                    </span>
                ) : (
                    <span>
                        Page {currentPage + 1} of {totalPages}
                    </span>
                )}
            </div>
            <div className="pagination-controls">
                <button
                    className="pagination-button"
                    onClick={handlePrevious}
                    disabled={currentPage === 0}
                >
                    Previous
                </button>
                <div className="pagination-pages">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        // Simple logic to show window of pages around current page
                        let pageNum = i;
                        if (totalPages > 5) {
                            if (currentPage > 2 && currentPage < totalPages - 2) {
                                pageNum = currentPage - 2 + i;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 5 + i;
                            }
                        }

                        return (
                            <button
                                key={pageNum}
                                className={`pagination-page-number ${currentPage === pageNum ? 'active' : ''}`}
                                onClick={() => onPageChange(pageNum)}
                            >
                                {pageNum + 1}
                            </button>
                        );
                    })}
                </div>
                <button
                    className="pagination-button"
                    onClick={handleNext}
                    disabled={currentPage === totalPages - 1}
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default Pagination;
