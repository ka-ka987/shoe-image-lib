(function () {
  "use strict";

  const app = document.getElementById("gallery-app");
  const grid = document.getElementById("style-grid");
  const fileInput = document.getElementById("image-file-input");
  const batchFileInput = document.getElementById("batch-file-input");
  const toast = document.getElementById("upload-toast");
  const styleCount = document.getElementById("style-count");
  const addStyleButton = document.getElementById("add-style-button");
  const subscriberPreviewLink = document.getElementById("subscriber-preview-link");
  const statusFilter = document.getElementById("status-filter");
  const categoryFilter = document.getElementById("category-filter");
  const pagination = document.getElementById("pagination");
  const previousPage = document.getElementById("previous-page");
  const nextPage = document.getElementById("next-page");
  const pageStatus = document.getElementById("page-status");
  const previewDialog = document.getElementById("image-preview-dialog");
  const previewImage = document.getElementById("image-preview-image");
  const previewCaption = document.getElementById("image-preview-caption");
  const previewClose = document.getElementById("image-preview-close");
  const batchDialog = document.getElementById("batch-import-dialog");
  const batchList = document.getElementById("batch-import-list");
  const batchSummary = document.getElementById("batch-import-summary");
  const batchProgress = document.getElementById("batch-import-progress");
  const batchClose = document.getElementById("batch-import-close");
  const batchCancel = document.getElementById("batch-import-cancel");
  const batchConfirm = document.getElementById("batch-import-confirm");
  if (!app || !grid || !fileInput || !batchFileInput || !toast || !previewDialog || !batchDialog || !categoryFilter || !statusFilter) return;

  const pageSize = 4;
  const maxDynamicSlots = 30;
  const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);
  const maxFileBytes = 12 * 1024 * 1024;
  const defaultCategory = "sport-casual";
  const categoryOptions = [
    { value: "all", label: "全部" },
    { value: "sport-casual", label: "运动休闲类" },
    { value: "fashion-casual", label: "时装休闲类" },
    { value: "snow-boots", label: "雪地棉类" }
  ];
  const categoryLabels = Object.fromEntries(categoryOptions.slice(1).map((item) => [item.value, item.label]));
  const statusOptions = [
    { value: "all", label: "全部" },
    { value: "unpublished", label: "未发布" },
    { value: "draft", label: "草稿" },
    { value: "published", label: "已发布" }
  ];
  const statusLabels = Object.fromEntries(statusOptions.slice(1).map((item) => [item.value, item.label]));
  const isSubscriberView = new URLSearchParams(window.location.search).get("mode") === "subscriber";
  const groupConfigs = {
    view: { prefix: "view", minimum: 3, addText: "＋ 视角", name: "视角图" },
    color: { prefix: "color", minimum: 0, addText: "＋ 配色", name: "配色参考" }
  };

  let state = { styles: {}, order: [] };
  let currentPage = 1;
  let selectedCategory = "all";
  let selectedStatus = "all";
  let targetSlot = null;
  let toastTimer = null;
  let batchTargetStyleId = null;
  let batchItems = [];
  let batchUploading = false;
  const expandedCounts = { view: new Map(), color: new Map() };

  app.classList.toggle("is-subscriber-view", isSubscriberView);
  addStyleButton.hidden = isSubscriberView;
  if (subscriberPreviewLink) subscriberPreviewLink.hidden = isSubscriberView;
  statusFilter.hidden = isSubscriberView;

  const showToast = (message, isError = false) => {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle("is-error", isError);
    toast.hidden = false;
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2800);
  };

  const slotNumber = (index) => String(index).padStart(2, "0");
  const getSlotName = (slotElement) => slotElement.dataset.label || "图片";

  const getExistingCount = (record, prefix) => Object.keys(record.images || {}).reduce((highest, key) => {
    const match = new RegExp(`^${prefix}-(\\d{2})$`).exec(key);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  const getGroupCount = (styleId, record, type, editable = true) => {
    const config = groupConfigs[type];
    if (!editable) return getExistingCount(record, config.prefix);
    return Math.max(config.minimum, getExistingCount(record, config.prefix), expandedCounts[type].get(styleId) || 0);
  };

  const setImage = (slotElement, src) => {
    const previewButton = slotElement.querySelector(".slot-primary-action");
    const replaceButton = slotElement.querySelector(".replace-image-button");
    const deleteButton = slotElement.querySelector(".delete-image-button");
    const existing = previewButton.querySelector("img");
    if (existing) existing.remove();
    if (!src) {
      slotElement.classList.remove("has-image");
      previewButton.setAttribute("aria-label", `上传${getSlotName(slotElement)}`);
      replaceButton.hidden = true;
      deleteButton.hidden = true;
      return;
    }
    const img = document.createElement("img");
    img.src = `${src}${src.includes("?") ? "&" : "?"}v=${Date.now()}`;
    img.dataset.source = src;
    img.alt = "";
    previewButton.prepend(img);
    previewButton.setAttribute("aria-label", `放大查看${getSlotName(slotElement)}`);
    slotElement.classList.add("has-image");
    replaceButton.hidden = false;
    deleteButton.hidden = false;
  };

  const openPreview = (slotElement) => {
    const sourceImage = slotElement.querySelector(".slot-primary-action img");
    if (!sourceImage) return;
    previewImage.src = sourceImage.currentSrc || sourceImage.src;
    previewCaption.textContent = getSlotName(slotElement);
    if (typeof previewDialog.showModal === "function") previewDialog.showModal();
    else previewDialog.setAttribute("open", "");
  };

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("无法读取图片"));
    reader.readAsDataURL(file);
  });

  const filenameRole = (filename) => {
    const normalized = filename.toLowerCase().replace(/\.[^.]+$/, "");
    const masterWords = ["主图", "母图", "封面", "hero", "master", "main"];
    const colorWords = ["配色", "色号", "colorway", "colourway", "color", "colour", "cw"];
    const viewWords = [
      "正面", "俯视", "顶视", "后视", "背面", "侧视", "侧面", "内侧", "外侧", "细节",
      "front", "top", "rear", "back", "side", "inner", "outer", "detail", "view"
    ];
    if (masterWords.some((word) => normalized.includes(word))) return { role: "master", reason: "文件名包含主图关键词" };
    if (viewWords.some((word) => normalized.includes(word))) return { role: "view", reason: "文件名包含视角关键词" };
    if (colorWords.some((word) => normalized.includes(word))) return { role: "color", reason: "文件名包含配色关键词" };
    return null;
  };

  const closeBatchDialog = () => {
    if (batchUploading) return;
    if (typeof batchDialog.close === "function") batchDialog.close();
    else batchDialog.removeAttribute("open");
  };

  const clearBatchSession = () => {
    batchItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    batchItems = [];
    batchTargetStyleId = null;
    batchFileInput.value = "";
    batchList.replaceChildren();
    batchSummary.textContent = "";
    batchProgress.textContent = "";
  };

  const prepareBatchItems = (styleId, files) => {
    const record = state.styles[styleId] || { images: {} };
    const items = files.map((file, index) => {
      const validType = allowedTypes.has(file.type);
      const validSize = file.size <= maxFileBytes;
      const detected = validType && validSize ? filenameRole(file.name) : null;
      return {
        file,
        index,
        role: validType && validSize ? detected?.role || null : "skip",
        reason: !validType ? "文件格式不支持，已设为不导入" : !validSize ? "文件超过 12MB，已设为不导入" : detected?.reason || "",
        previewUrl: URL.createObjectURL(file),
        assignedSlot: null,
        assignmentLabel: ""
      };
    });

    let masterAssigned = false;
    items.forEach((item) => {
      if (item.role !== "master") return;
      if (!masterAssigned) masterAssigned = true;
      else {
        item.role = "color";
        item.reason = "批次内只保留一张主图，其余默认归入配色";
      }
    });
    if (!record.images?.master && !masterAssigned) {
      const firstUnknown = items.find((item) => item.role === null);
      if (firstUnknown) {
        firstUnknown.role = "master";
        firstUnknown.reason = "未识别关键词，按选择顺序设为主图";
        masterAssigned = true;
      }
    }
    items.forEach((item) => {
      if (item.role === null) {
        item.role = "color";
        item.reason = "未识别关键词，默认归入配色";
      }
    });
    return items;
  };

  const updateBatchAssignments = () => {
    const record = state.styles[batchTargetStyleId] || { images: {} };
    let nextView = getExistingCount(record, "view") + 1;
    let nextColor = getExistingCount(record, "color") + 1;
    let plannedMaster = false;
    let hasError = false;
    const counts = { master: 0, view: 0, color: 0, skip: 0 };

    batchItems.forEach((item) => {
      item.assignedSlot = null;
      item.assignmentLabel = "";
      counts[item.role] += 1;
      if (item.role === "skip") {
        item.assignmentLabel = "暂不导入";
      } else if (item.role === "master") {
        if (plannedMaster) {
          item.assignmentLabel = "主图冲突，请调整分类";
          hasError = true;
        } else {
          plannedMaster = true;
          item.assignedSlot = "master";
          item.assignmentLabel = record.images?.master ? "主图 · 将替换现有图片" : "主图";
        }
      } else if (item.role === "view") {
        if (nextView > maxDynamicSlots) {
          item.assignmentLabel = "视角图已达到 30 张上限";
          hasError = true;
        } else {
          item.assignedSlot = `view-${slotNumber(nextView)}`;
          item.assignmentLabel = `视角图 ${slotNumber(nextView)}`;
          nextView += 1;
        }
      } else if (item.role === "color") {
        if (nextColor > maxDynamicSlots) {
          item.assignmentLabel = "配色参考已达到 30 张上限";
          hasError = true;
        } else {
          item.assignedSlot = `color-${slotNumber(nextColor)}`;
          item.assignmentLabel = `配色参考 ${slotNumber(nextColor)}`;
          nextColor += 1;
        }
      }
    });

    batchItems.forEach((item, index) => {
      const destination = batchList.querySelector(`[data-batch-index="${index}"] .batch-destination`);
      if (!destination) return;
      destination.textContent = item.assignmentLabel;
      destination.classList.toggle("is-error", !item.assignedSlot && item.role !== "skip");
    });
    const importCount = batchItems.filter((item) => item.assignedSlot).length;
    batchSummary.textContent = `主图 ${counts.master} · 视角 ${counts.view} · 配色 ${counts.color} · 不导入 ${counts.skip}`;
    batchConfirm.disabled = batchUploading || hasError || importCount === 0;
    batchConfirm.textContent = batchUploading ? "正在导入…" : `确认导入 ${importCount} 张`;
    return { hasError, importCount };
  };

  const renderBatchReview = () => {
    batchList.replaceChildren();
    const roleOptions = [
      ["master", "主图"],
      ["color", "配色参考"],
      ["view", "视角图"],
      ["skip", "暂不导入"]
    ];
    batchItems.forEach((item, index) => {
      const row = document.createElement("article");
      row.className = "batch-file-row";
      row.dataset.batchIndex = String(index);

      const image = document.createElement("img");
      image.src = item.previewUrl;
      image.alt = "";

      const details = document.createElement("div");
      details.className = "batch-file-details";
      const filename = document.createElement("strong");
      filename.textContent = item.file.name;
      filename.title = item.file.name;
      const reason = document.createElement("span");
      reason.className = "batch-file-reason";
      reason.textContent = item.reason;
      details.append(filename, reason);

      const controls = document.createElement("div");
      controls.className = "batch-file-controls";
      const select = document.createElement("select");
      select.setAttribute("aria-label", `${item.file.name} 的图片分类`);
      roleOptions.forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        option.selected = item.role === value;
        select.append(option);
      });
      select.addEventListener("change", () => {
        item.role = select.value;
        item.reason = "已人工调整分类";
        reason.textContent = item.reason;
        updateBatchAssignments();
      });
      const destination = document.createElement("span");
      destination.className = "batch-destination";
      controls.append(select, destination);
      row.append(image, details, controls);
      batchList.append(row);
    });
    updateBatchAssignments();
  };

  const openBatchReview = (styleId, files) => {
    clearBatchSession();
    batchTargetStyleId = styleId;
    batchItems = prepareBatchItems(styleId, files);
    renderBatchReview();
    if (typeof batchDialog.showModal === "function") batchDialog.showModal();
    else batchDialog.setAttribute("open", "");
  };

  const uploadBatchItem = async (styleId, item) => {
    const dataUrl = await fileToDataUrl(item.file);
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ styleId, slot: item.assignedSlot, filename: item.file.name, dataUrl })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "上传失败");
    state.styles[styleId].images ??= {};
    state.styles[styleId].images[item.assignedSlot] = result.path;
    if (result.status) state.styles[styleId].status = result.status;
  };

  const confirmBatchImport = async () => {
    const { hasError } = updateBatchAssignments();
    const importItems = batchItems.filter((item) => item.assignedSlot);
    if (hasError || !importItems.length || !batchTargetStyleId) return;
    const styleId = batchTargetStyleId;
    const wasPublished = state.styles[styleId]?.status === "published";
    batchUploading = true;
    batchClose.disabled = true;
    batchCancel.disabled = true;
    batchList.querySelectorAll("select").forEach((select) => { select.disabled = true; });
    updateBatchAssignments();

    let succeeded = 0;
    const failures = [];
    for (const item of importItems) {
      batchProgress.textContent = `正在导入 ${succeeded + failures.length + 1} / ${importItems.length}`;
      try {
        await uploadBatchItem(styleId, item);
        succeeded += 1;
      } catch (error) {
        failures.push(`${item.file.name}：${error.message || "上传失败"}`);
      }
    }

    batchUploading = false;
    batchClose.disabled = false;
    batchCancel.disabled = false;
    expandedCounts.view.delete(styleId);
    expandedCounts.color.delete(styleId);
    render();
    if (typeof batchDialog.close === "function") batchDialog.close();
    else {
      batchDialog.removeAttribute("open");
      clearBatchSession();
    }
    if (failures.length) showToast(`已导入 ${succeeded} 张，${failures.length} 张失败，请重新选择失败图片。`, true);
    else showToast(wasPublished ? `已导入 ${succeeded} 张图片，已发布款式已自动转为草稿。` : `已按确认结果导入 ${succeeded} 张图片。`);
  };

  const uploadFile = async (slotElement, file) => {
    if (!allowedTypes.has(file.type)) return showToast("请选择 PNG、JPG、WebP 或 AVIF 图片。", true);
    if (file.size > maxFileBytes) return showToast("单张图片不能超过 12MB。", true);

    const card = slotElement.closest(".style-card");
    const slotButtons = slotElement.querySelectorAll("button");
    slotElement.classList.add("is-uploading");
    slotButtons.forEach((button) => { button.disabled = true; });
    try {
      const dataUrl = await fileToDataUrl(file);
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ styleId: card.dataset.styleId, slot: slotElement.dataset.slot, filename: file.name, dataUrl })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "上传失败");
      state.styles[card.dataset.styleId].images ??= {};
      state.styles[card.dataset.styleId].images[slotElement.dataset.slot] = result.path;
      const movedToDraft = state.styles[card.dataset.styleId].status === "published" && result.status === "draft";
      if (result.status) state.styles[card.dataset.styleId].status = result.status;
      setImage(slotElement, result.path);
      if (movedToDraft) render();
      showToast(movedToDraft ? "图片已保存，已发布款式已自动转为草稿。" : "图片已保存，刷新页面后仍会保留。");
    } catch (error) {
      showToast(error.message || "上传失败，请重试。", true);
    } finally {
      slotElement.classList.remove("is-uploading");
      slotButtons.forEach((button) => { button.disabled = false; });
      fileInput.value = "";
      targetSlot = null;
    }
  };

  const chooseReplacement = (slotElement) => {
    targetSlot = slotElement;
    fileInput.click();
  };

  const deleteImage = async (slotElement) => {
    const card = slotElement.closest(".style-card");
    const styleId = card.dataset.styleId;
    const slotId = slotElement.dataset.slot;
    const label = getSlotName(slotElement);
    const isDynamicSlot = /^(view|color)-\d{2}$/.test(slotId);
    const deleteEffect = isDynamicSlot ? "删除后该位置会消失，后面的图片自动前移。" : "删除后主图位置会恢复为空。";
    if (!window.confirm(`删除${label}？${deleteEffect}原图片文件仍会保留。`)) return;

    const slotButtons = slotElement.querySelectorAll("button");
    slotElement.classList.add("is-uploading");
    slotButtons.forEach((button) => { button.disabled = true; });
    try {
      const response = await fetch(`/api/styles/${encodeURIComponent(styleId)}/images/${encodeURIComponent(slotId)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "删除失败");
      state = result.state;
      expandedCounts.view.delete(styleId);
      expandedCounts.color.delete(styleId);
      render();
      showToast(isDynamicSlot ? `${label}已删除，后面的图片已自动前移。` : `${label}已删除，可以重新上传。`);
    } catch (error) {
      slotElement.classList.remove("is-uploading");
      slotButtons.forEach((button) => { button.disabled = false; });
      showToast(error.message || "删除失败，请重试。", true);
    }
  };

  const bindSlot = (slotElement) => {
    const primaryAction = slotElement.querySelector(".slot-primary-action");
    const replaceButton = slotElement.querySelector(".replace-image-button");
    const deleteButton = slotElement.querySelector(".delete-image-button");
    primaryAction.addEventListener("click", () => {
      if (slotElement.classList.contains("has-image")) openPreview(slotElement);
      else chooseReplacement(slotElement);
    });
    replaceButton.addEventListener("click", () => chooseReplacement(slotElement));
    deleteButton.addEventListener("click", () => deleteImage(slotElement));
    slotElement.addEventListener("dragover", (event) => {
      event.preventDefault();
      slotElement.classList.add("is-dragging");
    });
    slotElement.addEventListener("dragleave", () => slotElement.classList.remove("is-dragging"));
    slotElement.addEventListener("drop", (event) => {
      event.preventDefault();
      slotElement.classList.remove("is-dragging");
      const file = event.dataTransfer.files?.[0];
      if (file) uploadFile(slotElement, file);
    });
  };

  const createImageSlot = (record, slotId, className, label, visibleLabel = null, editable = true) => {
    const source = record.images?.[slotId] || null;
    if (!editable && !source) return null;
    const slotElement = document.createElement("div");
    slotElement.className = `image-slot ${className}`;
    slotElement.classList.toggle("is-readonly", !editable);
    slotElement.dataset.slot = slotId;
    slotElement.dataset.label = label;

    const primaryAction = document.createElement("button");
    primaryAction.className = "slot-primary-action";
    primaryAction.type = "button";
    const mark = document.createElement("span");
    mark.className = "upload-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "＋";
    primaryAction.append(mark);
    slotElement.append(primaryAction);

    if (visibleLabel) {
      const text = document.createElement("span");
      text.className = "slot-label";
      text.textContent = visibleLabel;
      slotElement.append(text);
    }

    const replaceButton = document.createElement("button");
    replaceButton.className = "replace-image-button";
    replaceButton.type = "button";
    replaceButton.textContent = "替换";
    replaceButton.setAttribute("aria-label", `替换${label}`);
    replaceButton.hidden = true;
    slotElement.append(replaceButton);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-image-button";
    deleteButton.type = "button";
    deleteButton.textContent = "删除";
    deleteButton.setAttribute("aria-label", `删除${label}`);
    deleteButton.hidden = true;
    slotElement.append(deleteButton);

    setImage(slotElement, source);
    if (editable) bindSlot(slotElement);
    else {
      replaceButton.hidden = true;
      deleteButton.hidden = true;
      primaryAction.addEventListener("click", () => openPreview(slotElement));
    }
    return slotElement;
  };

  const createAddControl = (styleId, type, count) => {
    const config = groupConfigs[type];
    const controls = document.createElement("div");
    controls.className = "group-controls";
    const addButton = document.createElement("button");
    addButton.className = "add-slot-button";
    addButton.type = "button";
    addButton.textContent = config.addText;
    addButton.setAttribute("aria-label", `增加${config.name}`);
    addButton.addEventListener("click", () => {
      if (count >= maxDynamicSlots) return showToast(`${config.name}最多支持 ${maxDynamicSlots} 张。`, true);
      const newCount = count + 1;
      expandedCounts[type].set(styleId, newCount);
      render();
    });
    controls.append(addButton);
    return controls;
  };

  const createViewSections = (styleId, record, editable = true) => {
    const count = getGroupCount(styleId, record, "view", editable);
    if (!count && !editable) return [];
    const primary = document.createElement("section");
    primary.className = "slot-group view-group";
    primary.setAttribute("aria-label", "视角图");
    const primaryGrid = document.createElement("div");
    primaryGrid.className = "group-slot-grid view-primary-grid";
    primaryGrid.dataset.count = String(Math.min(3, count));
    for (let index = 1; index <= Math.min(3, count); index += 1) {
      const slotId = `view-${slotNumber(index)}`;
      const slot = createImageSlot(record, slotId, "group-image-slot", `视角图 ${slotNumber(index)}`, null, editable);
      if (slot) primaryGrid.append(slot);
    }
    primary.append(primaryGrid);
    if (editable) primary.append(createAddControl(styleId, "view", count));

    const sections = [primary];
    if (count > 3) {
      const extra = document.createElement("section");
      extra.className = "slot-group extra-view-group";
      extra.setAttribute("aria-label", "更多视角图");
      const extraGrid = document.createElement("div");
      extraGrid.className = "extra-view-grid";
      extraGrid.dataset.count = String(count - 3);
      for (let index = 4; index <= count; index += 1) {
        const slotId = `view-${slotNumber(index)}`;
        const slot = createImageSlot(record, slotId, "group-image-slot", `视角图 ${slotNumber(index)}`, null, editable);
        if (slot) extraGrid.append(slot);
      }
      extra.append(extraGrid);
      sections.push(extra);
    }
    return sections;
  };

  const createColorPanel = (styleId, record, editable = true) => {
    const count = getGroupCount(styleId, record, "color", editable);
    if (!count && !editable) return null;
    const panel = document.createElement("section");
    panel.className = "slot-group color-group";
    panel.setAttribute("aria-label", "配色参考");
    if (editable) panel.append(createAddControl(styleId, "color", count));

    const slotGrid = document.createElement("div");
    slotGrid.className = "color-slot-grid";
    slotGrid.dataset.count = String(count);
    for (let index = 1; index <= count; index += 1) {
      const slotId = `color-${slotNumber(index)}`;
      const label = `配色参考 ${slotNumber(index)}`;
      const slot = createImageSlot(record, slotId, "group-image-slot", label, label, editable);
      if (slot) slotGrid.append(slot);
    }
    panel.append(slotGrid);
    return panel;
  };

  const updateStyleCategory = async (styleId, category, select) => {
    select.disabled = true;
    try {
      const wasPublished = state.styles[styleId]?.status === "published";
      const response = await fetch(`/api/styles/${encodeURIComponent(styleId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "品类保存失败");
      state = result.state;
      currentPage = 1;
      render();
      showToast(wasPublished && state.styles[styleId]?.status === "draft" ? `已归入${categoryLabels[category]}，款式已自动转为草稿。` : `已归入${categoryLabels[category]}。`);
    } catch (error) {
      select.disabled = false;
      select.value = state.styles[styleId]?.category || defaultCategory;
      showToast(error.message || "品类保存失败，请重试。", true);
    }
  };

  const createCategoryControl = (styleId, record) => {
    const field = document.createElement("label");
    field.className = "style-category-field";
    const label = document.createElement("span");
    label.textContent = "品类";
    const select = document.createElement("select");
    select.setAttribute("aria-label", "设置这个款式的品类");
    categoryOptions.slice(1).forEach((item) => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      option.selected = (record.category || defaultCategory) === item.value;
      select.append(option);
    });
    select.addEventListener("change", () => updateStyleCategory(styleId, select.value, select));
    field.append(label, select);
    return field;
  };

  const updateStyleStatus = async (styleId, status, select) => {
    select.disabled = true;
    try {
      const response = await fetch(`/api/styles/${encodeURIComponent(styleId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "状态保存失败");
      state = result.state;
      currentPage = 1;
      render();
      showToast(status === "published" ? "款式已发布，订阅端现在可见。" : `款式已转为${statusLabels[status]}，订阅端不再展示。`);
    } catch (error) {
      select.disabled = false;
      select.value = state.styles[styleId]?.status || "unpublished";
      showToast(error.message || "状态保存失败，请重试。", true);
    }
  };

  const createStatusControl = (styleId, record) => {
    const field = document.createElement("label");
    field.className = "style-status-field";
    const label = document.createElement("span");
    label.textContent = "状态";
    const select = document.createElement("select");
    select.setAttribute("aria-label", "设置这个款式的发布状态");
    statusOptions.slice(1).forEach((item) => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      option.selected = (record.status || "unpublished") === item.value;
      select.append(option);
    });
    select.addEventListener("change", () => updateStyleStatus(styleId, select.value, select));
    field.append(label, select);
    return field;
  };

  const createCard = (styleId, record) => {
    const editable = !isSubscriberView;
    const card = document.createElement("article");
    card.className = "style-card";
    card.classList.toggle("subscriber-style-card", !editable);
    card.dataset.styleId = styleId;
    card.setAttribute("aria-label", "鞋款图片组");

    let removeButton = null;
    let cardToolbar = null;
    if (editable) {
      removeButton = document.createElement("button");
      removeButton.className = "remove-style-button";
      removeButton.type = "button";
      removeButton.textContent = "×";
      removeButton.setAttribute("aria-label", "移除这个款式");
      removeButton.addEventListener("click", async () => {
        if (!window.confirm("移除这个款式？已上传的原图片文件仍会保留。")) return;
        try {
          const response = await fetch(`/api/styles/${encodeURIComponent(styleId)}`, { method: "DELETE" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "移除失败");
          state = result.state;
          render();
          showToast("款式已从展示列表移除，原图片文件仍保留。");
        } catch (error) {
          showToast(error.message || "移除失败，请重试。", true);
        }
      });

      cardToolbar = document.createElement("div");
      cardToolbar.className = "style-card-toolbar";
      const batchButton = document.createElement("button");
      batchButton.className = "batch-import-button";
      batchButton.type = "button";
      batchButton.innerHTML = '<span aria-hidden="true">＋</span> 批量导入本款';
      batchButton.addEventListener("click", () => {
        batchTargetStyleId = styleId;
        batchFileInput.value = "";
        batchFileInput.click();
      });
      const settings = document.createElement("div");
      settings.className = "style-card-settings";
      settings.append(createStatusControl(styleId, record), createCategoryControl(styleId, record));
      cardToolbar.append(batchButton, settings);
    }

    const mediaGrid = document.createElement("div");
    mediaGrid.className = "media-grid";
    const viewSections = createViewSections(styleId, record, editable);
    mediaGrid.classList.toggle("has-no-views", viewSections.length === 0);
    const mainSlot = createImageSlot(record, "master", "slot-main", "主图", "主图", editable);
    const colorPanel = createColorPanel(styleId, record, editable);
    if (mainSlot) mediaGrid.append(mainSlot);
    mediaGrid.append(...viewSections);
    if (colorPanel) mediaGrid.append(colorPanel);
    if (removeButton) card.append(removeButton);
    if (cardToolbar) card.append(cardToolbar);
    card.append(mediaGrid);
    return card;
  };

  const render = () => {
    const order = Array.isArray(state.order) ? state.order : Object.keys(state.styles || {});
    const statusOrder = isSubscriberView
      ? order.filter((styleId) => state.styles[styleId]?.status === "published")
      : selectedStatus === "all"
        ? order
        : order.filter((styleId) => (state.styles[styleId]?.status || "unpublished") === selectedStatus);
    const filteredOrder = selectedCategory === "all"
      ? statusOrder
      : statusOrder.filter((styleId) => (state.styles[styleId]?.category || defaultCategory) === selectedCategory);
    const totalPages = Math.max(1, Math.ceil(filteredOrder.length / pageSize));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (currentPage - 1) * pageSize;
    const visibleIds = filteredOrder.slice(start, start + pageSize);

    grid.replaceChildren();
    if (!visibleIds.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      if (isSubscriberView) empty.textContent = selectedCategory === "all" ? "暂无已发布款式。" : `暂无已发布的${categoryLabels[selectedCategory]}款式。`;
      else if (selectedStatus !== "all") empty.textContent = `当前没有${statusLabels[selectedStatus]}${selectedCategory === "all" ? "" : `的${categoryLabels[selectedCategory]}`}款式。`;
      else empty.textContent = selectedCategory === "all" ? "点击“新增款式”建立第一个鞋款。" : `当前没有${categoryLabels[selectedCategory]}款式，可点击“新增款式”开始添加。`;
      grid.append(empty);
    } else {
      visibleIds.forEach((styleId) => grid.append(createCard(styleId, state.styles[styleId] || { images: {} })));
    }

    styleCount.textContent = isSubscriberView
      ? `${filteredOrder.length} 款`
      : filteredOrder.length === order.length ? `${order.length} 款` : `${filteredOrder.length} 款 · 共 ${order.length} 款`;

    if (!isSubscriberView) {
      statusFilter.replaceChildren();
      statusOptions.forEach((item) => {
        const count = item.value === "all"
          ? order.length
          : order.filter((styleId) => (state.styles[styleId]?.status || "unpublished") === item.value).length;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "status-filter-button";
        button.classList.toggle("is-active", selectedStatus === item.value);
        button.setAttribute("aria-pressed", String(selectedStatus === item.value));
        button.innerHTML = `<span>${item.label}</span><small>${count}</small>`;
        button.addEventListener("click", () => {
          selectedStatus = item.value;
          currentPage = 1;
          render();
        });
        statusFilter.append(button);
      });
    }

    categoryFilter.replaceChildren();
    categoryOptions.forEach((item) => {
      const count = item.value === "all"
        ? statusOrder.length
        : statusOrder.filter((styleId) => (state.styles[styleId]?.category || defaultCategory) === item.value).length;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-filter-button";
      button.dataset.category = item.value;
      button.classList.toggle("is-active", selectedCategory === item.value);
      button.setAttribute("aria-pressed", String(selectedCategory === item.value));
      button.innerHTML = `<span>${item.label}</span><small>${count}</small>`;
      button.addEventListener("click", () => {
        selectedCategory = item.value;
        currentPage = 1;
        render();
      });
      categoryFilter.append(button);
    });
    pagination.hidden = totalPages <= 1;
    pageStatus.textContent = `${currentPage} / ${totalPages}`;
    previousPage.disabled = currentPage <= 1;
    nextPage.disabled = currentPage >= totalPages;
  };

  const loadGallery = async () => {
    try {
      const response = await fetch("/api/gallery", { cache: "no-store" });
      if (!response.ok) throw new Error("读取失败");
      state = await response.json();
      render();
    } catch {
      showToast("图片存储服务未连接，请使用 4174 本地预览地址。", true);
    }
  };

  addStyleButton.addEventListener("click", async () => {
    addStyleButton.disabled = true;
    try {
      const category = selectedCategory === "all" ? defaultCategory : selectedCategory;
      const response = await fetch("/api/styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "新增失败");
      state = result.state;
      selectedCategory = category;
      selectedStatus = "unpublished";
      currentPage = 1;
      render();
      showToast(`新款式已建立并进入“未发布”，可以开始上传图片。`);
    } catch (error) {
      showToast(error.message || "新增失败，请重试。", true);
    } finally {
      addStyleButton.disabled = false;
    }
  });

  previousPage.addEventListener("click", () => { currentPage -= 1; render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  nextPage.addEventListener("click", () => { currentPage += 1; render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (targetSlot && file) uploadFile(targetSlot, file);
  });
  batchFileInput.addEventListener("change", () => {
    const files = Array.from(batchFileInput.files || []);
    if (!batchTargetStyleId || !files.length) return;
    if (files.length > 40) {
      batchFileInput.value = "";
      return showToast("单次最多选择 40 张图片，请分两次导入。", true);
    }
    openBatchReview(batchTargetStyleId, files);
  });
  batchClose.addEventListener("click", closeBatchDialog);
  batchCancel.addEventListener("click", closeBatchDialog);
  batchConfirm.addEventListener("click", confirmBatchImport);
  batchDialog.addEventListener("cancel", (event) => {
    if (batchUploading) event.preventDefault();
  });
  batchDialog.addEventListener("click", (event) => {
    if (event.target === batchDialog) closeBatchDialog();
  });
  batchDialog.addEventListener("close", clearBatchSession);
  previewClose.addEventListener("click", () => previewDialog.close());
  previewDialog.addEventListener("click", (event) => {
    if (event.target === previewDialog) previewDialog.close();
  });
  previewDialog.addEventListener("close", () => previewImage.removeAttribute("src"));

  loadGallery();
})();
