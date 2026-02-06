(() => {
  const STORAGE_KEY = "dsco_state_v1";

  const state = {
    projects: [],
    chatToProject: {},
  };

  const ui = {
    root: null,
    list: null,
    select: null,
    status: null,
    assignBtn: null,
    unassignBtn: null,
  };

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
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        const saved = result[STORAGE_KEY];
        if (saved && typeof saved === "object") {
          state.projects = Array.isArray(saved.projects) ? saved.projects : [];
          state.chatToProject = saved.chatToProject && typeof saved.chatToProject === "object" ? saved.chatToProject : {};
        }
        resolve();
      });
    });
  }

  function saveState() {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        [STORAGE_KEY]: {
          projects: state.projects,
          chatToProject: state.chatToProject,
        },
      }, resolve);
    });
  }

  function createProject(name) {
    const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    state.projects.push({ id, name });
  }

  function ensureBaseUI() {
    if (ui.root) return;

    const root = document.createElement("div");
    root.className = "dsco-root";

    root.innerHTML = `
      <div class="dsco-header">
        <div class="dsco-title">Projects</div>
        <button class="dsco-btn dsco-btn-small" data-action="new">New</button>
      </div>
      <div class="dsco-controls">
        <select class="dsco-select" data-role="project-select"></select>
        <button class="dsco-btn" data-action="assign">Assign</button>
        <button class="dsco-btn dsco-btn-ghost" data-action="unassign">Unassign</button>
      </div>
      <div class="dsco-status" data-role="status">Loading…</div>
      <div class="dsco-list" data-role="list"></div>
    `;

    document.body.appendChild(root);

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

  function render() {
    if (!ui.root) return;

    const chatId = getCurrentChatId();
    const assigned = chatId ? state.chatToProject[chatId] : null;

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

    ui.list.innerHTML = "";
    if (state.projects.length === 0) {
      ui.list.innerHTML = "<div class='dsco-empty'>No projects yet.</div>";
    } else {
      for (const p of state.projects) {
        const count = Object.values(state.chatToProject).filter((id) => id === p.id).length;
        const row = document.createElement("div");
        row.className = "dsco-row";
        row.innerHTML = `
          <div class="dsco-row-name">${escapeHtml(p.name)}</div>
          <div class="dsco-row-count">${count}</div>
        `;
        ui.list.appendChild(row);
      }
    }

    if (!chatId) {
      ui.status.textContent = "Open a chat to assign it.";
      ui.assignBtn.disabled = true;
      ui.unassignBtn.disabled = true;
    } else if (assigned) {
      const project = state.projects.find((p) => p.id === assigned);
      ui.status.textContent = project ? `Assigned to: ${project.name}` : "Assigned to a missing project.";
      ui.assignBtn.disabled = false;
      ui.unassignBtn.disabled = false;
    } else {
      ui.status.textContent = "Not assigned.";
      ui.assignBtn.disabled = false;
      ui.unassignBtn.disabled = true;
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

    window.addEventListener("popstate", () => window.dispatchEvent(new Event("dsco:urlchange")));
    window.addEventListener("dsco:urlchange", onUrlChange);
  }

  async function init() {
    ensureBaseUI();
    await loadState();
    render();
    hookHistory();
  }

  init();
})();
