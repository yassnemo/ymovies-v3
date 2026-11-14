import type { RequestHandler } from './$types';
import { tmdb } from '../../../../server/catalog';
import { tmdbResponse } from '../../../../server/tmdb-endpoint';
export const GET: RequestHandler = ({ request }) => tmdbResponse(request, tmdb);
