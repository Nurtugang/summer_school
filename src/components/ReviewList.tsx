"use client";

import { useCallback, useEffect, useState } from "react";
import { Panel } from "@/components/ui";
import { CardReadOnly } from "@/components/CardReadOnly";
import { ReviewForm } from "@/components/ReviewForm";
import type { TriadJson, TaskSetJson } from "@/lib/gemini";

interface ListItem {
  id: string;
  title: string;
  moduleTitle: string;
  reviewCount: number;
  reviewedByMe: boolean;
}

interface DetailData {
  card: TriadJson | TaskSetJson;
  kind: string;
  reviewCount: number;
  reviewedByMe: boolean;
}

const POLL_MS = 5000;

export function ReviewList() {
  const [items, setItems] = useState<ListItem[] | null>(null);
  const [meGiven, setMeGiven] = useState(0);
  const [meLimit, setMeLimit] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchList = useCallback(async () => {
    const res = await fetch("/api/reviews/list");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.cards);
    setMeGiven(data.meGiven);
    setMeLimit(data.meLimit);
  }, []);

  useEffect(() => {
    // Initial fetch + 5s poll to keep review counts live without a page reload.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchList();
    const interval = setInterval(fetchList, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchList]);

  async function toggle(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/reviews/${id}`);
      if (res.ok) setDetail(await res.json());
    } finally {
      setDetailLoading(false);
    }
  }

  function onReviewed() {
    setExpandedId(null);
    setDetail(null);
    fetchList();
  }

  const capReached = meLimit > 0 && meGiven >= meLimit;

  return (
    <div className="flex flex-col gap-4">
      <Panel className={capReached ? "bg-mint" : undefined}>
        <p className="text-[15px] text-ink">
          Сдано рецензий: {meGiven} из {meLimit}
        </p>
        {capReached ? (
          <p className="mt-1 text-[13px] text-muted">Лимит рецензий исчерпан. Спасибо за участие.</p>
        ) : null}
      </Panel>

      {items === null ? (
        <p className="text-[15px] text-muted">Загрузка…</p>
      ) : items.length === 0 ? (
        <Panel>
          <p className="text-[15px] text-ink">Пока нет карт, отправленных на рецензию.</p>
        </Panel>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div key={item.id} className="border border-line bg-white/60">
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="tap-target flex w-full items-center justify-between px-4 py-4 text-left"
                >
                  <div>
                    <p className="text-[12px] uppercase tracking-[.08em] text-muted">{item.moduleTitle}</p>
                    <p className="text-[16px] font-medium text-ink">{item.title}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-muted">рецензий: {item.reviewCount}</span>
                    {item.reviewedByMe ? (
                      <span className="text-[13px] text-forest">оценено</span>
                    ) : null}
                    <span className="text-forest">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isExpanded ? (
                  <div className="border-t border-line p-4">
                    {detailLoading ? (
                      <p className="text-[15px] text-muted">Загрузка карты…</p>
                    ) : detail ? (
                      <div className="flex flex-col gap-6">
                        <CardReadOnly card={detail.card} kind={detail.kind} />
                        {detail.reviewedByMe ? (
                          <Panel className="bg-mint">
                            <p className="text-[15px] text-ink">Вы уже оценили эту карту.</p>
                          </Panel>
                        ) : capReached ? (
                          <Panel>
                            <p className="text-[15px] text-ink">Лимит рецензий исчерпан.</p>
                          </Panel>
                        ) : (
                          <ReviewForm cardId={item.id} kind={detail.kind} onSubmitted={onReviewed} />
                        )}
                      </div>
                    ) : (
                      <p className="text-[15px] text-muted">Не удалось загрузить карту.</p>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
