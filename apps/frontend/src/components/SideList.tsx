import { useQuery } from "@tanstack/react-query"
import { getProducts } from "../services/productService"
import type { Product } from "../types/product"

interface Props {
  searchTerm: string
  onProductClick: (product: Product) => void
}

export default function SideList({ searchTerm, onProductClick }: Props) {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  })

  console.log(products)
  
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="ml-3 text-gray-600">Cargando productos...</p>
        </div>
      </div>
    )
  }

  // Usar array vacío si products no es array
  const filtered = Array.isArray(products)
    ? products.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  // Colores alternados tipo acuarela
  const watercolorBgs = [
    "bg-gradient-to-r from-blue-50 to-indigo-50",
    "bg-gradient-to-r from-purple-50 to-pink-50",
    "bg-gradient-to-r from-green-50 to-emerald-50",
    "bg-gradient-to-r from-yellow-50 to-orange-50",
    "bg-gradient-to-r from-rose-50 to-red-50",
    "bg-gradient-to-r from-cyan-50 to-teal-50",
  ]

  const watercolorHovers = [
    "hover:from-blue-100 hover:to-indigo-100",
    "hover:from-purple-100 hover:to-pink-100",
    "hover:from-green-100 hover:to-emerald-100",
    "hover:from-yellow-100 hover:to-orange-100",
    "hover:from-rose-100 hover:to-red-100",
    "hover:from-cyan-100 hover:to-teal-100",
  ]

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Productos {filtered && filtered.length > 0 && `(${filtered.length})`}
        </h3>
        {searchTerm && (
          <p className="text-sm text-gray-500">
            Filtrando por: <span className="font-medium text-gray-700">"{searchTerm}"</span>
          </p>
        )}
      </div>

      {!filtered || filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No se encontraron productos</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filtered.map((prod, index) => {
            const bgClass = watercolorBgs[index % watercolorBgs.length]
            const hoverClass = watercolorHovers[index % watercolorHovers.length]

            return (
              <div
                key={prod.id}
                className={`
                  ${bgClass} ${hoverClass}
                  p-4 rounded-lg border border-gray-200 cursor-pointer
                  transform transition-all duration-300 ease-in-out
                  hover:shadow-md hover:border-gray-300
                `}
                onClick={() => onProductClick(prod)}
              >
                <div className="flex flex-col space-y-2">
                  <h4 className="font-semibold text-gray-800 text-base leading-tight">{prod.name}</h4>

                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                      Código: <span className="font-mono ml-1">{prod.barCode}</span>
                    </span>

                    {/* Aqui va la cantidad */}
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                      {prod.inventories[0].quantity} unidades
                    </span>

                    <span className="flex items-center font-semibold text-gray-800">
                      <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>${prod.presentations[0].price}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
