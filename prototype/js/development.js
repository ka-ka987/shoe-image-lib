(function () {
  "use strict";

  const app = document.getElementById("gallery-app");
  const grid = document.getElementById("style-grid");
  const fileInput = document.getElementById("image-file-input");
  const toast = document.getElementById("upload-toast");
  const styleCount = document.getElementById("style-count");
  const addStyleButton = document.getElementById("add-style-button");
  const pagination = document.getElementById("pagination");
  const previousPage = document.getElementById("previous-page");
  const nextPage = document.getElementById("next-page");
  const pageStatus = document.getElementById("page-status");
  const previewDialog = document.getElementById("image-preview-dialog");
  const previewImage = document.getElementById("image-preview-image");
  const previewCaption = document.getElementById("image-preview-caption");
  const previewClose = document.getElementById("image-preview-close");
  if (!app || !grid || !fileInput || !toast || !previewDialog) return;

  const pageSize = 4;
  const maxDynamicSlots = 30;
  const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);
  const maxFileBytes = 12 * 1024 * 1024;
  const groupConfigs = {
    view: { prefix: "view", minimum: 3, addText: "＋ 视角", name: "视角图" },
    color: { prefix: "color", minimum: 0, addText: "＋ 配色", name: "配色参考" }
  };

  let state = { styles: {}, order: [] };
  let currentPage = 1;
  let targetSlot = null;
  let toastTimer = null;
  const expandedCounts = { view: new Map(), color: new Map() };

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

  const getGroupCount = (styleId, record, type) => {
    const config = groupConfigs[type];
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
      setImage(slotElement, result.path);
      showToast("图片已保存，刷新页面后仍会保留。");
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

  const createImageSlot = (record, slotId, className, label, visibleLabel = null) => {
    const slotElement = document.createElement("div");
    slotElement.className = `image-slot ${className}`;
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

    setImage(slotElement, record.images?.[slotId] || null);
    bindSlot(slotElement);
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

  const createViewSections = (styleId, record) => {
    const count = getGroupCount(styleId, record, "view");
    const primary = document.createElement("section");
    primary.className = "slot-group view-group";
    primary.setAttribute("aria-label", "视角图");
    const primaryGrid = document.createElement("div");
    primaryGrid.className = "group-slot-grid view-primary-grid";
    for (let index = 1; index <= Math.min(3, count); index += 1) {
      const slotId = `view-${slotNumber(index)}`;
      primaryGrid.append(createImageSlot(record, slotId, "group-image-slot", `视角图 ${slotNumber(index)}`));
    }
    primary.append(primaryGrid, createAddControl(styleId, "view", count));

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
        extraGrid.append(createImageSlot(record, slotId, "group-image-slot", `视角图 ${slotNumber(index)}`));
      }
      extra.append(extraGrid);
      sections.push(extra);
    }
    return sections;
  };

  const createColorPanel = (styleId, record) => {
    const count = getGroupCount(styleId, record, "color");
    const panel = document.createElement("section");
    panel.className = "slot-group color-group";
    panel.setAttribute("aria-label", "配色参考");
    panel.append(createAddControl(styleId, "color", count));

    const slotGrid = document.createElement("div");
    slotGrid.className = "color-slot-grid";
    slotGrid.dataset.count = String(count);
    for (let index = 1; index <= count; index += 1) {
      const slotId = `color-${slotNumber(index)}`;
      const label = `配色参考 ${slotNumber(index)}`;
      slotGrid.append(createImageSlot(record, slotId, "group-image-slot", label, label));
    }
    panel.append(slotGrid);
    return panel;
  };

  const createCard = (styleId, record) => {
    const card = document.createElement("article");
    card.className = "style-card";
    card.dataset.styleId = styleId;
    card.setAttribute("aria-label", "鞋款图片组");

    const removeButton = document.createElement("button");
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
        const totalPages = Math.max(1, Math.ceil(state.order.length / pageSize));
        currentPage = Math.min(currentPage, totalPages);
        render();
        showToast("款式已从展示列表移除，原图片文件仍保留。");
      } catch (error) {
        showToast(error.message || "移除失败，请重试。", true);
      }
    });

    const mediaGrid = document.createElement("div");
    mediaGrid.className = "media-grid";
    const viewSections = createViewSections(styleId, record);
    mediaGrid.append(
      createImageSlot(record, "master", "slot-main", "主图", "主图"),
      ...viewSections,
      createColorPanel(styleId, record)
    );
    card.append(removeButton, mediaGrid);
    return card;
  };

  const render = () => {
    const order = Array.isArray(state.order) ? state.order : Object.keys(state.styles || {});
    const totalPages = Math.max(1, Math.ceil(order.length / pageSize));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (currentPage - 1) * pageSize;
    const visibleIds = order.slice(start, start + pageSize);

    grid.replaceChildren();
    if (!visibleIds.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "点击“新增款式”建立第一个鞋款。";
      grid.append(empty);
    } else {
      visibleIds.forEach((styleId) => grid.append(createCard(styleId, state.styles[styleId] || { images: {} })));
    }

    styleCount.textContent = `${order.length} 款`;
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
      const response = await fetch("/api/styles", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "新增失败");
      state = result.state;
      currentPage = 1;
      render();
      showToast("新款式已建立，可以开始上传图片。");
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
  previewClose.addEventListener("click", () => previewDialog.close());
  previewDialog.addEventListener("click", (event) => {
    if (event.target === previewDialog) previewDialog.close();
  });
  previewDialog.addEventListener("close", () => previewImage.removeAttribute("src"));

  loadGallery();
})();
