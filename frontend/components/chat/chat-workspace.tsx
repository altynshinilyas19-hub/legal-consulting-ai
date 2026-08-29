"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LoaderCircle,
  MessageSquareText,
  PencilLine,
  Plus,
  SendHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { MarkdownContent } from "@/components/markdown-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  createChat,
  deleteChat,
  getChat,
  listChats,
  renameChat,
  streamChatMessage,
} from "@/lib/api";
import type { Chat, ChatMessage, ChatSummary } from "@/lib/types";
import { cn, formatDate, truncate } from "@/lib/utils";

const STARTER_PROMPTS = [
  "Проверь похожую судебную практику по спору о неосновательном обогащении.",
  "Найди дела по увольнению руководителя и оцени риски для работодателя.",
  "Сделай короткий AI-вывод по корпоративному конфликту и возможным исходам.",
];

function summaryFromChat(chat: Chat): ChatSummary {
  const lastMessage = [...chat.messages].reverse().find((message) => message.role === "assistant");

  return {
    id: chat.id,
    title: chat.title,
    created_at: chat.created_at,
    updated_at: chat.updated_at,
    preview: lastMessage?.content ?? null,
    messages_count: chat.messages.length,
  };
}

export function ChatWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialChatId = searchParams.get("chat");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const [summaries, setSummaries] = useState<ChatSummary[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState("");

  const syncRouteChat = (chatId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (chatId) {
      params.set("chat", chatId);
    } else {
      params.delete("chat");
    }

    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const openChat = async (chatId: string) => {
    const chat = await getChat(chatId);
    setActiveChat(chat);
    syncRouteChat(chat.id);
    return chat;
  };

  const loadChatList = async (preferredId?: string | null) => {
    const items = await listChats();
    setSummaries(items);

    const candidates = [preferredId, initialChatId, items[0]?.id].filter(
      (value, index, array): value is string => Boolean(value) && array.indexOf(value) === index,
    );

    for (const chatId of candidates) {
      try {
        return await openChat(chatId);
      } catch {
        continue;
      }
    }

    setActiveChat(null);
    syncRouteChat(null);
    return null;
  };

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);

      try {
        await loadChatList(initialChatId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не удалось загрузить историю консультаций.");
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChat?.messages]);

  const latestAssistantMessage = useMemo(
    () => [...(activeChat?.messages ?? [])].reverse().find((entry) => entry.role === "assistant") ?? null,
    [activeChat],
  );

  const activeCases = latestAssistantMessage?.meta?.cases ?? [];
  const activeKeywords = latestAssistantMessage?.meta?.keywords ?? [];

  const handleSelectChat = async (chatId: string) => {
    try {
      await openChat(chatId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось открыть диалог.");
    }
  };

  const handleCreateChat = async () => {
    try {
      const chat = await createChat();
      setSummaries((current) => [summaryFromChat(chat), ...current]);
      setActiveChat(chat);
      syncRouteChat(chat.id);
      setMessage("");
      toast.success("Новый диалог создан.");
      return chat;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось создать диалог.");
      return null;
    }
  };

  const handleRename = async (chatId: string) => {
    if (!renamingTitle.trim()) {
      setRenamingId(null);
      setRenamingTitle("");
      return;
    }

    try {
      const chat = await renameChat(chatId, renamingTitle.trim());
      setSummaries((current) => current.map((item) => (item.id === chat.id ? summaryFromChat(chat) : item)));
      setActiveChat((current) => (current?.id === chat.id ? chat : current));
      setRenamingId(null);
      setRenamingTitle("");
      toast.success("Название диалога обновлено.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось переименовать диалог.");
    }
  };

  const handleDelete = async (chatId: string) => {
    if (typeof window !== "undefined" && !window.confirm("Удалить этот диалог?")) {
      return;
    }

    try {
      await deleteChat(chatId);
      const nextSummaries = summaries.filter((item) => item.id !== chatId);
      setSummaries(nextSummaries);

      if (activeChat?.id === chatId) {
        if (nextSummaries[0]) {
          await handleSelectChat(nextSummaries[0].id);
        } else {
          setActiveChat(null);
          syncRouteChat(null);
        }
      }

      toast.success("Диалог удалён.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось удалить диалог.");
    }
  };

  const handleSend = async (preset?: string) => {
    const draft = (preset ?? message).trim();
    if (!draft || sending) {
      return;
    }

    setSending(true);

    try {
      const chat = activeChat ?? (await handleCreateChat());
      if (!chat) {
        return;
      }

      const tempUser: ChatMessage = {
        id: `temp-user-${Date.now()}`,
        role: "user",
        content: draft,
        meta: {},
        created_at: new Date().toISOString(),
      };
      const tempAssistant: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        meta: { keywords: [], cases: [], cases_found: 0 },
        created_at: new Date().toISOString(),
      };

      setMessage("");
      setActiveChat((current) => {
        const base = current && current.id === chat.id ? current : chat;

        return {
          ...base,
          messages: [...base.messages, tempUser, tempAssistant],
        };
      });

      await streamChatMessage(chat.id, draft, {
        onChunk: (chunk) => {
          setActiveChat((current) => {
            if (!current || current.id !== chat.id) {
              return current;
            }

            return {
              ...current,
              messages: current.messages.map((entry) =>
                entry.id === tempAssistant.id ? { ...entry, content: `${entry.content}${chunk}` } : entry,
              ),
            };
          });
        },
        onCases: (cases) => {
          setActiveChat((current) => {
            if (!current || current.id !== chat.id) {
              return current;
            }

            return {
              ...current,
              messages: current.messages.map((entry) =>
                entry.id === tempAssistant.id
                  ? {
                      ...entry,
                      meta: { ...entry.meta, cases, cases_found: cases.length },
                    }
                  : entry,
              ),
            };
          });
        },
        onDone: async () => {
          await loadChatList(chat.id);
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось отправить сообщение.");
    } finally {
      setSending(false);
      if (composerRef.current) {
        composerRef.current.style.height = "auto";
      }
    }
  };

  const resizeComposer = () => {
    if (!composerRef.current) {
      return;
    }

    composerRef.current.style.height = "auto";
    composerRef.current.style.height = `${Math.min(composerRef.current.scrollHeight, 220)}px`;
  };

  if (loading) {
    return (
      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Skeleton className="h-[720px] w-full" />
        <div className="space-y-6">
          <Skeleton className="h-[720px] w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="flex min-h-[720px] flex-col overflow-hidden p-0">
        <div className="border-b border-border/70 px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">История</div>
              <div className="mt-1 text-xl font-semibold tracking-tight text-foreground">Диалоги</div>
            </div>
            <Button size="sm" onClick={() => void handleCreateChat()}>
              <Plus className="size-4" />
              Новый
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {summaries.length ? (
            summaries.map((item) => {
              const active = item.id === activeChat?.id;
              const isRenaming = renamingId === item.id;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-[1.4rem] border p-4 transition",
                    active
                      ? "border-accent/40 bg-accent/8"
                      : "border-border/70 bg-surface/60 hover:bg-surface-elevated",
                  )}
                >
                  {isRenaming ? (
                    <div className="space-y-3">
                      <Input
                        value={renamingTitle}
                        onChange={(event) => setRenamingTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleRename(item.id);
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => void handleRename(item.id)}>
                          Сохранить
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setRenamingId(null);
                            setRenamingTitle("");
                          }}
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => void handleSelectChat(item.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-foreground">{item.title}</div>
                          <div className="mt-2 text-sm leading-6 text-muted-foreground">
                            {item.preview ? truncate(item.preview, 88) : "Ответ появится после первого сообщения."}
                          </div>
                          <div className="mt-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                            {formatDate(item.updated_at)}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={(event) => {
                              event.stopPropagation();
                              setRenamingId(item.id);
                              setRenamingTitle(item.title);
                            }}
                          >
                            <PencilLine className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-danger hover:bg-danger/10 hover:text-danger"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDelete(item.id);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <EmptyState
              title="История пока пуста"
              description="Создайте первый диалог, и система начнёт сохранять консультации."
              action={
                <Button size="sm" onClick={() => void handleCreateChat()}>
                  Создать диалог
                </Button>
              }
            />
          )}
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="flex min-h-[720px] flex-col overflow-hidden p-0">
          <div className="border-b border-border/70 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">AI-консультация</div>
                <div className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                  {activeChat?.title || "Новый юридический диалог"}
                </div>
              </div>
              <Badge className="gap-2">
                <MessageSquareText className="size-3.5" />
                {activeChat?.messages.length ?? 0} сообщ.
              </Badge>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            {activeChat?.messages.length ? (
              activeChat.messages.map((entry) => (
                <div key={entry.id} className={cn("flex", entry.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[92%] rounded-[1.8rem] px-5 py-4 sm:max-w-[80%]",
                      entry.role === "user"
                        ? "bg-accent text-accent-foreground shadow-panel"
                        : "border border-border/70 bg-surface-elevated text-foreground",
                    )}
                  >
                    <div className="mb-2 text-xs uppercase tracking-[0.22em] opacity-70">
                      {entry.role === "user" ? "Вы" : "Юридический AI"}
                    </div>

                    {entry.role === "assistant" ? (
                      <MarkdownContent
                        content={entry.content || "Анализирую запрос и подбираю похожую судебную практику..."}
                        className="prose-p:my-2"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-7">{entry.content}</p>
                    )}

                    {entry.role === "assistant" && entry.meta?.keywords?.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {entry.meta.keywords.map((keyword) => (
                          <Badge key={keyword}>{keyword}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="Сформулируйте юридический вопрос"
                description="Опишите спор, важные факты и цель консультации. AI подберёт релевантную судебную практику из вашей базы."
              />
            )}
          </div>

          <div className="border-t border-border/70 px-5 py-4">
            {!activeChat?.messages.length ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="rounded-full border border-border/70 bg-surface px-4 py-2 text-sm text-muted-foreground transition hover:bg-surface-elevated hover:text-foreground"
                    onClick={() => void handleSend(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="rounded-[1.8rem] border border-border/70 bg-surface/90 p-3 shadow-panel">
              <Textarea
                ref={composerRef}
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  resizeComposer();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Опишите спор, факты дела, требования или вопрос по судебной практике..."
                className="min-h-[88px] resize-none border-0 bg-transparent px-2 py-2 focus:ring-0"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-xs leading-5 text-muted-foreground">
                  Ответ приходит потоково и сохраняется в истории чатов.
                </div>
                <Button onClick={() => void handleSend()} disabled={sending || !message.trim()}>
                  {sending ? <LoaderCircle className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
                  Отправить
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Найденные дела</div>
              <div className="mt-1 text-xl font-semibold tracking-tight text-foreground">Результаты поиска</div>
            </div>
            {activeCases.length ? <Badge>{activeCases.length} дел</Badge> : null}
          </div>

          {activeKeywords.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeKeywords.map((keyword) => (
                <Badge key={keyword}>{keyword}</Badge>
              ))}
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {activeCases.length ? (
              activeCases.map((caseItem) => (
                <div key={caseItem.id} className="rounded-[1.4rem] border border-border/70 bg-surface/60 p-4">
                  <div className="text-sm font-semibold text-foreground">{caseItem.file_name}</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{truncate(caseItem.snippet, 180)}</p>
                  <div className="mt-4">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/cases/${caseItem.id}`}>Открыть дело</Link>
                    </Button>
                  </div>
                </div>
              ))
            ) : activeChat?.messages.length ? (
              <div className="rounded-[1.4rem] border border-dashed border-border/70 px-4 py-6 text-sm leading-6 text-muted-foreground">
                Подходящие дела появятся здесь после завершения анализа.
              </div>
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-border/70 px-4 py-6 text-sm leading-6 text-muted-foreground">
                Задайте вопрос в чате, чтобы увидеть найденную судебную практику.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
