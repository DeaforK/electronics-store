import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AdminPage from '../pages/Admin'; // Укажи правильный путь к компоненту
import axios from 'axios';
import { BrowserRouter as Router } from 'react-router-dom';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';
import { createMemoryHistory } from 'history';

jest.mock('axios'); // Мокаем Axios

describe('AdminPage Component', () => {
  beforeEach(() => {
    axios.get.mockClear(); // Очистка мока перед каждым тестом
  });

  test('renders loading spinner initially', () => {
    render(
      <Router>
        <AdminPage />
      </Router>
    );
    expect(screen.getByRole('status')).toBeInTheDocument(); // Проверка, что отображается индикатор загрузки
  });

  test('redirects to /login if user is not admin', async () => {
    const history = createMemoryHistory();
    history.push = jest.fn();

    axios.get.mockResolvedValueOnce({ data: { user: { role: 'user' } } }); // Мокаем успешный ответ с пользователем, не являющимся администратором

    render(
      <Router history={history}>
        <AdminPage />
      </Router>
    );

    await waitFor(() => {
      expect(history.push).toHaveBeenCalledWith('/login'); // Проверка, что происходит редирект на /login
    });
  });

  test('redirects to /login on error fetching admin data', async () => {
    const history = createMemoryHistory();
    history.push = jest.fn();

    axios.get.mockRejectedValueOnce(new Error('Ошибка при проверке роли администратора')); // Мокаем ошибку запроса

    render(
      <Router history={history}>
        <AdminPage />
      </Router>
    );

    await waitFor(() => {
      expect(history.push).toHaveBeenCalledWith('/login'); // Проверка, что при ошибке происходит редирект на /login
    });
  });

  test('renders admin panel correctly for admin user', async () => {
    axios.get.mockResolvedValueOnce({ data: { user: { role: 'admin' } } }); // Мокаем успешный ответ с пользователем-администратором

    render(
      <Router>
        <AdminPage />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText(/админ панель/i)).toBeInTheDocument(); // Проверяем, что отображается заголовок "Админ панель"
      expect(screen.getByText(/управление категориями/i)).toBeInTheDocument(); // Проверяем наличие элементов списка
      expect(screen.getByText(/управление способами доставки/i)).toBeInTheDocument();
      expect(screen.getByText(/управление товарами/i)).toBeInTheDocument();
      expect(screen.getByText(/управление заказами/i)).toBeInTheDocument();
      expect(screen.getByText(/отчёты/i)).toBeInTheDocument();
    });
  });

  test('renders error message when fetching data fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('Ошибка при проверке роли администратора')); // Мокаем ошибку запроса

    render(
      <Router>
        <AdminPage />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText(/ошибка при проверке роли администратора/i)).toBeInTheDocument(); // Проверяем, что отображается сообщение об ошибке
    });
  });
});
