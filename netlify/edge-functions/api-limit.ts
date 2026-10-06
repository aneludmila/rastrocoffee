import type {Context,Config} from "@netlify/edge-functions";
export default async (_request:Request,context:Context)=>context.next();
// One path pattern keeps this rule within the Free plan's two-rule allowance.
export const config:Config = {
 path:"/api/*",
 rateLimit:{action:"rate_limit",windowLimit:30,windowSize:60,aggregateBy:["ip","domain"]}
};
