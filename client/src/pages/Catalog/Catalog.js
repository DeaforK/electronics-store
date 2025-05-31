import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from 'axios';
import Breadcrumbs from "../../components/Layout/Breadcrumbs";
import CatalogMain from "../../components/CatalogMain";
import Footer from "../../components/Layout/Footer";
import Header from "../../components/Layout/Header";
import PromotionBanner from "../../components/PromotionBanner"; 

function Catalog() {
    const { id, promotion_id } = useParams();
    const [promotion, setPromotion] = useState(null);

    useEffect(() => {
        const fetchPromotion = async () => {
            if (promotion_id) {
                try {
                    const res = await axios.get(`http://localhost:8081/promotions/${promotion_id}`);
                    setPromotion(res.data);
                } catch (err) {
                    console.error("Ошибка при загрузке акции:", err);
                }
            } else setPromotion(null)
        };
        fetchPromotion();
    }, [promotion_id]);

    return (
        <>
            <Header />
            <Breadcrumbs />
            {promotion_id && <PromotionBanner promotion={promotion?.promotion} />}
            <CatalogMain promotion={promotion} categoryId={id} />
            <Footer />
        </>
    );
}

export default Catalog;
