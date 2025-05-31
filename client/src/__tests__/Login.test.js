import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../pages/Login'; // Путь к твоему компоненту
import axios from 'axios';
import { BrowserRouter as Router } from 'react-router-dom'; // Обернем в Router для использования navigate

jest.mock('axios'); // Мокаем axios

describe('Login Component', () => {
  beforeEach(() => {
    render(
      <Router>
        <Login />
      </Router>
    );
  });

  test('renders login form', () => {
    expect(screen.getByText(/вход/i)).toBeInTheDocument(); // Проверка заголовка
    expect(screen.getByPlaceholderText(/введите email или телефон/i)).toBeInTheDocument(); // Поле ввода
    expect(screen.getByPlaceholderText(/введите пароль/i)).toBeInTheDocument(); // Поле пароля
    expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument(); // Кнопка входа
  });

  test('displays validation errors when fields are empty', async () => {
    fireEvent.click(screen.getByRole('button', { name: /войти/i })); // Попытка отправки формы

    expect(await screen.findByText(/поле обязательно для заполнения/i)).toBeInTheDocument(); // Проверка сообщения об ошибке
    expect(await screen.findByText(/пароль обязателен/i)).toBeInTheDocument(); // Проверка сообщения об ошибке
  });

  test('submits form and navigates on successful login', async () => {
    // Настройка мока для успешного входа
    axios.post.mockResolvedValueOnce({ data: { message: 'Успех входа' } });
    const identifierInput = screen.getByPlaceholderText(/введите email или телефон/i);
    const passwordInput = screen.getByPlaceholderText(/введите пароль/i);
    fireEvent.change(identifierInput, { target: { value: 'user@example.com' } }); // Ввод email
    fireEvent.change(passwordInput, { target: { value: 'password123' } }); // Ввод пароля
    fireEvent.click(screen.getByRole('button', { name: /войти/i })); // Отправка формы

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('http://localhost:8081/login', {
        emailOrPhone: 'user@example.com',
        password: 'password123'
      });
    });
    expect(window.location.pathname).toBe('/'); // Проверка перенаправления на главную страницу
  });

  test('displays error message on unsuccessful login', async () => {
    // Настройка мока для неуспешного входа
    axios.post.mockRejectedValueOnce({ response: { data: { message: 'Неверные учетные данные' } } });
    const identifierInput = screen.getByPlaceholderText(/введите email или телефон/i);
    const passwordInput = screen.getByPlaceholderText(/введите пароль/i);
    fireEvent.change(identifierInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /войти/i }));

    expect(await screen.findByText(/неверные учетные данные/i)).toBeInTheDocument(); // Проверка сообщения об ошибке
  });
});
