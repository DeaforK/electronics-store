import Breadcrumbs from "../../components/Layout/Breadcrumbs"
import CategoryTree from "../../components/CategoryTree"
import Footer from "../../components/Layout/Footer"
import Header from "../../components/Layout/Header";


function CatalogIndex(){
    return (
        <>
        <Header />
        <Breadcrumbs />
        <CategoryTree />
        <Footer />
        </>
    )
}
export default CatalogIndex