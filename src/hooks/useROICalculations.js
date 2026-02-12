import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'
import { queryKeys } from '../lib/queryClient'

// Fetch all ROI calculations for the current user
export function useROICalculations() {
  const { isAuthenticated, authFetch } = useAuth()

  return useQuery({
    queryKey: queryKeys.roiCalculations,
    queryFn: async () => {
      const response = await authFetch(`${API_URL}/api/roi-calculations`)
      if (!response.ok) {
        // Return empty array for 404 (no table yet or no data)
        if (response.status === 404) {
          return []
        }
        throw new Error('Unable to load saved calculations. Please try again later.')
      }
      const data = await response.json()
      return data.calculations || []
    },
    // Only fetch if authenticated
    enabled: isAuthenticated,
    // Calculations don't change often, keep fresh for 1 minute
    staleTime: 60 * 1000,
    // Retry once, then give up
    retry: 1,
  })
}

// Fetch a single ROI calculation by ID
export function useROICalculation(id) {
  const { isAuthenticated, authFetch } = useAuth()

  return useQuery({
    queryKey: queryKeys.roiCalculation(id),
    queryFn: async () => {
      const response = await authFetch(`${API_URL}/api/roi-calculations/${id}`)
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error('Unable to load calculation details.')
      }
      const data = await response.json()
      return data.calculation
    },
    enabled: isAuthenticated && !!id,
    retry: 1,
  })
}

// Save a new ROI calculation
export function useSaveROICalculation() {
  const { authFetch } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (calculationData) => {
      const response = await authFetch(`${API_URL}/api/roi-calculations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calculationData),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Unable to save calculation. Please try again.')
      }
      return response.json()
    },
    onSuccess: () => {
      // Invalidate calculations cache to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.roiCalculations })
    },
  })
}

// Delete an ROI calculation
export function useDeleteROICalculation() {
  const { authFetch } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const response = await authFetch(`${API_URL}/api/roi-calculations/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Unable to delete calculation. Please try again.')
      }
      return response.json()
    },
    onSuccess: () => {
      // Invalidate calculations cache to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.roiCalculations })
    },
  })
}
