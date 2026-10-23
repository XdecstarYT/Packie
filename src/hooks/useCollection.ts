import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CardInstance } from '@/lib/types'

export function useInstances(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['instances', ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<CardInstance[]> => {
      const { data, error } = await supabase
        .from('card_instances')
        .select('*')
        .eq('owner_id', ownerId!)
        .order('acquired_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}
