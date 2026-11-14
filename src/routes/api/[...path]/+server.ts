import type { RequestHandler } from './$types';
import { handleApi } from '../../../server/api';
const handle: RequestHandler = ({ request }) => handleApi(request);
export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE
};
