const MSG_SOURCE_WEB = "dashboard-cronograma-web";
const MSG_SOURCE_EXT = "dashboard-cronograma-extension";

type ExtensionBridgeResponse = {
  ok: boolean;
  error?: string;
  installed?: boolean;
};

function sendExtensionMessage(
  type: string,
  timeoutMs = 4000,
): Promise<ExtensionBridgeResponse> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();

    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(
        new Error(
          "Extensão não respondeu. Instale-a, recarregue em chrome://extensions e abra esta página de novo.",
        ),
      );
    }, timeoutMs);

    function onMessage(event: MessageEvent) {
      if (event.source !== window) return;
      if (event.data?.source !== MSG_SOURCE_EXT) return;
      if (event.data?.requestId !== requestId) return;

      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(event.data as ExtensionBridgeResponse);
    }

    window.addEventListener("message", onMessage);
    window.postMessage({ source: MSG_SOURCE_WEB, type, requestId }, "*");
  });
}

export async function pingExtension(): Promise<boolean> {
  try {
    const response = await sendExtensionMessage("ping-extension", 2000);
    return response.ok && response.installed === true;
  } catch {
    return false;
  }
}

export async function testExtensionNotification(): Promise<void> {
  const response = await sendExtensionMessage("test-notification");

  if (!response.ok) {
    throw new Error(response.error ?? "Não foi possível enviar a notificação de teste.");
  }
}
