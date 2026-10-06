import type {Context,Config} from "@netlify/edge-functions";
export default async (_request:Request,context:Context)=>context.next();
export const config:Config = {
  "path": [
    "/api/auth/login"
  ],
  "method": [
    "POST"
  ],
  "rateLimit": {
    "windowLimit": 10,
    "windowSize": 60,
    "aggregateBy": [
      "ip",
      "domain"
    ]
  }
};
