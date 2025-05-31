module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['@testing-library/jest-dom'],
    transform: {
      '^.+\\.jsx?$': 'babel-jest', // Добавляем настройку для использования babel-jest
    },
  };
  