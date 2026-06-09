# Skill Package Spec

## Required Fields

- `schemaVersion`: current value is `1.0`
- `id`: stable kebab-case identifier
- `version`: semantic version
- `name`: localized name
- `description`: short task-focused description
- `category`: broad category
- `launch`: where the skill starts
- `instructions`: prompt or instruction source
- `model`: model preferences and candidate restrictions
- `tools`: built-in tool declarations
- `mcp`: MCP service requirements
- `permissions`: declared capability surface
- `release`: publication status

## Tool Rules

Built-in tools are declared in `tools` with reserved ids.

Supported built-in tool ids:

- `web_search`

MCP services are declared in `mcp.servers`.

Examples:

```json
{
  "tools": [
    {
      "id": "web_search",
      "name": "Web Search",
      "description": "Use model-provider web search",
      "required": false
    }
  ],
  "mcp": {
    "servers": [
      {
        "id": "fetch",
        "name": "Fetch",
        "transport": "stdio",
        "required": false
      }
    ]
  }
}
```

## Review Rules

- Skills must describe a concrete task, not a vague assistant persona.
- Dependencies must be explicit.
- API keys, tokens, private URLs, and local file paths are forbidden.
- Unsafe system instructions are forbidden.
- If a skill requires MCP, mark the MCP server as `required: true`.
- If a skill only benefits from MCP, mark it as `required: false`.

## Discovery Status

Chat should resolve runtime status after installation:

- `ready`: model and required tools are available
- `needs_config`: some configurable dependency is missing
- `unavailable`: required model or runtime is not available

