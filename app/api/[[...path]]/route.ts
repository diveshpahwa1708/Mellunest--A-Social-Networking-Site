import {env} from 'cloudflare:workers';
import {handle} from '../../../backend/api/handler';
export const dynamic='force-dynamic';
export const GET=(r:Request)=>handle(r,env as any);
export const POST=GET;
export const PATCH=GET;
export const DELETE=GET;
