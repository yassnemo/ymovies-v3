import { detailCatalog } from '../../../server/catalog';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ params }) =>
  detailCatalog('tv', params.id);
