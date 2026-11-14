import { searchCatalog } from '../../server/catalog';
export const load = ({ url }: { url: URL }) => searchCatalog(url);
