import { error } from '@sveltejs/kit';
import { browseCatalog } from '../../../../server/catalog';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ url, params }) => {
  if (params.mediaType !== 'movie' && params.mediaType !== 'tv')
    error(404, 'Genre not found');
  return browseCatalog(params.mediaType, url, params.genre);
};
