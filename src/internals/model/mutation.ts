export interface MutationSpec<P, R> {
  mutate: (payload: P) => Promise<R>
}

export type Mutation<P, R> = ((payload: P) => Promise<R>) & {
  _mutationSpec: MutationSpec<P, R>
}

export function createMutation<P, R = void>(
  spec: MutationSpec<P, R>
): Mutation<P, R> {
  async function mutation(payload: P): Promise<R> {
    return await spec.mutate(payload)
  }
  mutation._mutationSpec = spec
  return mutation
}
