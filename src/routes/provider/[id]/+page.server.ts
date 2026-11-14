import { error } from '@sveltejs/kit';
import { browseCatalog } from '../../../server/catalog';
import { providers } from '#lib/providers.ts';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ url, params }) => {
  const provider = providers.find((value) => value.id === Number(params.id));
  if (!provider) error(404, 'Provider not found');
  const target = new URL(url);
  target.searchParams.set('provider', params.id);
  const catalog = await browseCatalog(
    url.searchParams.get('type') === 'tv' ? 'tv' : 'movie',
    target
  );
  return { ...catalog, title: provider.name, provider };
};
