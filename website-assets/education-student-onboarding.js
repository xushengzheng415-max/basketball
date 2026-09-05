(() => {
  "use strict";
  const API =
    "https://sxf-basketball-d9gp6yt0rd1f7be4d.service.tcloudbase.com/api/education-public";
  const params = new URLSearchParams(location.search),
    gate = params.get("gate") || "";
  const isWechat = /MicroMessenger/i.test(navigator.userAgent);
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ""));
  const sessionFromUrl = fragment.get("session") || "";
  if (sessionFromUrl) {
    localStorage.setItem(`sxf_guardian_${gate}`, sessionFromUrl);
    history.replaceState(
      null,
      "",
      `${location.pathname}?gate=${encodeURIComponent(gate)}`
    );
  }
  let sessionToken =
      sessionFromUrl || localStorage.getItem(`sxf_guardian_${gate}`) || "",
    avatarUrl = "",
    sourceImage = null,
    cropBaseScale = 1,
    cropZoom = 1,
    cropX = 0,
    cropY = 0,
    cropBusy = false,
    serviceQrPollCount = 0,
    gateValidationAttempts = 0,
    bootTimer = 0,
    serviceQrRequested = false,
    oauthRedirecting = false;
  const activePointers = new Map();
  let gesture = null;
  const CROP_FRAME = { left: 72, top: 72, size: 496 };
  const $ = (id) => document.getElementById(id);
  const message = (text) => {
    const el = $("message");
    el.textContent = text;
    el.hidden = false;
    clearTimeout(message.timer);
    message.timer = setTimeout(() => (el.hidden = true), 3000);
  };
  function parseIdentityNumber(value) {
    const number = String(value || "")
      .replace(/\s+/g, "")
      .toUpperCase();
    if (!/^[1-9]\d{16}[\dX]$/.test(number)) return null;
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checks = "10X98765432";
    const total = weights.reduce(
      (sum, weight, index) => sum + Number(number[index]) * weight,
      0
    );
    if (checks[total % 11] !== number[17]) return null;
    const birthDate = `${number.slice(6, 10)}-${number.slice(10, 12)}-${number.slice(12, 14)}`;
    const birth = new Date(`${birthDate}T00:00:00`);
    if (
      Number.isNaN(birth.getTime()) ||
      birth.getFullYear() !== Number(number.slice(6, 10)) ||
      birth.getMonth() + 1 !== Number(number.slice(10, 12)) ||
      birth.getDate() !== Number(number.slice(12, 14)) ||
      birth.getTime() > Date.now()
    )
      return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    if (
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
    )
      age -= 1;
    return {
      number,
      birthDate,
      gender: Number(number[16]) % 2 === 1 ? "男" : "女",
      age,
    };
  }
  function syncIdentityFields(showError = false) {
    const form = $("studentForm");
    const input = form.elements.identityNumber;
    const hint = $("identityHint");
    const value = String(input.value || "")
      .replace(/\s+/g, "")
      .toUpperCase();
    input.value = value;
    hint.className = "";
    if (!value) {
      input.setCustomValidity("");
      hint.textContent = "仅用于身份识别与重复档案校验，系统不保存完整号码";
      return true;
    }
    const identity = parseIdentityNumber(value);
    if (!identity) {
      input.setCustomValidity("请输入有效的18位身份证号");
      hint.className = "invalid";
      hint.textContent = "身份证号格式、出生日期或校验位不正确";
      if (showError) input.reportValidity();
      return false;
    }
    input.setCustomValidity("");
    form.elements.birthDate.value = identity.birthDate;
    form.elements.gender.value = identity.gender;
    hint.className = "valid";
    hint.textContent = `已识别：${identity.gender} · ${identity.birthDate} · ${identity.age}岁`;
    return true;
  }
  async function api(action, payload = {}) {
    const response = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, gateKey: gate, sessionToken, ...payload }),
    });
    const raw = await response.text();
    let data = {};
    try {
      data = JSON.parse(raw);
    } catch (_) {
      throw new Error("服务返回异常");
    }
    if (!data.ok) throw new Error(data.message || "操作失败");
    return data;
  }
  const GATE_RETRY_DELAYS = [450, 800, 1200, 1800];
  function scheduleBoot(delay) {
    window.clearTimeout(bootTimer);
    bootTimer = window.setTimeout(boot, delay);
  }
  function beginWechatIdentity() {
    if (oauthRedirecting || !gate) return;
    oauthRedirecting = true;
    $("authCard").hidden = true;
    $("organizationName").textContent = "正在确认微信身份并进入建档…";
    location.replace(`${API}?action=oauthStart&gate=${encodeURIComponent(gate)}`);
  }
  async function boot() {
    let info;
    try {
      info = await api("gateInfo");
      gateValidationAttempts = 0;
    } catch (error) {
      if (gateValidationAttempts < GATE_RETRY_DELAYS.length) {
        const delay = GATE_RETRY_DELAYS[gateValidationAttempts];
        gateValidationAttempts += 1;
        $("organizationName").textContent = "正在验证建档入口…";
        scheduleBoot(delay);
        return;
      }
      $("organizationName").textContent = "建档入口暂不可用";
      message(error.message);
      return;
    }
    $(
      "organizationName"
    ).textContent = `${info.organizationName} · 家长自主建档`;
    if (info.serviceQrUrl) {
      $("serviceQr").src = info.serviceQrUrl;
      $("serviceQr").hidden = !serviceQrRequested;
    } else if (!sessionToken && serviceQrPollCount < 8) {
      serviceQrPollCount += 1;
      scheduleBoot(1500);
    }
    if (sessionToken) {
      try {
        await api("me");
        $("authCard").hidden = true;
        $("studentForm").hidden = false;
      } catch (error) {
        localStorage.removeItem(`sxf_guardian_${gate}`);
        sessionToken = "";
        if (isWechat) beginWechatIdentity();
        else {
          $("authCard").hidden = false;
          message(error.message);
        }
      }
    } else if (isWechat) {
      beginWechatIdentity();
    } else {
      $("authCard").hidden = false;
    }
  }
  $("confirmIdentity").onclick = () => {
    if (!gate) return message("建档入口参数缺失，请重新扫码");
    beginWechatIdentity();
  };
  $("authorize").onclick = () => {
    serviceQrRequested = true;
    if ($("serviceQr").src) {
      $("serviceQr").hidden = false;
      $("serviceQr").scrollIntoView({ behavior: "smooth", block: "center" });
      message("未关注的家长请长按识别二维码，关注后从服务号消息进入");
    } else {
      message("服务号二维码正在准备，请稍候");
    }
  };
  function canvasPoint(event) {
    const canvas = $("cropCanvas");
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }
  function clampCrop() {
    if (!sourceImage) return;
    const width = sourceImage.naturalWidth * cropBaseScale * cropZoom;
    const height = sourceImage.naturalHeight * cropBaseScale * cropZoom;
    cropX = Math.min(
      CROP_FRAME.left,
      Math.max(CROP_FRAME.left + CROP_FRAME.size - width, cropX)
    );
    cropY = Math.min(
      CROP_FRAME.top,
      Math.max(CROP_FRAME.top + CROP_FRAME.size - height, cropY)
    );
  }
  function drawCrop() {
    if (!sourceImage) return;
    const canvas = $("cropCanvas");
    const context = canvas.getContext("2d");
    const width = sourceImage.naturalWidth * cropBaseScale * cropZoom;
    const height = sourceImage.naturalHeight * cropBaseScale * cropZoom;
    clampCrop();
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(sourceImage, cropX, cropY, width, height);
    $("cropZoomText").textContent = String(Math.round(cropZoom * 100)) + "%";
  }
  function setCropZoom(value, anchor) {
    if (!sourceImage) return;
    const canvas = $("cropCanvas");
    const oldZoom = cropZoom;
    const nextZoom = Math.max(1, Math.min(3, Number(value) || 1));
    const point = anchor || {
      x: CROP_FRAME.left + CROP_FRAME.size / 2,
      y: CROP_FRAME.top + CROP_FRAME.size / 2,
    };
    const imageX = (point.x - cropX) / oldZoom;
    const imageY = (point.y - cropY) / oldZoom;
    cropZoom = nextZoom;
    cropX = point.x - imageX * cropZoom;
    cropY = point.y - imageY * cropZoom;
    drawCrop();
  }
  function openCropper(file) {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const canvas = $("cropCanvas");
      sourceImage = image;
      cropBaseScale = Math.max(
        CROP_FRAME.size / image.naturalWidth,
        CROP_FRAME.size / image.naturalHeight
      );
      cropZoom = 1;
      cropX =
        CROP_FRAME.left +
        (CROP_FRAME.size - image.naturalWidth * cropBaseScale) / 2;
      cropY =
        CROP_FRAME.top +
        (CROP_FRAME.size - image.naturalHeight * cropBaseScale) / 2;
      drawCrop();
      $("cropDialog").hidden = false;
      $("photoProgress").textContent = "第2步：调整裁剪";
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      message("照片读取失败，请重新选择");
    };
    image.src = objectUrl;
  }
  function cropDataUrl() {
    return new Promise((resolve, reject) => {
      const source = $("cropCanvas");
      const output = document.createElement("canvas");
      output.width = 320;
      output.height = 320;
      const context = output.getContext("2d");
      context.clearRect(0, 0, 320, 320);
      context.drawImage(
        source,
        CROP_FRAME.left,
        CROP_FRAME.top,
        CROP_FRAME.size,
        CROP_FRAME.size,
        0,
        0,
        320,
        320
      );
      output.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("裁剪失败，请重试"));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("裁剪图片读取失败"));
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.92
      );
    });
  }

  $("photo").onchange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type))
      return message("请选择JPG、PNG或WEBP照片");
    if (file.size > 20 * 1024 * 1024) return message("请选择20MB以内的照片");
    $("photoProgress").textContent = "第1步：照片已载入";
    openCropper(file);
  };
  $("choosePhoto").onclick = () => $("photo").click();
  $("studentForm").elements.identityNumber.addEventListener("input", () => {
    const value = $("studentForm").elements.identityNumber.value.replace(/\s+/g, "");
    if (!value || value.length === 18) syncIdentityFields(false);
    else {
      $("studentForm").elements.identityNumber.setCustomValidity("");
      $("identityHint").className = "";
      $("identityHint").textContent = "输入完整18位号码后自动识别";
    }
  });
  $("studentForm").elements.identityNumber.addEventListener("blur", () =>
    syncIdentityFields(false)
  );
  $("zoomOut").onclick = () => setCropZoom(cropZoom - 0.2);
  $("zoomIn").onclick = () => setCropZoom(cropZoom + 0.2);
  $("cropCanvas").onpointerdown = (event) => {
    event.preventDefault();
    $("cropCanvas").setPointerCapture(event.pointerId);
    activePointers.set(event.pointerId, canvasPoint(event));
    const points = Array.from(activePointers.values());
    if (points.length === 1) {
      gesture = {
        type: "move",
        point: points[0],
        x: cropX,
        y: cropY,
      };
    } else if (points.length === 2) {
      gesture = {
        type: "scale",
        distance:
          Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) || 1,
        zoom: cropZoom,
        anchor: {
          x: (points[0].x + points[1].x) / 2,
          y: (points[0].y + points[1].y) / 2,
        },
      };
    }
  };
  $("cropCanvas").onpointermove = (event) => {
    if (!activePointers.has(event.pointerId) || !gesture) return;
    activePointers.set(event.pointerId, canvasPoint(event));
    const points = Array.from(activePointers.values());
    if (points.length === 1 && gesture.type === "move") {
      cropX = gesture.x + points[0].x - gesture.point.x;
      cropY = gesture.y + points[0].y - gesture.point.y;
      drawCrop();
      return;
    }
    if (points.length === 2) {
      if (gesture.type !== "scale") {
        gesture = {
          type: "scale",
          distance:
            Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) ||
            1,
          zoom: cropZoom,
          anchor: {
            x: (points[0].x + points[1].x) / 2,
            y: (points[0].y + points[1].y) / 2,
          },
        };
        return;
      }
      const distance =
        Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) || 1;
      setCropZoom(gesture.zoom * (distance / gesture.distance), gesture.anchor);
    }
  };
  const endPointer = (event) => {
    activePointers.delete(event.pointerId);
    gesture = null;
    const points = Array.from(activePointers.values());
    if (points.length === 1) {
      gesture = { type: "move", point: points[0], x: cropX, y: cropY };
    }
  };
  $("cropCanvas").onpointerup = endPointer;
  $("cropCanvas").onpointercancel = endPointer;
  const cancelCrop = () => {
    if (cropBusy) return;
    $("cropDialog").hidden = true;
    $("photo").value = "";
    $("photoProgress").textContent = "尚未选择照片";
  };
  $("cancelCrop").onclick = cancelCrop;
  $("cancelCropAction").onclick = cancelCrop;
  $("confirmCrop").onclick = async () => {
    if (cropBusy || !sourceImage) return;
    cropBusy = true;
    const button = $("confirmCrop");
    button.disabled = true;
    button.textContent = "智能抠图中…";
    $("photoProgress").textContent = "第3步：人像分割处理中";
    try {
      const cropped = await cropDataUrl();
      const result = await api("uploadAvatar", {
        mime: "image/jpeg",
        base64: cropped,
      });
      avatarUrl = result.fileID;
      $("photoPreview").src = result.previewUrl || cropped;
      $("photoPreview").hidden = false;
      $("photoPlaceholder").hidden = true;
      $("choosePhoto").textContent = "更换头像";
      $("photoProgress").textContent = "裁剪与人像分割已完成";
      $("cropDialog").hidden = true;
      message("透明头像已生成");
    } catch (error) {
      $("photoProgress").textContent = "处理失败，请重新裁剪";
      message(error.message);
    } finally {
      cropBusy = false;
      button.disabled = false;
      button.textContent = "裁剪并智能抠图";
    }
  };
  $("studentForm").onsubmit = async (event) => {
    event.preventDefault();
    if (!syncIdentityFields(true)) return;
    const button = $("submit");
    button.disabled = true;
    button.textContent = "正在提交…";
    try {
      const values = Object.fromEntries(new FormData(event.target).entries());
      values.privacyConsent = event.target.privacyConsent.checked;
      values.avatarUrl = avatarUrl;
      const result = await api("submitStudent", { student: values });
      $("studentForm").hidden = true;
      $("success").hidden = false;
      if (result.duplicate)
        $("success").querySelector("p").textContent =
          "该孩子的档案已经提交，无需重复建立。";
    } catch (error) {
      message(error.message);
    } finally {
      button.disabled = false;
      button.textContent = "提交校区确认";
    }
  };
  $("addAnother").onclick = () => {
    $("success").hidden = true;
    $("studentForm").hidden = false;
    $("studentForm").reset();
    avatarUrl = "";
    $("photoPreview").removeAttribute("src");
    $("photoPreview").hidden = true;
    $("photoPlaceholder").hidden = false;
    $("choosePhoto").textContent = "上传头像";
    $("photoProgress").textContent = "尚未选择照片";
  };
  boot();
})();
