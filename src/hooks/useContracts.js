import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'
import { queryKeys } from '../lib/queryClient'

// Fetch all contracts for the current user
export function useContracts() {
  const { isAuthenticated, authFetch } = useAuth()

  return useQuery({
    queryKey: queryKeys.contracts,
    queryFn: async () => {
      const response = await authFetch(`${API_URL}/api/contracts`)
      if (!response.ok) {
        throw new Error('Failed to fetch contracts')
      }
      const data = await response.json()
      return data.contracts || []
    },
    // Only fetch if authenticated
    enabled: isAuthenticated,
    // Contracts don't change often, keep fresh for 1 minute
    staleTime: 60 * 1000,
  })
}

// Fetch a single contract by ID
export function useContract(id) {
  const { isAuthenticated, authFetch } = useAuth()

  return useQuery({
    queryKey: queryKeys.contract(id),
    queryFn: async () => {
      const response = await authFetch(`${API_URL}/api/contracts/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch contract')
      }
      const data = await response.json()
      return data.contract
    },
    enabled: isAuthenticated && !!id,
  })
}

// Save a new contract
export function useSaveContract() {
  const { authFetch } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (contractData) => {
      const response = await authFetch(`${API_URL}/api/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractData),
      })
      if (!response.ok) {
        throw new Error('Failed to save contract')
      }
      return response.json()
    },
    onSuccess: () => {
      // Invalidate contracts cache to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts })
    },
  })
}

// Delete a contract
export function useDeleteContract() {
  const { authFetch } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const response = await authFetch(`${API_URL}/api/contracts/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete contract')
      }
      return response.json()
    },
    onSuccess: () => {
      // Invalidate contracts cache to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts })
    },
  })
}
