(() => {
  const STORAGE_KEY = "dsco_state_v1";
  const ENABLE_KEY = "dsco_enabled_v1";

  const state = {
    projects: [],
    chatToProject: {},
    enabled: false,
  };

  const ui = {
    root: null,
    list: null,
    select: null,
    status: null,
    assignBtn: null,
    unassignBtn: null,
  };

  let sidebarObserver = null;
  let sidebarRoot = null;
  let renderQueued = false;
  let lastStatusText = null;
  let lastAssignDisabled = null;
  let lastUnassignDisabled = null;
  let lastSelectKey = null;
  let lastListKey = null;
  let lastUrlHref = null;
  let urlWatchTimer = null;

  function safeId() {
    const path = window.location.pathname || "";
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    const last = parts[parts.length - 1];
    if (!last || last.length < 6) return null;
    return last;
  }

  function getCurrentChatId() {
    return safeId();
  }

  function loadState() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([STORAGE_KEY, ENABLE_KEY], (syncResult) => {
        const saved = syncResult[STORAGE_KEY];
        if (saved && typeof saved === "object") {
          state.projects = Array.isArray(saved.projects) ? saved.projects : [];
          state.chatToProject =
            saved.chatToProject && typeof saved.chatToProject === "object"
              ? saved.chatToProject
              : {};
        }
        state.enabled = Boolean(syncResult[ENABLE_KEY]);
        resolve();
      });
    });
  }

  function saveState() {
    return new Promise((resolve) => {
      chrome.storage.sync.set(
        {
          [STORAGE_KEY]: {
            projects: state.projects,
            chatToProject: state.chatToProject,
          },
        },
        resolve,
      );
    });
  }

  function createProject(name) {
    const id = `project_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    state.projects.push({ id, name });
  }

  function parseChatIdFromUrl(rawUrl) {
    if (!rawUrl) return null;
    try {
      const url = new URL(rawUrl, window.location.origin);
      const match = url.pathname.match(/\/(?:a\/chat\/s|chat|c)\/([^/?#]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  function findSidebarContainer() {
    const explicit = document.querySelector(
      "#root > div > div > div.c3ecdb44 > div.dc04ec1d > div.b8812f16",
    );
    if (explicit) return explicit;

    const linkSelector =
      "a[href*='/a/chat/s/'], a[href*='/chat/'], a[href*='/c/']";
    const anchors = document.querySelectorAll(linkSelector);
    if (anchors.length === 0) return null;

    let node = anchors[0];
    while (node && node !== document.body) {
      if (node.matches && node.matches("aside, nav, [role='navigation']"))
        return node;
      if (node.classList && node.classList.toString().includes("scroll"))
        return node;
      node = node.parentElement;
    }

    return anchors[0].parentElement;
  }

  function findNewChatButtonContainer() {
    return document.querySelector("div._5a8ac7a");
  }

  function attachUIToSidebar() {
    if (!ui.root) return false;
    const sidebar = findSidebarContainer();
    if (!sidebar) return false;
    const newChat = findNewChatButtonContainer();
    if (newChat && newChat.parentElement) {
      if (ui.root.parentElement !== newChat.parentElement) {
        newChat.parentElement.insertBefore(ui.root, newChat.nextSibling);
      } else if (newChat.nextSibling !== ui.root) {
        newChat.parentElement.insertBefore(ui.root, newChat.nextSibling);
      }
      sidebarRoot = sidebar;
      return true;
    }

    if (ui.root.parentElement !== sidebar) {
      sidebar.appendChild(ui.root);
    }
    sidebarRoot = sidebar;
    return true;
  }

  function ensureBaseUI() {
    if (ui.root) return;

    const root = document.createElement("div");
    root.className = "dsco-root";

    root.innerHTML = `
      <div class="dsco-header">
        <div class="dsco-title">Projects</div>
        <button class="dsco-btn dsco-btn-small" data-action="new">Create one</button>
      </div>
      <div class="dsco-controls">
        <select class="dsco-select" data-role="project-select"></select>
        <button class="dsco-btn" data-action="assign">Assign</button>
        <button class="dsco-btn dsco-btn-ghost" data-action="unassign">Unassign</button>
      </div>
      <div class="dsco-status" data-role="status">Loading…</div>
      <div class="dsco-list" data-role="list"></div>
    `;

    attachUIToSidebar();

    ui.root = root;
    ui.list = root.querySelector("[data-role='list']");
    ui.select = root.querySelector("[data-role='project-select']");
    ui.status = root.querySelector("[data-role='status']");
    ui.assignBtn = root.querySelector("[data-action='assign']");
    ui.unassignBtn = root.querySelector("[data-action='unassign']");

    root.addEventListener("click", async (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      const action = btn.dataset.action;
      if (action === "new") {
        const name = window.prompt("Project name?");
        if (!name) return;
        createProject(name.trim());
        await saveState();
        render();
        return;
      }

      if (action === "assign") {
        await assignCurrentChat();
        return;
      }

      if (action === "unassign") {
        await unassignCurrentChat();
        return;
      }
    });
  }

  function getChatTitlesFromSidebar() {
    const map = {};
    const sidebar = sidebarRoot || findSidebarContainer();
    if (!sidebar) return map;

    const links = sidebar.querySelectorAll("a[href]");
    for (const link of links) {
      const chatId = parseChatIdFromUrl(link.getAttribute("href"));
      if (!chatId) continue;
      const title = (
        link.textContent ||
        link.getAttribute("title") ||
        link.getAttribute("aria-label") ||
        ""
      ).trim();
      if (title) map[chatId] = title;
    }
    return map;
  }

  function buildChatsByProject() {
    const grouped = {};
    for (const [chatId, projectId] of Object.entries(state.chatToProject)) {
      if (!projectId) continue;
      if (!grouped[projectId]) grouped[projectId] = [];
      grouped[projectId].push(chatId);
    }
    return grouped;
  }

  function openChatById(chatId) {
    const selector = `a[href='/a/chat/s/${chatId}'], a[href='/chat/${chatId}'], a[href='/c/${chatId}']`;
    const candidates = Array.from(document.querySelectorAll(selector));
    const target =
      candidates.find((el) => sidebarRoot && sidebarRoot.contains(el)) ||
      candidates[0];
    if (!target) return false;

    const events = [
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        view: window,
        pointerType: "mouse",
        button: 0,
      }),
      new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
      }),
      new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
      }),
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
      }),
    ];

    for (const ev of events) {
      target.dispatchEvent(ev);
    }
    return true;
  }

  function render() {
    if (!ui.root) return;

    if (!ui.root.isConnected) attachUIToSidebar();

    const chatId = getCurrentChatId();
    const assigned = chatId ? state.chatToProject[chatId] : null;
    const chatTitles = getChatTitlesFromSidebar();
    const chatsByProject = buildChatsByProject();

    const selectKey = JSON.stringify({
      projects: state.projects,
      assigned,
    });
    if (selectKey !== lastSelectKey) {
      ui.select.innerHTML = "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select project";
      ui.select.appendChild(placeholder);

      for (const p of state.projects) {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        if (p.id === assigned) opt.selected = true;
        ui.select.appendChild(opt);
      }
      lastSelectKey = selectKey;
    }

    const listKey = JSON.stringify({
      projects: state.projects,
      chatsByProject,
      chatTitles,
    });
    if (listKey !== lastListKey) {
      ui.list.innerHTML = "";
      if (state.projects.length === 0) {
        ui.list.innerHTML = "<div class='dsco-empty'>No projects yet.</div>";
      } else {
        for (const p of state.projects) {
          const chatIds = chatsByProject[p.id] || [];
          const row = document.createElement("div");
          row.className = "dsco-project";
          row.innerHTML = `
          <div class="dsco-project-header">
            <div class="dsco-project-name">${escapeHtml(p.name)}</div>
            <div class="dsco-project-actions">
            
              <button class="dsco-project-rename" type="button" data-project-id="${p.id}" aria-label="Rename project">Rename</button>
              <button class="dsco-project-remove" type="button" data-project-id="${p.id}" aria-label="Delete project">×</button>
            </div>
          </div>
          <div class="dsco-project-chats"></div>
        `;
          const list = row.querySelector(".dsco-project-chats");
          const removeBtn = row.querySelector(".dsco-project-remove");
          const renameBtn = row.querySelector(".dsco-project-rename");
          if (removeBtn) {
            removeBtn.addEventListener("click", async (e) => {
              e.preventDefault();
              e.stopPropagation();
              state.projects = state.projects.filter(
                (proj) => proj.id !== p.id,
              );
              for (const [chatId, projectId] of Object.entries(
                state.chatToProject,
              )) {
                if (projectId === p.id) delete state.chatToProject[chatId];
              }
              await saveState();
              render();
            });
          }
          if (renameBtn) {
            renameBtn.addEventListener("click", async (e) => {
              e.preventDefault();
              e.stopPropagation();
              const nextName = window.prompt("Rename project to:", p.name);
              if (!nextName) return;
              const trimmed = nextName.trim();
              if (!trimmed) return;
              p.name = trimmed;
              await saveState();
              render();
            });
          }
          if (chatIds.length === 0) {
            list.innerHTML =
              "<div class='dsco-chat-empty'>No chats assigned.</div>";
          } else {
            for (const id of chatIds) {
              const label = chatTitles[id] || `Chat ${id.slice(0, 6)}`;
              const item = document.createElement("div");
              item.className = "dsco-chat-item";

              const link = document.createElement("a");
              link.className = "dsco-chat-link";
              link.href = `/a/chat/s/${id}`;
              link.textContent = label;
              link.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const opened = openChatById(id);
                if (!opened) {
                  history.pushState({}, "", `/a/chat/s/${id}`);
                  window.dispatchEvent(new Event("dsco:urlchange"));
                }
              });

              const del = document.createElement("button");
              del.className = "dsco-chat-remove";
              del.type = "button";
              del.textContent = "×";
              del.setAttribute("aria-label", "Remove chat from project");
              del.addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation();
                delete state.chatToProject[id];
                await saveState();
                render();
              });

              item.appendChild(link);
              item.appendChild(del);
              list.appendChild(item);
            }
          }
          ui.list.appendChild(row);
        }
      }
      lastListKey = listKey;
    }

    let statusText = "Not assigned.";
    let assignDisabled = false;
    let unassignDisabled = true;

    if (!chatId) {
      statusText = "Open a chat to assign it.";
      assignDisabled = true;
      unassignDisabled = true;
    } else if (assigned) {
      const project = state.projects.find((p) => p.id === assigned);
      statusText = project
        ? `Assigned to: ${project.name}`
        : "Assigned to a missing project.";
      assignDisabled = false;
      unassignDisabled = false;
    }

    if (statusText !== lastStatusText) {
      ui.status.textContent = statusText;
      lastStatusText = statusText;
    }
    if (assignDisabled !== lastAssignDisabled) {
      ui.assignBtn.disabled = assignDisabled;
      lastAssignDisabled = assignDisabled;
    }
    if (unassignDisabled !== lastUnassignDisabled) {
      ui.unassignBtn.disabled = unassignDisabled;
      lastUnassignDisabled = unassignDisabled;
    }
  }

  async function assignCurrentChat() {
    const chatId = getCurrentChatId();
    if (!chatId) return;

    const projectId = ui.select.value;
    if (!projectId) return;

    state.chatToProject[chatId] = projectId;
    await saveState();
    render();
  }

  async function unassignCurrentChat() {
    const chatId = getCurrentChatId();
    if (!chatId) return;

    delete state.chatToProject[chatId];
    await saveState();
    render();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function onUrlChange() {
    attachUIToSidebar();
    render();
  }

  function hookHistory() {
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;

    history.pushState = function (...args) {
      const result = originalPush.apply(this, args);
      window.dispatchEvent(new Event("dsco:urlchange"));
      return result;
    };

    history.replaceState = function (...args) {
      const result = originalReplace.apply(this, args);
      window.dispatchEvent(new Event("dsco:urlchange"));
      return result;
    };

    window.addEventListener("popstate", () =>
      window.dispatchEvent(new Event("dsco:urlchange")),
    );
    window.addEventListener("dsco:urlchange", onUrlChange);
  }

  function startUrlWatcher() {
    if (urlWatchTimer) return;
    lastUrlHref = window.location.href;
    urlWatchTimer = setInterval(() => {
      const current = window.location.href;
      if (current !== lastUrlHref) {
        lastUrlHref = current;
        onUrlChange();
      }
    }, 500);
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      render();
    });
  }

  function startSidebarObserver() {
    if (sidebarObserver) return;

    const onMutations = (mutations) => {
      for (const m of mutations) {
        if (ui.root && ui.root.contains(m.target)) {
          return;
        }
      }
      const attached = attachUIToSidebar();
      if (attached) queueRender();
    };

    sidebarObserver = new MutationObserver(onMutations);

    const sidebar = findSidebarContainer();
    if (sidebar) {
      sidebarRoot = sidebar;
      sidebarObserver.observe(sidebar, { childList: true, subtree: true });
    } else {
      sidebarObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  function setEnabled(next) {
    state.enabled = next;
    if (!next) {
      if (ui.root && ui.root.isConnected) ui.root.remove();
      return;
    }
    lastStatusText = null;
    lastAssignDisabled = null;
    lastUnassignDisabled = null;
    lastSelectKey = null;
    lastListKey = null;
    ensureBaseUI();
    render();
    hookHistory();
    startSidebarObserver();
    startUrlWatcher();
  }

  async function init() {
    await loadState();
    setEnabled(state.enabled);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (Object.prototype.hasOwnProperty.call(changes, ENABLE_KEY)) {
      setEnabled(Boolean(changes[ENABLE_KEY].newValue));
    }
    if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEY)) {
      const saved = changes[STORAGE_KEY].newValue;
      if (saved && typeof saved === "object") {
        state.projects = Array.isArray(saved.projects) ? saved.projects : [];
        state.chatToProject =
          saved.chatToProject && typeof saved.chatToProject === "object"
            ? saved.chatToProject
            : {};
        render();
      }
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === "dsco:enable") {
      setEnabled(true);
    }
  });

  init();
})();
