const MSG_SOURCE_WEB = "dashboard-cronograma-web";
const MSG_SOURCE_EXT = "dashboard-cronograma-extension";

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.source !== MSG_SOURCE_WEB) return;

  const { type, requestId } = event.data;

  function reply(payload) {
    window.postMessage(
      {
        source: MSG_SOURCE_EXT,
        requestId,
        ...payload,
      },
      "*",
    );
  }

  if (type === "ping-extension") {
    reply({ ok: true, installed: true });
    return;
  }

  if (type === "test-notification") {
    chrome.runtime.sendMessage({ type: "test-notification" }, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reply({ ok: false, error: runtimeError.message });
        return;
      }
      reply(response ?? { ok: false, error: "Sem resposta do service worker" });
    });
  }
});
