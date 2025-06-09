// src/pages/Home.tsx
import InputForm from "../components/InputForm";
import MainList from "../components/MainList";
import SideList from "../components/SideList";
import StatsPanel from "../components/StatsPanel";


export default function Home() {
    const total = 15250; // o el valor calculado dinámicamente

    const handleFinishSale = () => {
        console.log("Venta finalizada");
        // puedes agregar lógica para limpiar el carrito, enviar datos, etc.
    };
    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Columna principal (2/3) */}
                <div className="md:col-span-2 space-y-4">
                    <InputForm title="Codigo de barra....."/>
                    <MainList />
                </div>

                {/* Columna secundaria (1/3) */}
                <div className="md:col-span-1 space-y-4">
                    <InputForm title="Buscar producto"/>
                    <SideList />
                    <StatsPanel total={total} onFinish={handleFinishSale}/>
                </div>
            </div>
        </div>
    )
}

