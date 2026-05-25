/** Untyped Supabase access for model_pipeline_configs (table may be absent from generated types). */

export type ModelPipelineConfigRow = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  config: Record<string, unknown>
  updated_at?: string
}

type UntypedQueryResult<T> = { data: T[] | null; error: { message: string } | null }

type UntypedQuery<T> = PromiseLike<UntypedQueryResult<T>> & {
  select: (cols: string) => UntypedQuery<T>
  insert: (values: Record<string, unknown>) => UntypedQuery<T>
  update: (values: Record<string, unknown>) => UntypedQuery<T>
  order: (col: string, opts: { ascending: boolean }) => UntypedQuery<T>
  eq: (col: string, val: string | boolean) => UntypedQuery<T>
  neq: (col: string, val: string) => UntypedQuery<T>
  single: () => Promise<{ data: T | null; error: { message: string } | null }>
  maybeSingle: () => Promise<{ data: T | null; error: { message: string } | null }>
}

export function asModelPipelineDb(supabase: unknown) {
  return supabase as {
    from: <T = ModelPipelineConfigRow>(table: string) => UntypedQuery<T>
  }
}
