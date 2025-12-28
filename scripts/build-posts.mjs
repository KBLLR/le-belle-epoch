import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const contentDir = path.resolve(process.cwd(), "content", "posts");
const outputFile = path.resolve(process.cwd(), "public", "posts.json");

const walk = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      if (entry.isFile() && entry.name.endsWith(".md")) return [fullPath];
      return [];
    })
  );
  return files.flat();
};

const normalizeTags = (value) => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
};

const buildPosts = async () => {
  let files = [];
  try {
    files = await walk(contentDir);
  } catch {
    files = [];
  }

  const posts = [];
  for (const file of files) {
    const raw = await fs.readFile(file, "utf-8");
    const parsed = matter(raw);
    const slug = path.basename(file, ".md");
    const data = parsed.data || {};
    const contentMd = parsed.content.trim();

    if (!data.title || !data.summary) {
      continue;
    }

    posts.push({
      id: data.id || slug,
      title: String(data.title),
      summary: String(data.summary),
      tags: normalizeTags(data.tags),
      project: data.project ? String(data.project) : undefined,
      voice_id: data.voice_id ? String(data.voice_id) : undefined,
      published_at: data.published_at ? String(data.published_at) : undefined,
      source_path: data.source_path ? String(data.source_path) : undefined,
      content_md: contentMd,
      content_html: marked.parse(contentMd)
    });
  }

  const payload = {
    generated_at: new Date().toISOString(),
    posts
  };

  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, JSON.stringify(payload, null, 2) + "\n", "utf-8");
};

buildPosts().catch((error) => {
  console.error("build-posts failed", error);
  process.exit(1);
});
