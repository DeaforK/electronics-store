import React from 'react';
import '../../style/Pagination.css';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const generatePageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        const startPage = Math.max(currentPage - Math.floor(maxVisiblePages / 2), 1);
        const endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);

        // Если первая страница не включена, добавим "1" и "..."
        if (startPage > 1) {
            pages.push(1);
            if (startPage > 2) {
                pages.push('...');
            }
        }

        // Основные видимые страницы
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        // Если последняя страница не включена, добавим "..." и последнюю страницу
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push('...');
            }
            pages.push(totalPages);
        }

        return pages;
    };


    const handlePageClick = (page) => {
        if (page === '...' || page <= 0 || page > totalPages) return; // Игнорируем недопустимые страницы
        onPageChange(page);
    };

    return (
        <nav aria-label="Page navigation">
            <ul className="pagination">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                        className="page-link arrow"
                        aria-label="Previous"
                        onClick={() => handlePageClick(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <span aria-hidden="true">&#8249;</span>
                    </button>
                </li>

                {generatePageNumbers().map((page, index) => (
                    <li
                        key={index}
                        className={`page-item ${page === currentPage ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}
                    >
                        <button
                            className="page-link"
                            onClick={() => handlePageClick(page)}
                            disabled={page === '...'}
                        >
                            {page}
                        </button>
                    </li>
                ))}

                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button
                        className="page-link arrow"
                        aria-label="Next"
                        onClick={() => handlePageClick(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        <span aria-hidden="true">&#8250;</span>
                    </button>
                </li>
            </ul>
        </nav>
    );
};


export default Pagination;
