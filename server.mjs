import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const storageRoot = process.env.GALLERY_STORAGE_ROOT ? path.resolve(process.env.GALLERY_STORAGE_ROOT) : projectRoot;
const stateFile = path.join(storageRoot, "data", "uploaded-styles.json");
const uploadRoot = path.join(storageRoot, "prototype", "assets", "shoes", "uploads");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4174);
const maxBodyBytes = 17 * 1024 * 1024;
const allowedCategories = new Set(["sport-casual", "fashion-casual", "snow-boots"]);
const defaultCategory = "sport-casual";
const normalizeCategory = (category) => allowedCategories.has(category) ? category : defaultCategory;
const allowedStatuses = new Set(["unpublished", "draft", "published"]);
const defaultStatus = "unpublished";
const normalizeStatus = (status) => allowedStatuses.has(status) ? status : defaultStatus;
const isAllowedSlot = (slot) => {
  if (slot === "master") return true;
  const match = /^(view|color)-(\d{2})$/.exec(slot || "");
  if (!match) return false;
  const index = Number(match[2]);
  return index >= 1 && index <= 30;
};
const mimeToExt = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/avif", "avif"]
]);
const mimeByExt = new Map([
  [".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"], [".png", "image/png"], [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"], [".webp", "image/webp"], [".avif", "image/avif"], [".svg", "image/svg+xml"]
]);

const defaultState = () => ({
  version: 5,
  next_style_number: 3,
  order: ["style-01", "style-02"],
  styles: {
    "style-01": { category: defaultCategory, status: defaultStatus, images: {}, created_at: null },
    "style-02": { category: defaultCategory, status: defaultStatus, images: {}, created_at: null }
  }
});

const normalizeState = (input) => {
  const fallback = defaultState();
  const sourceStyles = input && typeof input.styles === "object" && input.styles ? input.styles : fallback.styles;
  const styles = Object.fromEntries(Object.entries(sourceStyles).map(([styleId, record]) => [styleId, {
    ...(record && typeof record === "object" ? record : {}),
    category: normalizeCategory(record?.category),
    status: normalizeStatus(record?.status),
    images: record && typeof record.images === "object" && record.images ? record.images : {}
  }]));
  const styleIds = Object.keys(styles).filter((id) => /^style-\d+$/.test(id));
  const requestedOrder = Array.isArray(input?.order) ? input.order : styleIds;
  const order = [...new Set(requestedOrder.filter((id) => styleIds.includes(id)))];
  styleIds.forEach((id) => { if (!order.includes(id)) order.push(id); });
  const highestNumber = styleIds.reduce((highest, id) => Math.max(highest, Number(id.split("-")[1]) || 0), 0);
  return {
    version: 5,
    next_style_number: Math.max(Number(input?.next_style_number) || 1, highestNumber + 1),
    order,
    styles
  };
};

const ensureStorage = async () => {
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await fs.mkdir(uploadRoot, { recursive: true });
  try {
    await fs.access(stateFile);
  } catch {
    await fs.writeFile(stateFile, `${JSON.stringify(defaultState(), null, 2)}\n`, "utf8");
  }
};

const readState = async () => {
  try {
    return normalizeState(JSON.parse(await fs.readFile(stateFile, "utf8")));
  } catch {
    return defaultState();
  }
};

const writeState = async (state) => {
  const temporary = `${stateFile}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await fs.rename(temporary, stateFile);
};

let stateQueue = Promise.resolve();
const updateState = (mutator) => {
  const operation = stateQueue.then(async () => {
    const state = await readState();
    const result = await mutator(state);
    await writeState(state);
    return { state, result };
  });
  stateQueue = operation.catch(() => undefined);
  return operation;
};

const sendJson = (response, status, payload) => {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(payload));
};

const readJsonBody = (request) => new Promise((resolve, reject) => {
  const chunks = [];
  let total = 0;
  request.on("data", (chunk) => {
    total += chunk.length;
    if (total > maxBodyBytes) {
      reject(new Error("图片过大"));
      request.destroy();
      return;
    }
    chunks.push(chunk);
  });
  request.on("end", () => {
    try {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      resolve(raw ? JSON.parse(raw) : {});
    }
    catch { reject(new Error("上传数据无效")); }
  });
  request.on("error", reject);
});

const hasValidSignature = (buffer, mime) => {
  if (mime === "image/png") return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (mime === "image/jpeg") return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/webp") return buffer.length > 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  if (mime === "image/avif") return buffer.length > 12 && buffer.toString("ascii", 4, 8) === "ftyp";
  return false;
};

const handleUpload = async (request, response) => {
  try {
    const body = await readJsonBody(request);
    if (!/^style-\d+$/.test(body.styleId || "") || !isAllowedSlot(body.slot)) return sendJson(response, 400, { error: "图片位置无效" });
    const currentState = await readState();
    if (!currentState.styles[body.styleId]) return sendJson(response, 404, { error: "款式不存在，请刷新页面后重试" });
    const match = /^data:(image\/(?:png|jpeg|webp|avif));base64,([a-zA-Z0-9+/=\s]+)$/.exec(body.dataUrl || "");
    if (!match || !mimeToExt.has(match[1])) return sendJson(response, 400, { error: "仅支持 PNG、JPG、WebP 或 AVIF 图片" });
    const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
    if (!bytes.length || bytes.length > 12 * 1024 * 1024 || !hasValidSignature(bytes, match[1])) return sendJson(response, 400, { error: "图片文件无效或超过 12MB" });

    const styleDirectory = path.join(uploadRoot, body.styleId);
    await fs.mkdir(styleDirectory, { recursive: true });
    const filename = `${body.slot}-${Date.now()}-${randomUUID().slice(0, 8)}.${mimeToExt.get(match[1])}`;
    await fs.writeFile(path.join(styleDirectory, filename), bytes);

    const publicPath = `/prototype/assets/shoes/uploads/${body.styleId}/${filename}`;
    const { state } = await updateState(async (state) => {
      if (!state.styles[body.styleId]) throw new Error("款式不存在，请刷新页面后重试");
      const record = state.styles[body.styleId];
      record.images ??= {};
      record.images[body.slot] = publicPath;
      record.metadata ??= {};
      record.metadata[body.slot] = {
        original_name: typeof body.filename === "string" ? path.basename(body.filename).slice(0, 160) : null,
        mime_type: match[1],
        bytes: bytes.length,
        uploaded_at: new Date().toISOString()
      };
      if (record.status === "published") {
        record.status = "draft";
        record.published_at = null;
      }
      record.updated_at = new Date().toISOString();
    });
    sendJson(response, 201, { ok: true, path: publicPath, status: state.styles[body.styleId].status });
  } catch (error) {
    sendJson(response, 400, { error: error.message || "上传失败" });
  }
};

const handleCreateStyle = async (request, response) => {
  try {
    const body = await readJsonBody(request);
    const category = normalizeCategory(body.category);
    const { state, result } = await updateState(async (draft) => {
      if (draft.order.length >= 200) throw new Error("款式数量已达到当前上限");
      let number = draft.next_style_number;
      let styleId = `style-${String(number).padStart(2, "0")}`;
      while (draft.styles[styleId]) {
        number += 1;
        styleId = `style-${String(number).padStart(2, "0")}`;
      }
      draft.next_style_number = number + 1;
      const timestamp = new Date().toISOString();
      draft.styles[styleId] = { category, status: defaultStatus, images: {}, created_at: timestamp, updated_at: timestamp, published_at: null };
      draft.order.unshift(styleId);
      return styleId;
    });
    sendJson(response, 201, { ok: true, styleId: result, state });
  } catch (error) {
    sendJson(response, 400, { error: error.message || "新增失败" });
  }
};

const handleUpdateStyle = async (request, response, styleId) => {
  try {
    const body = await readJsonBody(request);
    const hasCategory = Object.prototype.hasOwnProperty.call(body, "category");
    const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
    if (!hasCategory && !hasStatus) return sendJson(response, 400, { error: "没有可保存的款式修改" });
    if (hasCategory && !allowedCategories.has(body.category)) return sendJson(response, 400, { error: "请选择有效的鞋型品类" });
    if (hasStatus && !allowedStatuses.has(body.status)) return sendJson(response, 400, { error: "请选择有效的发布状态" });
    const { state } = await updateState(async (draft) => {
      const record = draft.styles[styleId];
      if (!record) throw new Error("款式不存在");
      if (hasStatus && body.status === "published" && !record.images?.master) throw new Error("发布前必须先上传主图");
      if (hasCategory) {
        record.category = body.category;
        if (record.status === "published" && !hasStatus) {
          record.status = "draft";
          record.published_at = null;
        }
      }
      if (hasStatus) {
        record.status = body.status;
        record.published_at = body.status === "published" ? new Date().toISOString() : null;
      }
      record.updated_at = new Date().toISOString();
    });
    sendJson(response, 200, { ok: true, state });
  } catch (error) {
    sendJson(response, 400, { error: error.message || "款式保存失败" });
  }
};

const handleDeleteStyle = async (response, styleId) => {
  try {
    const { state } = await updateState(async (draft) => {
      if (!draft.styles[styleId]) throw new Error("款式不存在");
      delete draft.styles[styleId];
      draft.order = draft.order.filter((id) => id !== styleId);
    });
    sendJson(response, 200, { ok: true, state });
  } catch (error) {
    sendJson(response, 404, { error: error.message || "移除失败" });
  }
};

const handleDeleteImage = async (response, styleId, slot) => {
  try {
    if (!isAllowedSlot(slot)) return sendJson(response, 400, { error: "图片位置无效" });
    const { state } = await updateState(async (draft) => {
      const record = draft.styles[styleId];
      if (!record) throw new Error("款式不存在");
      if (!record.images?.[slot]) throw new Error("图片不存在或已被删除");
      if (record.status === "published") {
        record.status = "draft";
        record.published_at = null;
      }
      record.updated_at = new Date().toISOString();

      const dynamicMatch = /^(view|color)-(\d{2})$/.exec(slot);
      if (!dynamicMatch) {
        delete record.images[slot];
        if (record.metadata) delete record.metadata[slot];
        return;
      }

      const prefix = dynamicMatch[1];
      const metadata = record.metadata || {};
      const remaining = Object.entries(record.images)
        .filter(([key]) => key !== slot && new RegExp(`^${prefix}-(\\d{2})$`).test(key))
        .sort(([first], [second]) => Number(first.slice(-2)) - Number(second.slice(-2)))
        .map(([key, imagePath]) => ({ imagePath, metadata: metadata[key] }));

      Object.keys(record.images).forEach((key) => {
        if (new RegExp(`^${prefix}-(\\d{2})$`).test(key)) delete record.images[key];
      });
      Object.keys(metadata).forEach((key) => {
        if (new RegExp(`^${prefix}-(\\d{2})$`).test(key)) delete metadata[key];
      });
      remaining.forEach((item, index) => {
        const compactedSlot = `${prefix}-${String(index + 1).padStart(2, "0")}`;
        record.images[compactedSlot] = item.imagePath;
        if (item.metadata) metadata[compactedSlot] = item.metadata;
      });
      record.metadata = metadata;
    });
    sendJson(response, 200, { ok: true, state });
  } catch (error) {
    sendJson(response, 404, { error: error.message || "删除失败" });
  }
};

const serveStatic = async (request, response, pathname) => {
  let relativePath = pathname === "/" ? "/prototype/index.html" : pathname;
  if (relativePath.endsWith("/")) relativePath += "index.html";
  let decoded;
  try { decoded = decodeURIComponent(relativePath); }
  catch { response.writeHead(400); response.end("Bad Request"); return; }
  const absolutePath = path.resolve(projectRoot, `.${decoded}`);
  if (!absolutePath.startsWith(`${projectRoot}${path.sep}`)) { response.writeHead(403); response.end("Forbidden"); return; }
  try {
    const file = await fs.readFile(absolutePath);
    response.writeHead(200, {
      "Content-Type": mimeByExt.get(path.extname(absolutePath).toLowerCase()) || "application/octet-stream",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; connect-src 'self'"
    });
    if (request.method === "HEAD") response.end(); else response.end(file);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
  }
};

await ensureStorage();
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);
    if (request.method === "GET" && url.pathname === "/api/gallery") return sendJson(response, 200, await readState());
    if (request.method === "POST" && url.pathname === "/api/styles") return handleCreateStyle(request, response);
    if (request.method === "POST" && url.pathname === "/api/upload") return handleUpload(request, response);
    const imageMatch = /^\/api\/styles\/(style-\d+)\/images\/(master|(?:view|color)-\d{2})$/.exec(url.pathname);
    if (request.method === "DELETE" && imageMatch) return handleDeleteImage(response, imageMatch[1], imageMatch[2]);
    const styleMatch = /^\/api\/styles\/(style-\d+)$/.exec(url.pathname);
    if (request.method === "PATCH" && styleMatch) return handleUpdateStyle(request, response, styleMatch[1]);
    if (request.method === "DELETE" && styleMatch) return handleDeleteStyle(response, styleMatch[1]);
    if (request.method === "GET" || request.method === "HEAD") return serveStatic(request, response, url.pathname);
    response.writeHead(405, { Allow: "GET, HEAD, POST, PATCH, DELETE" });
    response.end("Method Not Allowed");
  } catch (error) {
    if (!response.headersSent) sendJson(response, 500, { error: "本地服务暂时不可用" });
    console.error(error);
  }
});

server.listen(port, host, () => {
  console.log(`Shoe gallery ready at http://${host}:${port}/prototype/`);
});
