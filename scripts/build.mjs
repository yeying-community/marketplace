import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const skillsDir = path.join(root, "skills");
const toolServersDir = path.join(root, "tools", "servers");
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

function isLocalizedText(value) {
  if (typeof value === "string") return value.length > 0;
  return Boolean(
    value &&
      typeof value === "object" &&
      (typeof value.cn === "string" || typeof value.en === "string"),
  );
}

function validateSkill(skill, file) {
  assert(skill.schemaVersion === "1.0", `${file}: schemaVersion must be 1.0`);
  assert(
    typeof skill.id === "string" && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(skill.id),
    `${file}: id must be kebab-case`,
  );
  assert(typeof skill.version === "string", `${file}: version is required`);
  assert(isLocalizedText(skill.name), `${file}: name is required`);
  assert(skill.launch?.type, `${file}: launch.type is required`);
  assert(skill.instructions?.type, `${file}: instructions.type is required`);
  assert(skill.release?.status !== "removed", `${file}: removed skills should not be committed`);
}

function validateToolServer(server, file) {
  assert(server.schemaVersion === "1.0", `${file}: schemaVersion must be 1.0`);
  assert(
    typeof server.id === "string" && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(server.id),
    `${file}: id must be kebab-case`,
  );
  assert(typeof server.version === "string", `${file}: version is required`);
  assert(isLocalizedText(server.name), `${file}: name is required`);
  assert(
    isLocalizedText(server.description),
    `${file}: description is required`,
  );
  assert(typeof server.repo === "string" && server.repo, `${file}: repo is required`);
  assert(Array.isArray(server.tags), `${file}: tags must be an array`);
  assert(typeof server.command === "string" && server.command, `${file}: command is required`);
  assert(Array.isArray(server.baseArgs), `${file}: baseArgs must be an array`);
  assert(typeof server.configurable === "boolean", `${file}: configurable must be a boolean`);
  assert(server.release?.status !== "removed", `${file}: removed tool servers should not be committed`);
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

function collectToolServers() {
  const servers = [];
  const index = [];
  const seen = new Set();

  if (!fs.existsSync(toolServersDir)) {
    return { servers, index };
  }

  const files = fs
    .readdirSync(toolServersDir)
    .filter((file) => file.endsWith(".json"))
    .sort();

  for (const file of files) {
    const absolute = path.join(toolServersDir, file);
    const relative = path.relative(root, absolute);
    const server = readJson(absolute);
    validateToolServer(server, relative);

    assert(!seen.has(server.id), `${relative}: duplicate tool server id ${server.id}`);
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
const { servers: toolServers, index: toolIndex } = collectToolServers();

writeJson(path.join(root, "index.json"), skillIndex);
writeJson(path.join(root, "packages.json"), grouped);
writeJson(path.join(root, "tools", "index.json"), toolIndex);
writeJson(path.join(root, "tools", "packages.json"), toolServers);

console.log(`Built ${skillIndex.length} skill packages`);
console.log(`Built ${toolIndex.length} tool packages`);
