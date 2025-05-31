import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Register from '../pages/Register'; // Укажи правильный путь к компоненту
import axios from 'axios';
import { BrowserRouter as Router } from 'react-router-dom';

jest.mock('axios'); // Мокаем axios

describe('Register Component', () => {
  beforeEach(() => {
    render(
      <Router>
        <Register />
      </Router>
    );
  });

  test('renders registration form', () => {
    expect(screen.getByText(/регистрация/i)).toBeInTheDocument(); // Проверка заголовка
    expect(screen.getByLabelText(/имя/i)).toBeInTheDocument(); // Поле "Имя"
    expect(screen.getByLabelText(/электронная почта/i)).toBeInTheDocument(); // Поле "Электронная почта"
    expect(screen.getByLabelText(/телефон/i)).toBeInTheDocument(); // Поле "Телефон"
    expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument(); // Поле "Пароль"
    expect(screen.getByRole('button', { name: /зарегистрироваться/i })).toBeInTheDocument(); // Кнопка регистрации
  });

  test('displays validation errors when fields are empty', async () => {
    fireEvent.click(screen.getByRole('button', { name: /зарегистрироваться/i })); // Попытка отправки формы

    expect(await screen.findByText(/имя обязательно/i)).toBeInTheDocument(); // Проверка сообщения об ошибке
    expect(await screen.findByText(/электронная почта обязательна/i)).toBeInTheDocument(); // Проверка сообщения об ошибке
    expect(await screen.findByText(/телефон обязателен/i)).toBeInTheDocument(); // Проверка сообщения об ошибке
    expect(await screen.findByText(/пароль обязателен/i)).toBeInTheDocument(); // Проверка сообщения об ошибке
  });

  test('submits form and navigates on successful registration', async () => {
    // Настройка мока для успешной регистрации
    axios.post.mockResolvedValueOnce({ status: 200 });
    const nameInput = screen.getByLabelText(/имя/i);
    const emailInput = screen.getByLabelText(/электронная почта/i);
    const phoneInput = screen.getByLabelText(/телефон/i);
    const passwordInput = screen.getByLabelText(/пароль/i);

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(phoneInput, { target: { value: '12345678901' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /зарегистрироваться/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('http://localhost:8081/register', {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '12345678901',
        password: 'password123',
      }, { withCredentials: true });
    });
    expect(window.location.pathname).toBe('/'); // Проверка перенаправления на главную страницу
  });

  test('displays error message on unsuccessful registration', async () => {
    // Настройка мока для неуспешной регистрации
    axios.post.mockRejectedValueOnce({ response: { data: { error: 'Ошибка регистрации' } } });
    const nameInput = screen.getByLabelText(/имя/i);
    const emailInput = screen.getByLabelText(/электронная почта/i);
    const phoneInput = screen.getByLabelText(/телефон/i);
    const passwordInput = screen.getByLabelText(/пароль/i);

    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });
    fireEvent.change(phoneInput, { target: { value: '09876543210' } });
    fireEvent.change(passwordInput, { target: { value: 'mypassword' } });

    fireEvent.click(screen.getByRole('button', { name: /зарегистрироваться/i }));

    expect(await screen.findByText(/ошибка регистрации/i)).toBeInTheDocument(); // Проверка сообщения об ошибке
  });
});
