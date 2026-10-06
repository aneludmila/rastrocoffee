import type {Context,Config} from "@netlify/edge-functions";
export default async (_request:Request,context:Context)=>context.next();
export const config:Config = {
  "path": [
    "/api/public",
    "/api/documents",
    "/api/records",
    "/api/coffee"
  ],
  "method": [
    "GET"
  ],
  "rateLimit": {
    "windowLimit": 60,
    "windowSize": 60,
    "aggregateBy": [
      "ip",
      "domain"
    ]
  }
};
