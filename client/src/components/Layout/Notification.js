import React from 'react';
import { Alert } from 'react-bootstrap';

const Notification = ({ message, type = 'success', onDismiss }) => {
    const notificationStyles = {
        position: 'fixed',
        top: 20,
        right: '20px',  // Можно подкорректировать для наилучшего размещения
        zIndex: 1060,   // Устанавливаем zIndex больше, чем у модальных окон
        width: 'auto',
        minWidth: '300px',
        boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        overflow: 'hidden',
    };

    return (
        <div style={notificationStyles}>
            <Alert variant={type} onClose={onDismiss} dismissible>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{message}</div>
            </Alert>
        </div>
    );
};

export default Notification;
