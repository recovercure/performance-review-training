import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url") || "";

    // Enterprise WeChat JS-SDK config endpoint
    // In production, this would use WECOM_CORP_ID and WECOM_SECRET to get access_token
    // and then call https://qyapi.weixin.qq.com/cgi-bin/get_jsapi_ticket
    const corpId = process.env.WECOM_CORP_ID || "";
    const agentId = process.env.WECOM_AGENT_ID || "";

    if (!corpId) {
      // Demo mode: no Enterprise WeChat credentials configured
      return NextResponse.json({
        success: true,
        data: {
          mode: "demo",
          message: "未配置企业微信凭证，当前运行在演示模式。在企业微信中部署时，请配置 WECOM_CORP_ID 和 WECOM_SECRET 环境变量。",
          corpId: "",
          agentId: "",
          jsApiList: ["invoke", "previewImage", "getNetworkType"],
        },
      });
    }

    // Production mode: would fetch real JS-SDK signature
    // This is a placeholder for the real implementation
    return NextResponse.json({
      success: true,
      data: {
        mode: "production",
        corpId,
        agentId,
        url,
        jsApiList: ["invoke", "previewImage", "getNetworkType", "openDefaultBrowser"],
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
