export const TEAM = [
  {
    slug: "npc-pm",
    name: "项目经理",
    appSecretPrefix: "NPC_PM",
    eventType: "npc-pm",
    promptPath: ".github/npc/roles/pm.md",
    skillPath: ".claude/skills/npc-pm/SKILL.md",
    scope: "协调、拆任务、总结；不写业务代码",
  },
  {
    slug: "npc-ocr",
    name: "OCR",
    appSecretPrefix: "NPC_OCR",
    eventType: "npc-ocr",
    promptPath: ".github/npc/roles/ocr.md",
    skillPath: ".claude/skills/npc-ocr/SKILL.md",
    scope: "图片识别、docs/",
  },
  {
    slug: "npc-java",
    name: "Java 开发",
    appSecretPrefix: "NPC_JAVA",
    eventType: "npc-java",
    promptPath: ".github/npc/roles/java.md",
    skillPath: ".claude/skills/npc-java/SKILL.md",
    scope: "后端目录",
  },
  {
    slug: "npc-react",
    name: "React 开发",
    appSecretPrefix: "NPC_REACT",
    eventType: "npc-react",
    promptPath: ".github/npc/roles/react.md",
    skillPath: ".claude/skills/npc-react/SKILL.md",
    scope: "前端目录",
  },
  {
    slug: "npc-qa",
    name: "测试",
    appSecretPrefix: "NPC_QA",
    eventType: "npc-qa",
    promptPath: ".github/npc/roles/qa.md",
    skillPath: ".claude/skills/npc-qa/SKILL.md",
    scope: "测试目录",
  },
];

export function getRole(slug) {
  return TEAM.find((role) => role.slug === slug);
}

export function roleSlugs() {
  return TEAM.map((role) => role.slug);
}

export function validateTeam(team = TEAM) {
  const seenSlugs = new Set();
  const seenEvents = new Set();

  for (const role of team) {
    if (!role.slug || !/^npc-[a-z0-9-]+$/.test(role.slug)) {
      throw new Error(`invalid slug: ${role.slug}`);
    }
    if (seenSlugs.has(role.slug)) {
      throw new Error(`duplicate slug: ${role.slug}`);
    }
    seenSlugs.add(role.slug);

    for (const field of [
      "name",
      "appSecretPrefix",
      "eventType",
      "promptPath",
      "skillPath",
      "scope",
    ]) {
      if (!role[field]) {
        throw new Error(`missing ${field} for ${role.slug}`);
      }
    }

    if (!/^npc-[a-z0-9-]+$/.test(role.eventType)) {
      throw new Error(`invalid eventType: ${role.eventType}`);
    }
    if (seenEvents.has(role.eventType)) {
      throw new Error(`duplicate eventType: ${role.eventType}`);
    }
    seenEvents.add(role.eventType);

    if (!role.promptPath.endsWith(".md")) {
      throw new Error(`promptPath must end with .md: ${role.promptPath}`);
    }
    if (!role.skillPath.endsWith("SKILL.md")) {
      throw new Error(`skillPath must end with SKILL.md: ${role.skillPath}`);
    }
  }
}

validateTeam();
