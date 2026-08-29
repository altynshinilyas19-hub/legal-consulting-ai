const state = {
  user: null,
  chats: [],
  currentChatId: null,
  currentChat: null,
  isLoading: false,
  activeAuthTab: "login",
  captchaId: null,
};

const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const authStatus = document.getElementById("authStatus");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const refreshCaptchaButton = document.getElementById("refreshCaptchaButton");
const captchaQuestion = document.getElementById("captchaQuestion");

const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const userEmail = document.getElementById("userEmail");
const logoutButton = document.getElementById("logoutButton");
const newChatButton = document.getElementById("newChatButton");
const historyCount = document.getElementById("historyCount");
const chatHistory = document.getElementById("chatHistory");
const chatTitle = document.getElementById("chatTitle");
const statusText = document.getElementById("statusText");
const welcomePanel = document.getElementById("welcomePanel");
const conversation = document.getElementById("conversation");
const typingState = document.getElementById("typingState");
const consultForm = document.getElementById("consultForm");
const problemInput = document.getElementById("problemInput");
const submitButton = document.getElementById("submitButton");
const fillExampleButton = document.getElementById("fillExampleButton");
const keywordsCount = document.getElementById("keywordsCount");
const keywordsNode = document.getElementById("keywords");
const casesCountNode = document.getElementById("casesCount");
const casesListNode = document.getElementById("casesList");
const starterButtons = document.querySelectorAll("[data-prompt]");

const examplePrompt =
  "Купил земельный участок, а позже выяснилось, что у продавца могли быть проблемы с правом распоряжения. Сейчас другой человек заявляет права на участок и хочет оспорить сделку.";


loginTab.addEventListener("click", () => switchAuthTab("login"));
registerTab.addEventListener("click", () => switchAuthTab("register"));
refreshCaptchaButton.addEventListener("click", loadCaptcha);
logoutButton.addEventListener("click", handleLogout);
newChatButton.addEventListener("click", handleCreateChat);
fillExampleButton.addEventListener("click", () => {
  problemInput.value = examplePrompt;
  autoResizeTextarea();
  problemInput.focus();
});

if (sidebarToggle) {
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("sidebar-open");
  });
}

starterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    problemInput.value = button.dataset.prompt || "";
    autoResizeTextarea();
    hideWelcome();
    problemInput.focus();
  });
});

problemInput.addEventListener("input", autoResizeTextarea);
problemInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    consultForm.requestSubmit();
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);

  try {
    setAuthStatus("");
    await requestJSON("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
      headers: { "Content-Type": "application/json" },
    });

    loginForm.reset();
    await bootstrapAuthenticatedApp();
  } catch (error) {
    setAuthStatus(error.message, true);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);

  try {
    setAuthStatus("");
    await requestJSON("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
        password_repeat: formData.get("password_repeat"),
        captcha_id: state.captchaId,
        captcha_answer: formData.get("captcha_answer"),
      }),
      headers: { "Content-Type": "application/json" },
    });

    registerForm.reset();
    await bootstrapAuthenticatedApp();
  } catch (error) {
    setAuthStatus(error.message, true);
    await loadCaptcha();
  }
});

consultForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const problem = problemInput.value.trim();
  if (!problem) {
    appendLocalMessage("error", "Ошибка", "Сначала опиши проблему.");
    return;
  }

  hideWelcome();
  appendLocalMessage("user", "Ты", problem);
  problemInput.value = "";
  autoResizeTextarea();

  try {
    setLoading(true, "Ассистент анализирует");
    if (!state.currentChatId) {
      await createChatAndSelect();
    }

    const payload = await requestJSON("/api/consult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problem,
        chat_id: state.currentChatId,
      }),
    });

    state.chats = payload.chats || [];
    state.currentChatId = payload.chat_id;
    state.currentChat = payload.chat;
    renderHistory();
    renderChat(payload.chat);
    renderInsights(payload);
  } catch (error) {
    appendLocalMessage("error", "Ошибка", error.message);
    if (error.status === 401) {
      await showAuthView();
    }
  } finally {
    setLoading(false, "Готов к работе");
  }
});


