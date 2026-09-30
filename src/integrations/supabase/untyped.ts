// Typed escape hatch for database tables and RPCs that are not yet present in
// the auto-generated `types.ts` (e.g. objects added by later migrations such as
// `user_roles`, `set_employee_pin`, `verify_employee_pin`,
// `create_purchase_order_with_items`).
//
// Using a generic `SupabaseClient` (with the default `any`-schema) keeps calls
// runtime-identical to the previous `(supabase as any)` casts while avoiding the
// `@typescript-eslint/no-explicit-any` lint error. Prefer the fully-typed
// `supabase` client for anything that exists in `types.ts`.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const untypedSupabase = supabase as unknown as SupabaseClient;
