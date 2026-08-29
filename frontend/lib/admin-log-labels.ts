const ACTION_LABELS: Record<string, string> = {
  ai_consultation: "AI-консультация",
  update_user: "Обновление пользователя",
  create_lawyer: "Создание профиля юриста",
  update_lawyer: "Обновление профиля юриста",
  delete_lawyer: "Удаление профиля юриста",
  create_article: "Создание материала",
  update_article: "Обновление материала",
  delete_article: "Удаление материала",
  create_case: "Создание дела",
  update_case: "Обновление дела",
  delete_case: "Удаление дела",
  upload_case: "Загрузка дела",
};

const TARGET_LABELS: Record<string, string> = {
  user: "Пользователь",
  lawyer: "Юрист",
  article: "Статья",
  case: "Дело",
  chat: "Диалог",
  consult: "Консультация",
};

export function getAdminActionLabel(action: string) {
  return ACTION_LABELS[action] ?? action.replaceAll("_", " ");
}

export function getAdminTargetLabel(targetType: string) {
  return TARGET_LABELS[targetType] ?? targetType;
}
