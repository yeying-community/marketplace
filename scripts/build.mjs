import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const skillsDir = path.join(root, "skills");
const mcpServersDir = path.join(root, "mcp", "servers");
const languages = ["cn", "en"];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateSkill(skill, file) {
  assert(skill.schemaVersion === "1.0", `${file}: schemaVersion must be 1.0`);
  assert(
    typeof skill.id === "string" && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(skill.id),
    `${file}: id must be kebab-case`,
  );
  assert(typeof skill.version === "string", `${file}: version is required`);
  assert(skill.name, `${file}: name is required`);
  assert(skill.launch?.type, `${file}: launch.type is required`);
  assert(skill.instructions?.type, `${file}: instructions.type is required`);
  assert(skill.release?.status !== "removed", `${file}: removed skills should not be committed`);
}

function validateMcpServer(server, file) {
  assert(server.schemaVersion === "1.0", `${file}: schemaVersion must be 1.0`);
  assert(
    typeof server.id === "string" && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(server.id),
    `${file}: id must be kebab-case`,
  );
  assert(typeof server.version === "string", `${file}: version is required`);
  assert(typeof server.name === "string" && server.name, `${file}: name is required`);
  assert(
    typeof server.description === "string" && server.description,
    `${file}: description is required`,
  );
  assert(typeof server.repo === "string" && server.repo, `${file}: repo is required`);
  assert(Array.isArray(server.tags), `${file}: tags must be an array`);
  assert(typeof server.command === "string" && server.command, `${file}: command is required`);
  assert(Array.isArray(server.baseArgs), `${file}: baseArgs must be an array`);
  assert(typeof server.configurable === "boolean", `${file}: configurable must be a boolean`);
  assert(server.release?.status !== "removed", `${file}: removed MCP servers should not be committed`);
}

function collectSkills() {
  const grouped = {};
  const skillIndex = [];
  const seen = new Set();

  for (const lang of languages) {
    const dir = path.join(skillsDir, lang);
    grouped[lang] = [];
    if (!fs.existsSync(dir)) continue;

    const files = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".json"))
      .sort();

    for (const file of files) {
      const absolute = path.join(dir, file);
      const relative = path.relative(root, absolute);
      const skill = readJson(absolute);
      validateSkill(skill, relative);

      const key = `${lang}:${skill.id}`;
      assert(!seen.has(key), `${relative}: duplicate skill id ${skill.id}`);
      seen.add(key);

      grouped[lang].push(skill);
      skillIndex.push({
        id: skill.id,
        lang,
        version: skill.version,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        tags: skill.tags ?? [],
        path: relative,
        release: skill.release,
      });
    }
  }

  return {
    skillIndex,
    grouped,
  };
}

function collectMcpServers() {
  const servers = [];
  const index = [];
  const seen = new Set();

  if (!fs.existsSync(mcpServersDir)) {
    return { servers, index };
  }

  const files = fs
    .readdirSync(mcpServersDir)
    .filter((file) => file.endsWith(".json"))
    .sort();

  for (const file of files) {
    const absolute = path.join(mcpServersDir, file);
    const relative = path.relative(root, absolute);
    const server = readJson(absolute);
    validateMcpServer(server, relative);

    assert(!seen.has(server.id), `${relative}: duplicate MCP server id ${server.id}`);
    seen.add(server.id);

    servers.push(server);
    index.push({
      id: server.id,
      version: server.version,
      name: server.name,
      description: server.description,
      tags: server.tags ?? [],
      path: relative,
      release: server.release,
    });
  }

  return { servers, index };
}

const { skillIndex, grouped } = collectSkills();
const { servers: mcpServers, index: mcpIndex } = collectMcpServers();

writeJson(path.join(root, "index.json"), skillIndex);
writeJson(path.join(root, "packages.json"), grouped);
writeJson(path.join(root, "mcp", "index.json"), mcpIndex);
writeJson(path.join(root, "mcp", "packages.json"), mcpServers);

console.log(`Built ${skillIndex.length} skill packages`);
console.log(`Built ${mcpIndex.length} MCP packages`);
