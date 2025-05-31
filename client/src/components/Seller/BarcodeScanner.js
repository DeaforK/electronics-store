import React, { useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

const BarcodeScanner = ({ onDetected }) => {
  const videoRef = useRef(null);
  const codeReader = useRef(new BrowserMultiFormatReader());
  const streamRef = useRef(null); // Для ручной остановки потока

  useEffect(() => {
    let selectedDeviceId;

    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        if (videoDevices.length === 0) {
          throw new Error('Нет доступных камер');
        }

        selectedDeviceId = videoDevices[0].deviceId;

        codeReader.current.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, err, controls) => {
            if (result) {
              onDetected(result.getText());
              controls.stop(); // остановка декодирования после одного скана
            }
          }
        );
      })
      .catch((err) => {
        console.error('Ошибка при подключении камеры:', err);
      });

    return () => {
      // Отключение видеопотока при размонтировании
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [onDetected]);

  return (
    <video
      ref={videoRef}
      style={{ width: '100%', maxWidth: '400px', borderRadius: '8px' }}
      muted
      autoPlay
    />
  );
};

export default BarcodeScanner;
