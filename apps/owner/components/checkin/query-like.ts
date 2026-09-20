/**
 * Structural subset of a react-query result that the hub sections consume.
 * Decouples the components from the exact generated hook return types while
 * staying assignable from `UseQueryResult`.
 */
export interface QueryLike<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}
