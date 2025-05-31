import React, { useState, useEffect } from "react";
import axios from "axios";
import { YMaps, Map, Placemark } from "@pbe/react-yandex-maps";
import { Button, ListGroup, Form, InputGroup, Card, Modal, Breadcrumb, Alert, Collapse } from "react-bootstrap";
import { FaArrowLeft } from "react-icons/fa";
import Header from "../../components/Layout/Header";
import Footer from "../../components/Layout/Footer";
import Loader from "../../components/Layout/Loader";
import BarcodeScanner from "../../components/Seller/BarcodeScanner";
import { useNavigate } from 'react-router-dom';

export default function SellerCheckProductPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [filteredWarehouses, setFilteredWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [warehouseProducts, setWarehouseProducts] = useState([]);
  const [barcode, setBarcode] = useState("");
  const [notification, setNotification] = useState({ message: "", type: "" });
  const [loading, setLoading] = useState(true);

  const [scannerVisible, setScannerVisible] = useState(false);

  // Для модального распределения
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferData, setTransferData] = useState({
    variationId: "",
    fromWarehouse: "",
    remainingQty: 0,
    targetWarehouse: "",
    qtyToMove: "",
  });

  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const userResponse = await axios.get('http://localhost:8081/seller', { withCredentials: true });

        if (userResponse.data.user.role === 'seller') {
          setUserId(userResponse.data.user.userId)
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Ошибка при проверке роли продавца-приёмщика:', error);
        navigate('/login');
      }
    };
    checkAccess();
    fetchWarehouses();
  }, []);

  // Загрузка всех складов/магазинов
  async function fetchWarehouses() {
    try {
      const res = await axios.get("http://localhost:8081/warehouses", {
        withCredentials: true,
      });
      setWarehouses(res.data);
      setFilteredWarehouses(res.data);
    } catch (err) {
      console.error(err);
      notify("Ошибка загрузки складов", "danger");
    } finally {
      setLoading(false);
    }
  }

  async function handleWarehouseSelect(warehouse) {
    setSelectedWarehouse(warehouse);

    try {
      const res = await axios.get(
        `http://localhost:8081/warehouseInventory/warehouse/${warehouse._id}`,
        { withCredentials: true }
      );

      // Для каждой записи получаем вложенный товар (если его нет в product_id)
      const updatedProducts = await Promise.all(
        res.data.map(async (item) => {
          const variation = item.product_id;

          // Если вложенный product_id — просто ObjectId, загружаем товар
          if (typeof variation.product_id === 'string') {
            try {
              const productRes = await axios.get(
                `http://localhost:8081/products/${variation.product_id}`,
                { withCredentials: true }
              );

              // Добавляем поле productInfo внутрь вариации
              return {
                ...item,
                product_id: {
                  ...variation,
                  product_info: productRes.data
                }
              };
            } catch (err) {
              console.warn('Ошибка загрузки товара по ID:', variation.product_id);
              return item; // Возвращаем без товара
            }
          }

          // Если товар уже вложен, возвращаем как есть
          return item;
        })
      );

      console.log(updatedProducts)

      setWarehouseProducts(updatedProducts);
    } catch (err) {
      console.error(err);
      notify("Ошибка загрузки товаров склада", "danger");
    }
  }

  const handleDetected = async (scannedBarcode) => {
    setBarcode(scannedBarcode);
    await handleCheck(scannedBarcode);
  };

  const resetSearch = () => {
    setBarcode('');
    setFilteredWarehouses(warehouses);
    setSelectedWarehouse(null);
    setWarehouseProducts([]);
    notify("Поиск сброшен", "secondary");
  };

  // Поиск по штрихкоду — оставляем только склады, где есть эта вариация
  const handleCheck = async (code) => {
    setBarcode(code);
    if (!code) {
      setFilteredWarehouses(warehouses);
      setSelectedWarehouse(null);
      setWarehouseProducts([]);
      return;
    }
    try {
      const { data: variation } = await axios.get(
        `http://localhost:8081/product-variations/scan/barcode/${code}`,
        { withCredentials: true }
      );
      if (!variation) {
        notify("Вариация не найдена", "danger");
        return;
      }
      // получить все склады, где она есть
      const { data: invs } = await axios.get(
        `http://localhost:8081/warehouseInventory/by-variation/${variation._id}`,
        { withCredentials: true }
      );
      const whIds = new Set(invs.map((i) => i.warehouse_id._id.toString()));
      const filtered = warehouses.filter((w) =>
        whIds.has(w._id.toString())
      );
      setFilteredWarehouses(filtered);
      setSelectedWarehouse(null);
      setWarehouseProducts([]);
    } catch {
      notify("Ошибка поиска по штрихкоду", "danger");
    }
  };

  // Открыть модалку переноса
  function openTransfer(variationId, availableQty) {
    setTransferData({
      variationId,
      fromWarehouse: selectedWarehouse._id,
      remainingQty: availableQty,
      targetWarehouse: "",
      qtyToMove: "",
    });
    setShowTransfer(true);
  }

  // Выполнить перенос
  async function doTransfer() {
    const { variationId, fromWarehouse, targetWarehouse, qtyToMove } =
      transferData;
    if (!targetWarehouse || !qtyToMove) {
      notify("Выберите склад и введите количество", "danger");
      return;
    }
    if (+qtyToMove > transferData.remainingQty) {
      notify("Количество превышает доступное", "danger");
      return;
    }
    console.log(variationId._id, fromWarehouse, targetWarehouse, +qtyToMove)
    try {
      await axios.post(
        "http://localhost:8081/warehouseInventory/transfer",
        {
          product_id: variationId,
          from_warehouse_id: fromWarehouse,
          to_warehouse_id: targetWarehouse,
          quantity: +qtyToMove,
          user_id: userId,
        },
        { withCredentials: true }
      );
      notify("Перенос выполнен", "success");
      setShowTransfer(false);
      handleWarehouseSelect(selectedWarehouse);
    } catch {
      notify("Ошибка при переносе", "danger");
    }
  }

  function notify(message, type = "success") {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
  }

  if (loading) return <Loader />;

  return (
    <>
      <Header />
      <div className="container-fluid mt-4">
        <div className="row">
          {/* Левая колонка: поиск и список складов */}
          <div className="col-md-4">
            <Button variant="link" onClick={() => navigate('/seller')} className="me-2">
              <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} />
            </Button>
            <h4>Склады и магазины</h4>

            <InputGroup className="mb-3">
              <Form.Control
                placeholder="Штрихкод"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") await handleCheck(barcode);
                }}
              />
              <Button
                variant="outline-secondary"
                onClick={() => handleCheck(barcode)}
              >
                Проверить
              </Button>
              {barcode && (
                <Button variant="outline-danger" onClick={resetSearch}>
                  ✕
                </Button>
              )}
            </InputGroup>

            <div className="mb-2 d-flex justify-content-between align-items-center">
              <Button
                variant="outline-primary"
                onClick={() => setScannerVisible(!scannerVisible)}
                aria-controls="scanner-collapse"
                aria-expanded={scannerVisible}
              >
                {scannerVisible ? 'Скрыть сканер' : 'Показать сканер'}
              </Button>
            </div>

            <Collapse in={scannerVisible}>
              <div id="scanner-collapse" className="mb-3">
                <BarcodeScanner onDetected={handleDetected} />
              </div>
            </Collapse>

            {notification.message && (
              <Alert variant={notification.type}>{notification.message}</Alert>
            )}

            <ListGroup>
              {filteredWarehouses.map((w) => (
                <ListGroup.Item
                  key={w._id}
                  action
                  active={selectedWarehouse?._id === w._id}
                  onClick={() => handleWarehouseSelect(w)}
                >
                  {w.name} ({w.type})
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>

          {/* Правая колонка: карта и панель товаров */}
          <div className="col-md-8">
            <YMaps>
              <Map
                width="100%"
                height="400px"
                state={{
                  center: selectedWarehouse
                    ? [selectedWarehouse.location.latitude, selectedWarehouse.location.longitude]
                    : [52.2858, 104.3007],
                  zoom: 10,
                }}
                onClick={(e) => {
                  const coords = e.get("coords");
                  // поиск ближайшего склада по координатам
                  const wh = filteredWarehouses.find(
                    (w) =>
                      Math.abs(w.location.latitude - coords[0]) < 0.001 &&
                      Math.abs(w.location.longitude - coords[1]) < 0.001
                  );
                  if (wh) handleWarehouseSelect(wh);
                }}
              >
                {filteredWarehouses.map((w) => (
                  <Placemark
                    key={w._id}
                    geometry={[w.location.latitude, w.location.longitude]}
                    onClick={() => handleWarehouseSelect(w)}
                  />
                ))}
              </Map>
            </YMaps>

            {/* Список товаров на выбранном складе */}
            {selectedWarehouse && (
              <Card className="mt-3">
                <Card.Header>
                  Товары на складе: {selectedWarehouse.name}
                </Card.Header>
                <Card.Body>
                  {warehouseProducts.length === 0 ? (
                    <p>Нет товаров</p>
                  ) : (
                    <ListGroup>
                      {warehouseProducts.map((inv) => {
                        const variation = inv.product_id;
                        const product = variation.product_info || {};

                        return (
                          <ListGroup.Item
                            key={inv._id}
                            className="d-flex justify-content-between align-items-start flex-column"
                          >
                            <div className="w-100 mb-2">
                              <h6 className="mb-1">{product.name || "Без названия товара"}</h6>
                              <small className="text-muted">
                                {Object.entries(variation.attributes || {})
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(", ")}
                              </small>
                            </div>
                            <div className="w-100 d-flex justify-content-between align-items-center">
                              <div><strong>Количество:</strong> {inv.quantity} шт.</div>
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => openTransfer(variation, inv.quantity)}
                              >
                                Перенести
                              </Button>
                            </div>
                          </ListGroup.Item>
                        );
                      })}
                    </ListGroup>
                  )}
                </Card.Body>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Модалка переноса */}
      <Modal show={showTransfer} onHide={() => setShowTransfer(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Перенос товара</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>С остатком: {transferData.remainingQty} шт.</Form.Label>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Куда перенести</Form.Label>
            <Form.Select
              value={transferData.targetWarehouse}
              onChange={(e) =>
                setTransferData((d) => ({
                  ...d,
                  targetWarehouse: e.target.value,
                }))
              }
            >
              <option value="">Выберите склад (магазин)</option>
              {warehouses
                .filter((w) => w._id !== transferData.fromWarehouse)
                .map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Количество для переноса</Form.Label>
            <Form.Control
              type="number"
              min="1"
              max={transferData.remainingQty}
              value={transferData.qtyToMove}
              onChange={(e) =>
                setTransferData((d) => ({
                  ...d,
                  qtyToMove: e.target.value,
                }))
              }
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTransfer(false)}>
            Отмена
          </Button>
          <Button variant="primary" onClick={doTransfer}>
            Перенести
          </Button>
        </Modal.Footer>
      </Modal>

      <Footer />
    </>
  );
}
