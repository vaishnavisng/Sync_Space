export function getChatArray(ydoc) {
  return ydoc.getArray("chat");
}

export function sendChatMessage(chatArray, { username, text }) {
  const trimmed = text.trim();
  if (!trimmed) return;
  chatArray.push([
    {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      username,
      text: trimmed,
      createdAt: Date.now(),
    },
  ]);
}