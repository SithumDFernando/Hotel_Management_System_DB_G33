// =============================================================================
// frontend/src/hooks/useFetch.js
// =============================================================================
// Purpose:
//   A generic data-fetching hook that wraps any async API function call and
//   manages the loading / error / data lifecycle. Reduces boilerplate in page
//   components that would otherwise repeat useState + useEffect patterns.
//
// What to implement here:
//   import { useState, useEffect } from 'react';
//
//   /**
//    * Executes an async fetcher function and returns its state.
//    *
//    * @param {Function} fetcher - An async function (e.g. () => getRooms({ branch_id }))
//    * @param {Array}    deps    - Dependency array that re-triggers the fetch when changed
//    * @returns {{ data, isLoading, error, refetch }}
//    *
//    * Example:
//    *   const { data: rooms, isLoading, error } = useFetch(
//    *     () => getRooms({ status: 'Available' }),
//    *     [branch]  // refetch whenever branch changes
//    *   );
//    */
//   export function useFetch(fetcher, deps = []) {
//     const [data, setData]         = useState(null);
//     const [isLoading, setLoading] = useState(true);
//     const [error, setError]       = useState(null);
//
//     const execute = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const result = await fetcher();
//         setData(result);
//       } catch (err) {
//         setError(err?.response?.data?.detail || err.message || 'Unknown error');
//       } finally {
//         setLoading(false);
//       }
//     };
//
//     useEffect(() => { execute(); }, deps);  // eslint-disable-line react-hooks/exhaustive-deps
//
//     return { data, isLoading, error, refetch: execute };
//   }
//
// Usage notes:
//   - Use the `refetch` function to manually re-trigger after a mutation
//     (e.g. after check-in, call refetch() to refresh the bookings list).
//   - Do NOT pass the fetcher function itself as a dependency — always wrap
//     it in an arrow function to avoid infinite re-render loops.
//
// Dependencies:
//   - react (useState, useEffect)
// =============================================================================

// TODO: Implement useFetch.js
