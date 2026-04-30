import type { Database } from '@/shared/api/supabase/types';

type Tables = Database['public']['Tables'];

export type IngredientMaster = Tables['ingredient_master']['Row'];
export type UserIngredient = Tables['user_ingredients']['Row'];
export type StorageLocation = Tables['storage_locations']['Row'];
export type IngredientCategory = Tables['ingredient_categories']['Row'];

export type UserIngredientInsert = Tables['user_ingredients']['Insert'];
export type UserIngredientUpdate = Tables['user_ingredients']['Update'];

export type StorageKind = Database['public']['Enums']['storage_kind'];
