import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminCategories from '../components/Admin/CategoriesPage';
import axios from 'axios';
import { BrowserRouter as Router } from 'react-router-dom';

jest.mock('axios');

describe('AdminCategories', () => {
    beforeEach(() => {
        axios.get.mockClear();
        axios.post.mockClear();
        axios.put.mockClear();
        axios.delete.mockClear();
    });

    test('renders the AdminCategories component', async () => {
        axios.get.mockResolvedValueOnce({ data: [] });
        axios.get.mockResolvedValueOnce({ data: [] });

        render(
            <Router>
                <AdminCategories />
            </Router>
        );

        expect(screen.getByText('Загрузка...')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByText('Управление категориями')).toBeInTheDocument());
    });

    test('shows error message when loading categories fails', async () => {
        axios.get.mockRejectedValue(new Error('Ошибка при загрузке категорий'));

        render(
            <Router>
                <AdminCategories />
            </Router>
        );

        await waitFor(() => expect(screen.getByText('Ошибка при загрузке категорий')).toBeInTheDocument());
    });

    test('can add a new category', async () => {
        axios.get.mockResolvedValueOnce({ data: [] });
        axios.post.mockResolvedValueOnce({ data: { name: 'New Category' } });
        axios.get.mockResolvedValueOnce({ data: [{ name: 'New Category', _id: '1' }] });
        axios.get.mockResolvedValueOnce({ data: [] });

        render(
            <Router>
                <AdminCategories />
            </Router>
        );

        await waitFor(() => expect(screen.getByText('Управление категориями')).toBeInTheDocument());

        fireEvent.click(screen.getByTestId('add-category-button'));

        fireEvent.change(screen.getByPlaceholderText('Введите название категории'), { target: { value: 'New Category' } });

        fireEvent.click(screen.getByTestId('submit-add-category'));

        await waitFor(() => expect(screen.getByText('Категория добавлена успешно.')).toBeInTheDocument());
    });

    test('can archive and restore a category', async () => {
        const mockCategory = { _id: '1', name: 'Test Category' };
        axios.get.mockResolvedValueOnce({ data: [mockCategory] });
        axios.get.mockResolvedValueOnce({ data: [] });
        axios.delete.mockResolvedValueOnce({});
        axios.put.mockResolvedValueOnce({});

        render(
            <Router>
                <AdminCategories />
            </Router>
        );

        await waitFor(() => expect(screen.getByText('Test Category')).toBeInTheDocument());

        fireEvent.click(screen.getByTestId('archive-category-button'));

        await waitFor(() => expect(screen.getByText('Категория архивирована.')).toBeInTheDocument());

        fireEvent.click(screen.getByTestId('show-archived-categories'));

        await waitFor(() => expect(screen.getByText('Test Category')).toBeInTheDocument());

        fireEvent.click(screen.getByTestId('restore-category-button'));

        await waitFor(() => expect(screen.getByText('Категория восстановлена.')).toBeInTheDocument());
    });

    test('displays and hides the modal window', async () => {
        axios.get.mockResolvedValueOnce({ data: [] });
        axios.get.mockResolvedValueOnce({ data: [] });

        render(
            <Router>
                <AdminCategories />
            </Router>
        );

        await waitFor(() => expect(screen.getByText('Управление категориями')).toBeInTheDocument());

        fireEvent.click(screen.getByTestId('add-category-button'));

        expect(screen.getByTestId('modal-title')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('cancel-button'));

        await waitFor(() => expect(screen.queryByTestId('modal-title')).not.toBeInTheDocument());
    });

    test('should add a new category and display it', async () => {
        render(<AdminCategories />);
    
        // Открытие модального окна добавления категории
        fireEvent.click(screen.getByTestId('add-category-button'));
    
        // Ввод имени новой категории
        fireEvent.change(screen.getByTestId('category-name-input'), { target: { value: 'Test Category' } });
        
        // Клик по кнопке сохранения
        fireEvent.click(screen.getByTestId('save-button'));
    
        // Ожидание появления новой категории
        await waitFor(() => expect(screen.getByText('Test Category')).toBeInTheDocument());
    });
    
});
