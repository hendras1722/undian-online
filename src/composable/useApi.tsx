import { ToasterProps } from '@/components/ui/sonner'
import api from '@/utils/axios'
import { useQueryEvents } from '@/utils/useQueryEvent'
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
  QueryClient,
} from '@tanstack/react-query'
import React from 'react'
import { toast } from 'sonner'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

type ApiOptions<TResponse, TBody = unknown> = {
  url: string
  method?: HttpMethod
  body?: TBody
  queryKey?: readonly unknown[]
  enabled?: boolean
  autoRefetchOnWindowFocus?: boolean
  staleTime?: number
  onSuccess?: (data: {data: TResponse, queryClient: QueryClient}) => void
  onError?: (error: Error) => void
  NotifySuccess?: boolean
  NotifyError?: boolean
  params?: Record<string, any>
}

function urlToQueryKey(url: string): string[] {
  const [pathname, search] = url.split('?')
  return search ? [pathname, search] : [pathname]
}

export function useApi<TResponse, TBody = unknown>(
  options: ApiOptions<TResponse, TBody>
): TBody extends undefined
  ? UseQueryResult<TResponse, Error>
  : UseMutationResult<TResponse, Error, TBody> {
  const {
    url,
    method = 'GET',
    body,
    queryKey,
    enabled = true,
    autoRefetchOnWindowFocus = false,
    staleTime = 0,
    NotifySuccess = false,
    NotifyError = false,
    params,
  } = options

  const queryClient = useQueryClient()
  const key = queryKey || urlToQueryKey(url)

  const queryResult = useQuery<TResponse, Error>({
    queryKey: key,
    queryFn: async () => {
      const res = await api.get(url, {
        params: params,
      })
      return res.data
    },
    enabled: enabled && method === 'GET',
    staleTime,
    refetchOnWindowFocus: autoRefetchOnWindowFocus,
  })

  const queryGet = useQueryEvents(queryResult, {
    onSuccess: (data) => {
      console.log('✅ success:', data)
      if (NotifySuccess)
        toast.success('Data fetched successfully', {
          description: 'Data fetched successfully',
          position: 'top-right',
          duration: 3000,
          richColors: true,
        })
      options.onSuccess?.({ data, queryClient})
    },
    onError: (error) => {
      console.error('❌ error:', error)
      if (NotifyError)
        toast.error(error?.message || 'Something went wrong', {
          description: error?.message || 'Something went wrong',
          position: 'top-right',
          duration: 3000,
          richColors: true,
        })
      options.onError?.(error)
    },
  })

  const mutationResult = useMutation<TResponse, Error, TBody>({
    mutationFn: async (data) => {
      const payload = data ?? body
      switch (method) {
        case 'POST':
          return (await api.post(url, payload)).data
        case 'PUT':
          return (await api.put(url, payload)).data
        case 'PATCH':
          return (await api.patch(url, payload)).data
        case 'DELETE':
          return (await api.delete(url)).data
        default:
          throw new Error(`Unsupported method: ${method}`)
      }
    },
    onSuccess: (data) => {
      options.onSuccess?.({ data, queryClient })
      queryClient.invalidateQueries({ queryKey: key })
    },
    onError: (error: Error) => {
      options.onError?.(error)
    },
  })

  return (method === 'GET' ? queryGet : mutationResult) as any
}
