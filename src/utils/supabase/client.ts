// Bu dosya geçici olarak boş bırakılmıştır
// Tüm Supabase referansları Prisma'ya migrate edilecek
export const createClient = () => {
  const createQueryChain = () => {
    const queryChain = {
      select: () => queryChain,
      insert: () => queryChain,
      update: () => queryChain,
      delete: () => queryChain,
      eq: () => queryChain,
      in: () => queryChain,
      order: () => queryChain,
      range: () => queryChain,
      limit: () => queryChain,
      single: () => ({ data: null, error: 'Supabase kullanımdan kaldırıldı' }),
      filter: () => queryChain,
      match: () => queryChain,
      ilike: () => queryChain,
      gte: () => queryChain,
      lte: () => queryChain,
      gt: () => queryChain,
      lt: () => queryChain,
      not: () => queryChain,
      is: () => queryChain,
      contains: () => queryChain,
      count: () => queryChain,
      maybeSingle: () => ({ data: null, error: 'Supabase kullanımdan kaldırıldı' }),
      head: () => ({ data: null, error: 'Supabase kullanımdan kaldırıldı' }),
      neq: () => queryChain,
      overlaps: () => queryChain,
      textSearch: () => queryChain,
      adjacent: () => queryChain,
      or: () => queryChain,
      and: () => queryChain,
      csv: () => ({ data: null, error: 'Supabase kullanımdan kaldırıldı' }),
      explain: () => ({ data: null, error: 'Supabase kullanımdan kaldırıldı' }),
      abortSignal: () => queryChain,
      throwOnError: () => queryChain,
      then: () => Promise.resolve({ data: null, error: 'Supabase kullanımdan kaldırıldı' }),
      catch: () => Promise.resolve({ data: null, error: 'Supabase kullanımdan kaldırıldı' }),
      finally: () => Promise.resolve({ data: null, error: 'Supabase kullanımdan kaldırıldı' }),
    }
    return queryChain
  }

  return {
    from: () => createQueryChain(),
    rpc: () => ({ data: null, error: 'Supabase kullanımdan kaldırıldı' }),
    storage: {
      from: () => ({
        upload: () => ({ data: null, error: 'Supabase kullanımdan kaldırıldı' }),
        download: () => ({ data: null, error: 'Supabase kullanımdan kaldırıldı' }),
        remove: () => ({ data: null, error: 'Supabase kullanımdan kaldırıldı' }),
        list: () => ({ data: null, error: 'Supabase kullanımdan kaldırıldı' }),
        getPublicUrl: () => ({ data: { publicUrl: '' }, error: 'Supabase kullanımdan kaldırıldı' }),
        createSignedUrl: () => ({ data: { signedUrl: '' }, error: 'Supabase kullanımdan kaldırıldı' }),
        createSignedUrls: () => ({ data: [], error: 'Supabase kullanımdan kaldırıldı' }),
      })
    }
  }
}