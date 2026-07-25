const RESOURCE_APPID = 'wx57164cca8676f411';
const RESOURCE_ENV = 'sxf-basketball-d9gp6yt0rd1f7be4d';
const LEGACY_CLOUD_PREFIX =
  'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/';
const RESOURCE_CLOUD_PREFIX =
  'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/';
const LEGACY_BUCKET = '636c-cloudbase-d4g93f0re5f3274c1-1446269281';
const RESOURCE_BUCKET = '7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905';

let sharedCloud = null;
let cloudReady = null;
const tempFileUrlCache = Object.create(null);

function initCloud() {
  if (!wx.cloud || !wx.cloud.Cloud) {
    return Promise.reject(new Error('wx.cloud.Cloud unavailable'));
  }
  if (!sharedCloud) {
    sharedCloud = new wx.cloud.Cloud({
      resourceAppid: RESOURCE_APPID,
      resourceEnv: RESOURCE_ENV
    });
    cloudReady = Promise.resolve(sharedCloud.init()).then(() => sharedCloud);
  }
  return cloudReady;
}

function invoke(method, options) {
  const sourceOptions = options || {};
  return initCloud().then((instance) => new Promise((resolve, reject) => {
    let settled = false;
    const succeed = (result) => {
      if (settled) return;
      settled = true;
      if (typeof sourceOptions.success === 'function') sourceOptions.success(result);
      resolve(result);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      if (typeof sourceOptions.fail === 'function') sourceOptions.fail(error);
      reject(error);
    };
    const requestOptions = Object.assign({}, sourceOptions, {
      success: succeed,
      fail
    });
    try {
      const result = instance[method](requestOptions);
      if (result && typeof result.then === 'function') result.then(succeed, fail);
    } catch (error) {
      fail(error);
    }
  }));
}

const cloud = {
  callFunction(options) {
    return invoke('callFunction', options);
  },
  uploadFile(options) {
    return invoke('uploadFile', options);
  },
  downloadFile(options) {
    return invoke('downloadFile', options);
  },
  getTempFileURL(options) {
    return invoke('getTempFileURL', options);
  },
  deleteFile(options) {
    return invoke('deleteFile', options);
  }
};

function callCloud(name, data) {
  return cloud.callFunction({ name, data }).then((res) => res.result || res).catch((error) => {
    console.warn(`[cloud] ${name} failed`, error);
    return { ok: false, error };
  });
}

