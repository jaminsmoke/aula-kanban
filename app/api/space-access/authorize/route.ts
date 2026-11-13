import { currentVpsAccess } from "../../../../lib/server/vps-access";
import { authorizeVpsRequest } from "../../../../lib/server/vps-authorize-handler";
import { gatewayConfig } from "../../../../lib/server/gateway-config";

export const dynamic = "force-dynamic";

/**
 * Answer a request from the isolated gateway.
 * @param request - Gateway request.
 * @returns Current role or denial.
 */
export async function POST(request: Request) {
  try {
    const config = await gatewayConfig();
    return authorizeVpsRequest(request, { serviceToken: config?.serviceToken, ticketSecret: config?.ticketSecret, access: currentVpsAccess });
  } catch { return Response.json({ allowed: false }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
