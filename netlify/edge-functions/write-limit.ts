import type {Context,Config} from "@netlify/edge-functions";
export default async (_request:Request,context:Context)=>context.next();
export const config:Config = {
  "path": [
    "/api/records",
    "/api/documents",
    "/api/coffee",
    "/api/publish",
    "/api/anchor",
    "/api/access"
  ],
  "method": [
    "POST",
    "PUT",
    "PATCH",
    "DELETE"
  ],
  "rateLimit": {
    "windowLimit": 30,
    "windowSize": 60,
    "aggregateBy": [
      "ip",
      "domain"
    ]
  }
};
