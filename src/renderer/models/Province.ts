/**
 * Dominican Republic Provinces
 * All 32 provinces as specified in data-model.md
 */

import { z } from 'zod';

/**
 * All 32 provinces of the Dominican Republic
 */
export type DominicanRepublicProvince =
  | 'Azua'
  | 'Baoruco'
  | 'Barahona'
  | 'Dajabón'
  | 'Distrito Nacional'
  | 'Duarte'
  | 'Elías Piña'
  | 'El Seibo'
  | 'Espaillat'
  | 'Hato Mayor'
  | 'Hermanas Mirabal'
  | 'Independencia'
  | 'La Altagracia'
  | 'La Romana'
  | 'La Vega'
  | 'María Trinidad Sánchez'
  | 'Monseñor Nouel'
  | 'Monte Cristi'
  | 'Monte Plata'
  | 'Pedernales'
  | 'Peravia'
  | 'Puerto Plata'
  | 'Samaná'
  | 'San Cristóbal'
  | 'San José de Ocoa'
  | 'San Juan'
  | 'San Pedro de Macorís'
  | 'Sánchez Ramírez'
  | 'Santiago'
  | 'Santiago Rodríguez'
  | 'Santo Domingo'
  | 'Valverde';

/**
 * Array of all provinces (for dropdowns, etc.)
 */
export const ALL_PROVINCES: readonly DominicanRepublicProvince[] = [
  'Azua',
  'Baoruco',
  'Barahona',
  'Dajabón',
  'Distrito Nacional',
  'Duarte',
  'Elías Piña',
  'El Seibo',
  'Espaillat',
  'Hato Mayor',
  'Hermanas Mirabal',
  'Independencia',
  'La Altagracia',
  'La Romana',
  'La Vega',
  'María Trinidad Sánchez',
  'Monseñor Nouel',
  'Monte Cristi',
  'Monte Plata',
  'Pedernales',
  'Peravia',
  'Puerto Plata',
  'Samaná',
  'San Cristóbal',
  'San José de Ocoa',
  'San Juan',
  'San Pedro de Macorís',
  'Sánchez Ramírez',
  'Santiago',
  'Santiago Rodríguez',
  'Santo Domingo',
  'Valverde',
] as const;

/**
 * Zod schema for province validation
 */
export const ProvinceSchema = z.enum([
  'Azua',
  'Baoruco',
  'Barahona',
  'Dajabón',
  'Distrito Nacional',
  'Duarte',
  'Elías Piña',
  'El Seibo',
  'Espaillat',
  'Hato Mayor',
  'Hermanas Mirabal',
  'Independencia',
  'La Altagracia',
  'La Romana',
  'La Vega',
  'María Trinidad Sánchez',
  'Monseñor Nouel',
  'Monte Cristi',
  'Monte Plata',
  'Pedernales',
  'Peravia',
  'Puerto Plata',
  'Samaná',
  'San Cristóbal',
  'San José de Ocoa',
  'San Juan',
  'San Pedro de Macorís',
  'Sánchez Ramírez',
  'Santiago',
  'Santiago Rodríguez',
  'Santo Domingo',
  'Valverde',
]);

/**
 * Validate province string
 */
export function validateProvince(province: unknown): DominicanRepublicProvince {
  return ProvinceSchema.parse(province);
}

/**
 * Check if a string is a valid province
 */
export function isValidProvince(province: string): province is DominicanRepublicProvince {
  return ALL_PROVINCES.includes(province as DominicanRepublicProvince);
}
