import { detailCatalog } from '../../../server/catalog';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ params }) =>
  detailCatalog('movie', params.id);
