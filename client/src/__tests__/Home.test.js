import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Home from '../pages/Home'; // Укажи правильный путь к компоненту
import axios from 'axios';
import { BrowserRouter as Router } from 'react-router-dom';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';

jest.mock('axios'); // Мокаем Axios

describe('Home Component', () => {
  beforeEach(() => {
    axios.get.mockClear(); // Очистка мока перед каждым тестом
  });

  test('renders loading spinner initially', () => {
    render(
      <Router>
        <Home />
      </Router>
    );
    expect(screen.getByRole('status')).toBeInTheDocument(); // Проверка, что отображается индикатор загрузки
  });

  test('displays error message on failed product fetch', async () => {
    axios.get.mockRejectedValueOnce(new Error('Ошибка при загрузке товаров.')); // Настройка мока для неуспешного запроса

    render(
      <Router>
        <Home />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText(/ошибка при загрузке товаров/i)).toBeInTheDocument(); // Проверка, что сообщение об ошибке отображается
    });
  });

  test('displays "Активные товары не найдены" when there are no products', async () => {
    axios.get.mockResolvedValueOnce({ data: [] }); // Мокаем успешный ответ без товаров

    render(
      <Router>
        <Home />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText(/активные товары не найдены/i)).toBeInTheDocument(); // Проверка, что отображается сообщение об отсутствии товаров
    });
  });

  test('renders products correctly when fetched successfully', async () => {
    const mockProducts = [
      {
        id: 1,
        name: 'Test Product 1',
        images: '["image1.jpg"]',
      },
      {
        id: 2,
        name: 'Test Product 2',
        images: '["image2.jpg"]',
      },
    ];

    axios.get.mockResolvedValueOnce({ data: { message: 'Успех' } }); // Мокаем успешную аутентификацию
    axios.get.mockResolvedValueOnce({ data: mockProducts }); // Мокаем успешный ответ с товарами

    render(
      <Router>
        <Home />
      </Router>
    );

    await waitFor(() => {
      expect(screen.queryByText(/активные товары не найдены/i)).not.toBeInTheDocument(); // Проверяем, что сообщение об отсутствии товаров отсутствует
      expect(screen.getByText('Test Product 1')).toBeInTheDocument(); // Проверяем, что отображаются названия товаров
      expect(screen.getByText('Test Product 2')).toBeInTheDocument();
    });
  });

  test('renders header, banner, and footer components', async () => {
    axios.get.mockResolvedValueOnce({ data: { message: 'Успех' } });
    axios.get.mockResolvedValueOnce({ data: [] }); // Мокаем успешный ответ с пустым массивом товаров

    render(
      <Router>
        <Home />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText(/активные товары не найдены/i)).toBeInTheDocument();
    });

    // Проверяем наличие компонентов на главной странице
    expect(screen.getByText(/header component/i)).toBeInTheDocument();
    expect(screen.getByText(/footer component/i)).toBeInTheDocument();
    expect(screen.getByText(/banner component/i)).toBeInTheDocument();
  });
});