function normalizeCloudFileID(value) {
  if (typeof value !== 'string') return value;
  if (value.indexOf(LEGACY_CLOUD_PREFIX) === 0) {
    return RESOURCE_CLOUD_PREFIX + value.slice(LEGACY_CLOUD_PREFIX.length);
  }
  if (
    /^https?:\/\//i.test(value) &&
    (value.indexOf(LEGACY_BUCKET) >= 0 || value.indexOf(RESOURCE_BUCKET) >= 0)
  ) {
    const pathMatch = value.match(/^https?:\/\/[^/]+\/([^?#]+)/i);
    if (pathMatch && pathMatch[1]) {
      return RESOURCE_CLOUD_PREFIX + decodeURIComponent(pathMatch[1]);
    }
  }
  return value;
}

function isCloudFileID(value) {
  return typeof normalizeCloudFileID(value) === 'string' &&
    normalizeCloudFileID(value).indexOf('cloud://') === 0;
}

function preservesCloudFileID(key) {
  const name = String(key || '');
  return name === 'id' ||
    name === 'source' ||
    name === 'selectedSource' ||
    name === 'src' ||
    /fileid$/i.test(name);
}

function collectCloudFileIDs(value, result, key) {
  const output = result || [];
  if (isCloudFileID(value)) {
    const fileID = normalizeCloudFileID(value);
    if (!preservesCloudFileID(key) && !output.includes(fileID)) output.push(fileID);
    return output;
  }
  if (!value || typeof value !== 'object') return output;
  if (Array.isArray(value)) {
    value.forEach((item) => collectCloudFileIDs(item, output, key));
    return output;
  }
  Object.keys(value).forEach((childKey) => collectCloudFileIDs(value[childKey], output, childKey));
  return output;
}

function mapCloudFileURLs(value, urlMap, key) {
  if (isCloudFileID(value)) {
    const fileID = normalizeCloudFileID(value);
    return preservesCloudFileID(key) ? fileID : (urlMap[fileID] || fileID);
  }
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => mapCloudFileURLs(item, urlMap, key));
  const output = {};
  Object.keys(value).forEach((childKey) => {
    output[childKey] = mapCloudFileURLs(value[childKey], urlMap, childKey);
  });
  return output;
}

function rememberTempUrls(result, urlMap) {
  const fileList = result && Array.isArray(result.fileList) ? result.fileList : [];
  fileList.forEach((item) => {
    if (!item || !item.fileID || !item.tempFileURL) return;
    tempFileUrlCache[item.fileID] = item.tempFileURL;
    urlMap[item.fileID] = item.tempFileURL;
  });
}

async function resolveCloudFileURLs(fileIDs) {
  const unique = Array.from(new Set((fileIDs || []).filter(isCloudFileID).map(normalizeCloudFileID)));
  const urlMap = {};
  const pending = [];
  unique.forEach((fileID) => {
    if (tempFileUrlCache[fileID]) urlMap[fileID] = tempFileUrlCache[fileID];
    else pending.push(fileID);
  });

  for (let index = 0; index < pending.length; index += 50) {
    const batch = pending.slice(index, index + 50);
    try {
      const result = await cloud.getTempFileURL({ fileList: batch });
      rememberTempUrls(result, urlMap);
    } catch (error) {
      console.warn('[cloud] shared storage URL lookup failed, using function fallback', error);
    }
    const unresolved = batch.filter((fileID) => !urlMap[fileID]);
    if (!unresolved.length) continue;
    try {
      const response = await cloud.callFunction({
        name: 'sxGetAudioUrl',
        data: { fileList: unresolved }
      });
      const result = response && response.result ? response.result : response;
      rememberTempUrls(result, urlMap);
    } catch (error) {
      console.warn('[cloud] function storage URL lookup failed', error);
    }
  }
  return urlMap;
}

async function resolveCloudData(value) {
  const fileIDs = collectCloudFileIDs(value);
  if (!fileIDs.length) return value;
  const urlMap = await resolveCloudFileURLs(fileIDs);
  return mapCloudFileURLs(value, urlMap);
}

function installSharedResourcePageAdapter() {
  if (typeof Page !== 'function' || Page.__sxfSharedResourceAdapter) return;
  const nativePage = Page;
  const wrappedPage = function wrappedPage(options) {
    const config = Object.assign({}, options);
    const originalOnLoad = config.onLoad;
    config.onLoad = function onLoadWithSharedResources() {
      const page = this;
      const nativeSetData = page.setData.bind(page);
      if (!page.__sxfSharedSetDataInstalled) {
        page.__sxfSharedSetDataInstalled = true;
        page.setData = function setDataWithSharedResources(data, callback) {
          nativeSetData(data, callback);
          resolveCloudData(data).then((resolved) => {
            if (resolved !== data) nativeSetData(resolved);
          }).catch((error) => console.warn('[cloud] page data resource resolution failed', error));
        };
      }
      const result = typeof originalOnLoad === 'function'
        ? originalOnLoad.apply(page, arguments)
        : undefined;
      resolveCloudData(page.data).then((resolved) => {
        if (resolved !== page.data) nativeSetData(resolved);
      }).catch((error) => console.warn('[cloud] initial page resource resolution failed', error));
      return result;
    };
    return nativePage(config);
  };
  wrappedPage.__sxfSharedResourceAdapter = true;
  Page = wrappedPage;
}

module.exports = {
  RESOURCE_APPID,
  RESOURCE_ENV,
  callCloud,
  cloud,
  initCloud,
  installSharedResourcePageAdapter,
  isCloudFileID,
  normalizeCloudFileID,
  resolveCloudData,
  resolveCloudFileURLs
};
