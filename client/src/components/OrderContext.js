import React, { createContext, useState, useContext } from 'react';

// Создаем контекст
const OrderContext = createContext();

// Провайдер контекста
const OrderProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [tax, setTax] = useState(0);

    // Очистка корзины
    const clearCart = () => {
        setCartItems([]);
    };

    // Добавление товара в корзину
    const addToCart = (item) => {
        setCartItems([...cartItems, item]);
    };

    // Установка итоговой стоимости и налога
    const updateTotals = (amount, taxAmount) => {
        setTotalAmount(amount);
        setTax(taxAmount);
    };

    return (
        <OrderContext.Provider value={{ cartItems, addToCart, clearCart, totalAmount, tax, updateTotals }}>
            {children}
        </OrderContext.Provider>
    );
};

// Хук для использования контекста
const useOrder = () => {
    const context = useContext(OrderContext);
    if (!context) {
        throw new Error('useOrder must be used within an OrderProvider');
    }
    return context;
};

export { OrderProvider, useOrder };