async function init() {
  autoResizeTextarea();
  resetInsights();
  await restoreSession();
}

async function restoreSession() {
  try {
    const payload = await requestJSON("/api/session");
    if (!payload.authenticated) {
      await showAuthView();
      return;
    }

    state.user = payload.user;
    await bootstrapAuthenticatedApp();
  } catch {
    await showAuthView();
  }
}

async function bootstrapAuthenticatedApp() {
  const session = await requestJSON("/api/session");
  state.user = session.user;
  userEmail.textContent = state.user.email;
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  await loadChats();
}

async function showAuthView() {
  state.user = null;
  state.chats = [];
  state.currentChatId = null;
  state.currentChat = null;
  authView.classList.remove("hidden");
  appView.classList.add("hidden");
  switchAuthTab("login");
  await loadCaptcha();
}

function switchAuthTab(tab) {
  state.activeAuthTab = tab;
  const isLogin = tab === "login";
  loginTab.classList.toggle("active", isLogin);
  registerTab.classList.toggle("active", !isLogin);
  loginForm.classList.toggle("hidden", !isLogin);
  registerForm.classList.toggle("hidden", isLogin);
  setAuthStatus("");
}

async function loadCaptcha() {
  const payload = await requestJSON("/api/auth/captcha");
  state.captchaId = payload.captcha_id;
  captchaQuestion.textContent = payload.question;
}

