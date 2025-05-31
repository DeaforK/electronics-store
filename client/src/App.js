import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Auth/Login';
import Home from './pages/HomePage';
import Register from './pages/Auth/Register';
import AdminPage from './pages/Admin/AdminPage';
import AddProductPage from "./pages/Admin/AddProductPage";
import ProductsPage from './pages/Admin/ProductsPage';
import ProductEditPage from './pages/Admin/ProductEditPage';
import ProductVariationsPage from './pages/Admin/ProductVariationsPage';
import AddVariationPage from './pages/Admin/AddVariationPage';
import EditVariationPage from './pages/Admin/EditVariationPage';
import ProductPage from './pages/ProductPage';
import Favorites from './pages/FavoritePage';
import Cart from './pages/CartPage';
import OrderPage from './pages/OrderPage';
import UserProfile from './pages/ProfilePage';
import Catalog from './pages/Catalog/Catalog';
import CatalogIndex from './pages/Catalog/CatalogIndex';
import { OrderProvider } from './components/OrderContext'; // Импортируйте OrderProvider
import AdminCategories from './pages/Admin/CategoriesPage';
import DeliveryMethods from './pages/Admin/DeliveryMethodsPage';
import OrdersPage from './pages/Admin/OrdersPage';
import TestPage from './pages/TestPage';
import CourierPage from './pages/Courier/CourierPage';
import WarehousePage from './pages/Admin/WarehousePage';
import CourierProductsPage from './pages/Courier/ProductsPage';
import CourierOrdersPage from './pages/Courier/CourierOrdersPage';
import StatisticsPage from './pages/Courier/CourierStatisticsPage';
import ReportsPage from './pages/Admin/AdminStatisticsPage';
import ActivityLogPage from './pages/Admin/ActivityLogPage';
import BannerPage from './pages/Admin/BannerPage';
import SellerPage from './pages/Seller/SellerPage';
import SellerStockPage from './pages/Seller/SellerStockPage';
import SellerCheckProductPage from './pages/Seller/SellerCheckProductPage';
import AdminPromotionsPage from './pages/Admin/PromotionsPage';
import CampaignsPage from './pages/PromotionsPage';
import PromotionIdPage from './pages/PromotionIdPage';
import AdminUsersPage from './pages/Admin/UsersPage';
import ProfileInfoPage from './pages/ProfileInfoPage';
import WarehouseTasksPage from './pages/Seller/WarehouseTaskPage';
import CourierTasksPage from './pages/Courier/WarehouseTaskPage';
import CourierAssignedOrdersPage from './pages/Courier/CourierAssignedOrdersPage';
import OrderDeliveryPage from './pages/Seller/OrderDeliveryPage';
import ActivityLogSellerPage from './pages/Seller/ActivityLogSellerPage';

function App() {
    return (
        <OrderProvider> {/* Оборачиваем маршруты в OrderProvider */}
            <Router>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path='/admin' element={<AdminPage />} />
                    <Route path="/admin/products" element={<ProductsPage />} />
                    <Route path="/admin/products/:id" element={<ProductEditPage />} />
                    <Route path="/admin/products/new" element={<ProductEditPage />} />
                    <Route path="/admin/orders" element={<OrdersPage />} />
                    <Route path="/admin/categories" element={<AdminCategories />} />
                    <Route path="/admin/delivery-methods" element={<DeliveryMethods />} />
                    <Route path="/admin/products/add" element={<AddProductPage />} />
                    <Route path="/admin/products/variations/:id" element={<ProductVariationsPage />} />
                    <Route path="/admin/products/variations/add" element={<AddVariationPage />} />
                    <Route path="/admin/products/variations/edit/:id" element={<EditVariationPage />} />
                    <Route path='/admin/dashboard' element={<ReportsPage />} />
                    <Route path='/admin/activityLog' element={<ActivityLogPage />} />
                    <Route path='/admin/warehouse' element={<WarehousePage />} />
                    <Route path='/admin/banner' element={<BannerPage />} />
                    <Route path='/admin/promotion' element={<AdminPromotionsPage />} />
                    <Route path='/admin/users' element={<AdminUsersPage />} />
                    <Route path="/seller" element={<SellerPage />} />
                    <Route path="/seller/stock-in" element={<SellerStockPage />} />
                    <Route path="/seller/stock-out" element={<OrderDeliveryPage />} />
                    <Route path="/seller/stock-check" element={<SellerCheckProductPage />} />
                    <Route path="/seller/movements" element={<ActivityLogSellerPage />} />
                    <Route path="/seller/warehouse-task" element={<WarehouseTasksPage />} />
                    <Route path='/products/:id' element={<ProductPage />} />
                    <Route path='/favorite' element={<Favorites />} />
                    <Route path='/cart' element={<Cart />} />
                    <Route path='/checkout' element={<OrderPage />} />
                    <Route path='/profile' element={<UserProfile />} />
                    <Route path='/profile/info' element={<ProfileInfoPage />} />
                    <Route path='/catalog' element={<CatalogIndex />} />
                    <Route path='/catalog/:id' element={<Catalog />} /> {/*Страница с отображением катологов категории*/}
                    <Route path='/promotions' element={<CampaignsPage />} />  {/*Страница со всеми акциями*/}
                    <Route path="/catalog/promotion/:promotion_id" element={<Catalog />} /> {/* Каталог с акцией */}
                    <Route path='/test' element={<TestPage />} />
                    <Route path='/courier' element={<CourierPage />} />
                    <Route path='/courier/products' element={<CourierProductsPage />} />
                    <Route path='/courier/orders' element={<CourierOrdersPage />} />
                    <Route path='/courier/assigned-orders' element={<CourierAssignedOrdersPage />} />
                    <Route path='/courier/tasks' element={<CourierTasksPage />} />
                    <Route path='/courier/dashboard' element={<StatisticsPage />} />
                </Routes>
            </Router>
        </OrderProvider>
    );
}

export default App;
