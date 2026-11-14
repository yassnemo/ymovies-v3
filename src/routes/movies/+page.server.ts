import { browseCatalog } from '../../server/catalog';
export const load = ({ url }: { url: URL }) => browseCatalog('movie', url);