async function handleLogout() {
  try {
    await requestJSON("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore logout errors locally
  }
  await showAuthView();
}

async function loadChats() {
  setLoading(true, "Загружаем чаты");

  try {
    const payload = await requestJSON("/api/chats");
    state.chats = payload.chats || [];
    renderHistory();

    if (state.currentChatId) {
      const activeChat = state.chats.find((chat) => chat.id === state.currentChatId);
      if (activeChat) {
        await openChat(state.currentChatId);
        return;
      }
    }

    if (state.chats.length > 0) {
      await openChat(state.chats[0].id);
    } else {
      state.currentChatId = null;
      state.currentChat = null;
      renderBlankChat();
    }
  } finally {
    setLoading(false, "Готов к работе");
  }
}

async function handleCreateChat() {
  if (state.isLoading) {
    return;
  }

  await createChatAndSelect();
  problemInput.focus();
}

async function createChatAndSelect() {
  const payload = await requestJSON("/api/chats", { method: "POST" });
  state.chats = payload.chats || [];
  state.currentChatId = payload.chat.id;
  state.currentChat = payload.chat;
  renderHistory();
  renderChat(payload.chat);
  resetInsights();
}

async function openChat(chatId) {
  const payload = await requestJSON(`/api/chats/${encodeURIComponent(chatId)}`);
  state.currentChatId = chatId;
  state.currentChat = payload.chat;
  renderHistory();
  renderChat(payload.chat);
  syncInsightsFromChat(payload.chat);
}

async function renameChat(chatId, currentTitle) {
  const nextTitle = window.prompt("Новое название чата", currentTitle);
  if (!nextTitle || nextTitle.trim() === currentTitle.trim()) {
    return;
  }

  const payload = await requestJSON(`/api/chats/${encodeURIComponent(chatId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: nextTitle.trim() }),
  });

  state.chats = payload.chats || [];
  state.currentChat = payload.chat;
  state.currentChatId = payload.chat.id;
  renderHistory();
  renderChat(payload.chat);
  syncInsightsFromChat(payload.chat);
}

async function deleteChat(chatId) {
  const confirmed = window.confirm("Удалить этот чат?");
  if (!confirmed) {
    return;
  }

  const payload = await requestJSON(`/api/chats/${encodeURIComponent(chatId)}`, {
    method: "DELETE",
  });

  state.chats = payload.chats || [];

  if (state.currentChatId === chatId) {
    state.currentChatId = null;
    state.currentChat = null;
  }

  renderHistory();

  if (state.chats.length > 0) {
    await openChat(state.chats[0].id);
  } else {
    renderBlankChat();
    resetInsights();
  }
}

function renderHistory() {
  historyCount.textContent = String(state.chats.length);
  chatHistory.innerHTML = "";

  if (state.chats.length === 0) {
    chatHistory.appendChild(createEmptyState("Пока нет ни одного чата."));
    return;
  }

  state.chats.forEach((chat) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `history-item${chat.id === state.currentChatId ? " active" : ""}`;
    button.innerHTML = `
      <div class="history-item-head">
        <span class="history-item-title">${escapeHtml(chat.title)}</span>
        <div class="history-item-actions">
          <span class="history-action" data-action="rename">Переименовать</span>
          <span class="history-action danger" data-action="delete">Удалить</span>
        </div>
      </div>
      <div class="history-item-preview">${escapeHtml(chat.preview || "Без сообщений")}</div>
      <div class="history-item-meta">${formatDate(chat.updated_at)} • ${chat.messages_count} сообщений</div>
    `;

    button.addEventListener("click", async (event) => {
      const actionNode = event.target.closest("[data-action]");
      if (actionNode) {
        event.stopPropagation();
        const action = actionNode.dataset.action;
        if (action === "rename") {
          await renameChat(chat.id, chat.title);
        } else if (action === "delete") {
          await deleteChat(chat.id);
        }
        return;
      }

      await openChat(chat.id);
      sidebar.classList.remove("sidebar-open");
    });

    chatHistory.appendChild(button);
  });
}

function renderChat(chat) {
  conversation.innerHTML = "";
  chatTitle.textContent = chat.title || "Новый чат";

  if (!chat.messages || chat.messages.length === 0) {
    renderBlankChat();
    return;
  }

  hideWelcome();

  chat.messages.forEach((message) => {
    appendRenderedMessage(message.role, getRoleTitle(message.role), message.content, message.created_at, buildMetaLabel(message.meta));
  });

  scrollConversationToBottom();
}

function renderBlankChat() {
  conversation.innerHTML = "";
  chatTitle.textContent = "Новый чат";
  welcomePanel.classList.remove("hidden");
}

function appendLocalMessage(role, title, content) {
  appendRenderedMessage(role, title, content, new Date().toISOString(), "");
}

function appendRenderedMessage(role, title, content, createdAt, metaLabel) {
  const row = document.createElement("article");
  row.className = `message-row ${role}`;

  const avatar = role === "user"
    ? ""
    : `<div class="message-avatar">${role === "error" ? "!" : "AI"}</div>`;

  row.innerHTML = `
    ${avatar}
    <div class="message-card">
      <div class="message-topline">
        <span class="message-author">${escapeHtml(title)}</span>
        <span class="message-meta">${escapeHtml(composeMeta(createdAt, metaLabel))}</span>
      </div>
      <div class="message-content">${renderRichText(content)}</div>
    </div>
  `;

  conversation.appendChild(row);
  scrollConversationToBottom();
}

function renderInsights(payload) {
  const keywords = Array.isArray(payload.keywords) ? payload.keywords : [];
  const cases = Array.isArray(payload.cases) ? payload.cases : [];

  keywordsCount.textContent = String(keywords.length);
  casesCountNode.textContent = String(payload.cases_found ?? cases.length ?? 0);
  keywordsNode.innerHTML = "";
  casesListNode.innerHTML = "";

  if (keywords.length === 0) {
    keywordsNode.appendChild(createEmptyState("Ключевые слова пока не выделены."));
  } else {
    keywords.forEach((keyword) => {
      const chip = document.createElement("span");
      chip.className = "keyword-chip";
      chip.textContent = keyword;
      keywordsNode.appendChild(chip);
    });
  }

  if (cases.length === 0) {
    casesListNode.appendChild(createEmptyState("Похожие дела не найдены."));
    return;
  }

  cases.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "case-card";
    card.innerHTML = `
      <p class="case-title">${escapeHtml(`Дело ${index + 1}: ${item.file_name || "Без названия"}`)}</p>
      <p class="case-snippet">${escapeHtml(item.snippet || "")}</p>
    `;
    casesListNode.appendChild(card);
  });
}

function syncInsightsFromChat(chat) {
  const messages = Array.isArray(chat.messages) ? chat.messages : [];
  const lastAssistant = [...messages].reverse().find(
    (message) => message.role === "assistant" && message.meta && Object.keys(message.meta).length > 0,
  );

  if (!lastAssistant) {
    resetInsights();
    return;
  }

  renderInsights(lastAssistant.meta);
}

function resetInsights() {
  keywordsCount.textContent = "0";
  casesCountNode.textContent = "0";
  keywordsNode.innerHTML = "";
  casesListNode.innerHTML = "";
  keywordsNode.appendChild(createEmptyState("После ответа AI здесь появятся ключевые слова."));
  casesListNode.appendChild(createEmptyState("После анализа AI здесь появятся похожие дела."));
}

function hideWelcome() {
  welcomePanel.classList.add("hidden");
}

function setLoading(isLoading, statusMessage) {
  state.isLoading = isLoading;
  submitButton.disabled = isLoading;
  newChatButton.disabled = isLoading;
  fillExampleButton.disabled = isLoading;
  statusText.textContent = statusMessage;
  typingState.classList.toggle("hidden", !isLoading);
}

function setAuthStatus(message, isError = false) {
  authStatus.textContent = message;
  authStatus.classList.toggle("hidden", !message);
  authStatus.classList.toggle("error", isError);
}

function getRoleTitle(role) {
  if (role === "assistant") {
    return "LexConsult AI";
  }
  if (role === "error") {
    return "Ошибка";
  }
  return "Ты";
}

function buildMetaLabel(meta) {
  if (!meta || typeof meta !== "object") {
    return "";
  }

  const keywords = Array.isArray(meta.keywords) ? meta.keywords.length : 0;
  const cases = Number(meta.cases_found || 0);
  if (!keywords && !cases) {
    return "";
  }

  return `${keywords} ключевых слов • ${cases} дел`;
}

function composeMeta(createdAt, extra) {
  const parts = [];
  if (createdAt) {
    parts.push(formatDate(createdAt));
  }
  if (extra) {
    parts.push(extra);
  }
  return parts.join(" • ");
}

function createEmptyState(text) {
  const node = document.createElement("div");
  node.className = "empty-state";
  node.textContent = text;
  return node;
}

function autoResizeTextarea() {
  problemInput.style.height = "auto";
  problemInput.style.height = `${Math.min(problemInput.scrollHeight, 220)}px`;
}

function scrollConversationToBottom() {
  requestAnimationFrame(() => {
    conversation.scrollTop = conversation.scrollHeight;
  });
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function renderRichText(text) {
  const escaped = escapeHtml(String(text || "")).replace(/\r/g, "");
  const blocks = escaped.split(/\n{2,}/).filter(Boolean);

  if (blocks.length === 0) {
    return "<p></p>";
  }

  return blocks.map((block) => {
    const lines = block.split("\n").map((line) => line.trimEnd());
    const bulletLines = lines.filter((line) => line.trim().startsWith("- "));

    if (bulletLines.length === lines.length) {
      const items = bulletLines
        .map((line) => `<li>${line.trim().slice(2)}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    }

    return `<p>${lines.join("<br>")}</p>`;
  }).join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function requestJSON(url, options = {}) {
  const response = await fetch(url, options);
  let payload = {};

  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const error = new Error(payload.error || "Произошла ошибка.");
    error.status = response.status;
    throw error;
  }

  return payload;
}

init();
