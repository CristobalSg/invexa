import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { ChevronDownIcon, PencilIcon, TrashIcon } from '@heroicons/react/20/solid'
import type { ReactNode } from "react";

interface ProductCardProps {
  name: string
  description: ReactNode
  onEdit: () => void
  onDelete: () => void
}

export const ProductCard: React.FC<ProductCardProps> = ({
  name,
  description,
  onEdit,
  onDelete
}) => {
  return (
    <div className="rounded-lg shadow-lg p-4 relative bg-white">
      <div className="flex justify-between items-start mb-1">
        <h3 className="text-lg font-semibold">{name}</h3>

        <Menu as="div" className="relative inline-block text-left">
          <MenuButton className="inline-flex justify-center rounded-md bg-black/20 px-2 py-1 text-sm font-medium text-white hover:bg-black/30 focus:outline-none">
            Opciones
            <ChevronDownIcon className="ml-2 h-5 w-5 text-white" aria-hidden="true" />
          </MenuButton>

          <MenuItems className="absolute right-0 z-10 mt-2 w-40 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
            <div className="px-1 py-1">
              <MenuItem>
                {({ active }) => (
                  <button
                    onClick={onEdit}
                    className={`${
                      active ? 'bg-violet-500 text-white' : 'text-gray-900'
                    } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                  >
                    <PencilIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                    Editar
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ active }) => (
                  <button
                    onClick={onDelete}
                    className={`${
                      active ? 'bg-violet-500 text-white' : 'text-gray-900'
                    } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                  >
                    <TrashIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                    Eliminar
                  </button>
                )}
              </MenuItem>
            </div>
          </MenuItems>
        </Menu>
      </div>

      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}
