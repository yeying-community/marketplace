#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

const DEFAULT_BASE_URL = "https://quantapi.51ifind.com/api/v1";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_TOKEN_TTL_MS = 6 * 24 * 60 * 60 * 1000;

const ENDPOINTS = {
  high_frequency: "high_frequency",
  real_time_quotation: "real_time_quotation",
  cmd_history_quotation: "cmd_history_quotation",
  basic_data_service: "basic_data_service",
  date_sequence: "date_sequence",
  data_pool: "data_pool",
  edb_service: "edb_service",
  snap_shot: "snap_shot",
  report_query: "report_query",
  smart_stock_picking: "smart_stock_picking",
  get_trade_dates: "get_trade_dates",
};

const EndpointSchema = z.enum(Object.keys(ENDPOINTS));
const JsonObjectSchema = z.object({}).catchall(z.unknown());

function jsonResult(data, isError = false) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
    structuredContent: data,
    isError,
  };
}

function getBaseUrl() {
  return (process.env.IFIND_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function getTimeoutMs() {
  const timeout = Number(process.env.IFIND_REQUEST_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS;
}

async function readResponseJson(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Expected JSON response but got: ${text.slice(0, 300)}`);
  }
}

class IfindClient {
  constructor() {
    this.cachedAccessToken = undefined;
    this.cachedAccessTokenExpiresAt = 0;
  }

  async post(endpoint, payload, headers) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

    try {
      const response = await fetch(`${getBaseUrl()}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: payload == null ? undefined : JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await readResponseJson(response);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(data).slice(0, 500)}`);
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  extractAccessToken(response) {
    return (
      response?.data?.access_token ||
      response?.data?.accessToken ||
      response?.access_token ||
      response?.accessToken
    );
  }

  async getAccessToken({ forceRefresh = false } = {}) {
    const envAccessToken = process.env.IFIND_ACCESS_TOKEN;
    if (envAccessToken && !forceRefresh) {
      return {
        accessToken: envAccessToken,
        source: "env",
      };
    }

    if (
      !forceRefresh &&
      this.cachedAccessToken &&
      Date.now() < this.cachedAccessTokenExpiresAt
    ) {
      return {
        accessToken: this.cachedAccessToken,
        source: "cache",
      };
    }

    const refreshToken = process.env.IFIND_REFRESH_TOKEN;
    if (!refreshToken) {
      throw new Error("IFIND_REFRESH_TOKEN or IFIND_ACCESS_TOKEN is required.");
    }

    const response = await this.post("get_access_token", undefined, {
      refresh_token: refreshToken,
    });
    const accessToken = this.extractAccessToken(response);
    if (!accessToken) {
      throw new Error(`Failed to extract access_token from response: ${JSON.stringify(response)}`);
    }

    this.cachedAccessToken = accessToken;
    this.cachedAccessTokenExpiresAt = Date.now() + DEFAULT_TOKEN_TTL_MS;

    return {
      accessToken,
      source: "refresh_token",
      response,
    };
  }

  async callEndpoint(endpoint, payload, options = {}) {
    if (!ENDPOINTS[endpoint]) {
      throw new Error(`Unsupported iFinD endpoint: ${endpoint}`);
    }

    let token = await this.getAccessToken();

    try {
      return await this.post(ENDPOINTS[endpoint], payload, {
        access_token: token.accessToken,
      });
    } catch (error) {
      if (options.retryOnAuthError === false) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      if (!/token|auth|unauthor|expired|invalid/i.test(message)) {
        throw error;
      }

      token = await this.getAccessToken({ forceRefresh: true });
      return await this.post(ENDPOINTS[endpoint], payload, {
        access_token: token.accessToken,
      });
    }
  }
}

const client = new IfindClient();

function registerTools(server) {
  server.registerTool(
    "get_access_token",
    {
      title: "Get iFinD access token",
      description:
        "Validate iFinD / QuantAPI authentication and obtain an access_token from refresh_token.",
      inputSchema: {
        forceRefresh: z
          .boolean()
          .optional()
          .describe("Force requesting a new access token instead of using env/cache."),
      },
    },
    async ({ forceRefresh }) => {
      const result = await client.getAccessToken({ forceRefresh });
      return jsonResult({
        source: result.source,
        accessTokenMasked: `${result.accessToken.slice(0, 6)}...${result.accessToken.slice(-4)}`,
        raw: result.response,
      });
    },
  );

  server.registerTool(
    "call_ifind_endpoint",
    {
      title: "Call iFinD endpoint",
      description:
        "Call an allowed iFinD / QuantAPI HTTP endpoint with a raw JSON payload generated by Super Command.",
      inputSchema: {
        endpoint: EndpointSchema.describe("Allowed QuantAPI endpoint."),
        payload: JsonObjectSchema.describe("JSON request payload for the endpoint."),
      },
    },
    async ({ endpoint, payload }) => jsonResult(await client.callEndpoint(endpoint, payload)),
  );

  server.registerTool(
    "query_history_quotes",
    {
      title: "Query history quotes",
      description: "Query historical daily/period quote data through cmd_history_quotation.",
      inputSchema: {
        codes: z.string().min(1).describe("Security codes, comma-separated, for example 000001.SZ,600000.SH."),
        indicators: z.string().min(1).describe("Indicators, comma-separated, for example open,high,low,close."),
        startdate: z.string().min(1).describe("Start date, for example 2024-01-01."),
        enddate: z.string().min(1).describe("End date, for example 2024-12-31."),
        functionpara: JsonObjectSchema.optional().describe("Optional function parameters, for example { Fill: 'Blank' }."),
      },
    },
    async (input) =>
      jsonResult(await client.callEndpoint("cmd_history_quotation", input)),
  );

  server.registerTool(
    "query_realtime_quotes",
    {
      title: "Query realtime quotes",
      description: "Query latest quote data through real_time_quotation.",
      inputSchema: {
        codes: z.string().min(1).describe("Security codes, comma-separated."),
        indicators: z.string().min(1).describe("Indicators, comma-separated, for example latest,open,high,low."),
      },
    },
    async (input) => jsonResult(await client.callEndpoint("real_time_quotation", input)),
  );

  server.registerTool(
    "query_high_frequency",
    {
      title: "Query high frequency data",
      description: "Query minute/intraday sequence data through high_frequency.",
      inputSchema: {
        codes: z.string().min(1).describe("Security code."),
        indicators: z.string().min(1).describe("Indicators, comma-separated."),
        starttime: z.string().min(1).describe("Start time, for example 2024-01-02 09:30:00."),
        endtime: z.string().min(1).describe("End time, for example 2024-01-02 15:00:00."),
      },
    },
    async (input) => jsonResult(await client.callEndpoint("high_frequency", input)),
  );

  server.registerTool(
    "query_snapshot",
    {
      title: "Query intraday snapshot",
      description: "Query intraday snapshot/tick data through snap_shot.",
      inputSchema: {
        codes: z.string().min(1).describe("Security code."),
        indicators: z.string().min(1).describe("Indicators, comma-separated."),
        starttime: z.string().min(1).describe("Start time."),
        endtime: z.string().min(1).describe("End time."),
      },
    },
    async (input) => jsonResult(await client.callEndpoint("snap_shot", input)),
  );

  server.registerTool(
    "query_basic_data",
    {
      title: "Query basic data",
      description: "Query fundamental/basic indicators through basic_data_service.",
      inputSchema: {
        codes: z.string().min(1).describe("Security codes, comma-separated."),
        indipara: z
          .array(
            z.object({
              indicator: z.string().min(1),
              indiparams: z.array(z.string()).optional(),
            }),
          )
          .min(1)
          .describe("iFinD indicator definitions."),
      },
    },
    async (input) => jsonResult(await client.callEndpoint("basic_data_service", input)),
  );

  server.registerTool(
    "query_date_sequence",
    {
      title: "Query date sequence",
      description: "Query date sequence indicators through date_sequence.",
      inputSchema: {
        codes: z.string().min(1).describe("Security codes, comma-separated."),
        startdate: z.string().min(1).describe("Start date."),
        enddate: z.string().min(1).describe("End date."),
        indipara: z
          .array(
            z.object({
              indicator: z.string().min(1),
              indiparams: z.array(z.string()).optional(),
            }),
          )
          .min(1)
          .describe("iFinD indicator definitions."),
        functionpara: JsonObjectSchema.optional().describe("Optional function parameters."),
      },
    },
    async (input) => jsonResult(await client.callEndpoint("date_sequence", input)),
  );

  server.registerTool(
    "query_data_pool",
    {
      title: "Query data pool",
      description: "Query thematic reports/data pools through data_pool.",
      inputSchema: {
        reportname: z.string().min(1).describe("Report name generated by Super Command."),
        functionpara: JsonObjectSchema.optional().describe("Report function parameters."),
        outputpara: z.string().optional().describe("Output fields."),
      },
    },
    async (input) => jsonResult(await client.callEndpoint("data_pool", input)),
  );

  server.registerTool(
    "query_reports",
    {
      title: "Query announcements/reports",
      description: "Query announcement/report metadata through report_query.",
      inputSchema: {
        codes: z.string().min(1).describe("Security codes, comma-separated."),
        beginrDate: z.string().min(1).describe("Begin date. Keep official field name beginrDate."),
        endrDate: z.string().min(1).describe("End date. Keep official field name endrDate."),
        functionpara: JsonObjectSchema.optional().describe("Report query parameters."),
        outputpara: z.string().optional().describe("Output fields."),
      },
    },
    async (input) => jsonResult(await client.callEndpoint("report_query", input)),
  );

  server.registerTool(
    "smart_stock_picking",
    {
      title: "Smart stock picking",
      description: "Run iFinD smart stock picking through smart_stock_picking.",
      inputSchema: {
        searchstring: z.string().min(1).describe("Natural language stock picking condition."),
        searchtype: z.string().optional().describe("Search type, for example stock."),
      },
    },
    async (input) => jsonResult(await client.callEndpoint("smart_stock_picking", input)),
  );

  server.registerTool(
    "get_trade_dates",
    {
      title: "Get trade dates",
      description: "Query trading dates through get_trade_dates.",
      inputSchema: {
        marketcode: z.string().min(1).describe("Market code, for example 212001."),
        startdate: z.string().optional().describe("Start date."),
        enddate: z.string().optional().describe("End date."),
        functionpara: JsonObjectSchema.optional().describe("Date query/offset parameters."),
      },
    },
    async (input) => jsonResult(await client.callEndpoint("get_trade_dates", input)),
  );
}

async function main() {
  const transportArgIndex = process.argv.indexOf("--transport");
  const transport = transportArgIndex >= 0 ? process.argv[transportArgIndex + 1] : "stdio";

  if (transport !== "stdio") {
    throw new Error(`Unsupported transport "${transport}". Only stdio is supported.`);
  }

  const server = new McpServer({
    name: "ifind-data-mcp",
    version: "0.1.0",
  });

  registerTools(server);

  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error("[ifind-data-mcp] fatal error", error);
  process.exit(1);
});
